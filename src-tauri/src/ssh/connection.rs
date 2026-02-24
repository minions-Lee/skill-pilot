use crate::error::AppError;
use crate::models::remote::{ConnectionStatus, RemoteServer, SshAuth};
use ssh2::Session;
use std::collections::HashMap;
use std::net::TcpStream;
use std::path::Path;
use std::sync::Mutex;
use std::time::{Duration, Instant};

/// Idle timeout for SSH connections (5 minutes)
const IDLE_TIMEOUT_SECS: u64 = 300;

struct SshConnection {
    session: Session,
    last_used: Instant,
}

/// SSH connection pool managed as Tauri state
pub struct SshPool {
    connections: Mutex<HashMap<String, SshConnection>>,
}

impl SshPool {
    pub fn new() -> Self {
        Self {
            connections: Mutex::new(HashMap::new()),
        }
    }

    /// Get an existing connection or create a new one.
    /// Returns the Session after updating last_used timestamp.
    pub fn get_or_connect(&self, server: &RemoteServer) -> Result<Session, AppError> {
        let mut pool = self.connections.lock().map_err(|e| {
            AppError::Ssh(format!("Failed to lock connection pool: {}", e))
        })?;

        // Check for existing valid connection
        if let Some(conn) = pool.get_mut(&server.id) {
            let idle = conn.last_used.elapsed().as_secs();
            if idle < IDLE_TIMEOUT_SECS {
                // Test if connection is still alive
                if conn.session.authenticated() {
                    conn.last_used = Instant::now();
                    return Ok(conn.session.clone());
                }
            }
            // Stale or dead connection, remove it
            pool.remove(&server.id);
        }

        // Create new connection
        let session = Self::create_session(server)?;
        let cloned = session.clone();
        pool.insert(
            server.id.clone(),
            SshConnection {
                session,
                last_used: Instant::now(),
            },
        );

        Ok(cloned)
    }

    /// Test connectivity to a remote server
    pub fn test_connection(&self, server: &RemoteServer) -> Result<ConnectionStatus, AppError> {
        match Self::create_session(server) {
            Ok(session) => {
                // Store successful connection in pool
                let mut pool = self.connections.lock().map_err(|e| {
                    AppError::Ssh(format!("Failed to lock connection pool: {}", e))
                })?;
                pool.insert(
                    server.id.clone(),
                    SshConnection {
                        session,
                        last_used: Instant::now(),
                    },
                );
                Ok(ConnectionStatus::Connected)
            }
            Err(e) => Ok(ConnectionStatus::Error(e.to_string())),
        }
    }

    /// Disconnect a specific server
    pub fn disconnect(&self, server_id: &str) {
        if let Ok(mut pool) = self.connections.lock() {
            pool.remove(server_id);
        }
    }

    /// Get connection status for a server
    pub fn get_status(&self, server_id: &str) -> ConnectionStatus {
        let pool = match self.connections.lock() {
            Ok(p) => p,
            Err(_) => return ConnectionStatus::Disconnected,
        };

        match pool.get(server_id) {
            Some(conn) => {
                let idle = conn.last_used.elapsed().as_secs();
                if idle < IDLE_TIMEOUT_SECS && conn.session.authenticated() {
                    ConnectionStatus::Connected
                } else {
                    ConnectionStatus::Disconnected
                }
            }
            None => ConnectionStatus::Disconnected,
        }
    }

    /// Remove all idle connections that have exceeded the timeout
    pub fn cleanup_idle(&self) {
        if let Ok(mut pool) = self.connections.lock() {
            pool.retain(|_, conn| conn.last_used.elapsed().as_secs() < IDLE_TIMEOUT_SECS);
        }
    }

    /// Create a new SSH session with the given server configuration
    fn create_session(server: &RemoteServer) -> Result<Session, AppError> {
        let timeout = server.connect_timeout_secs.unwrap_or(10);
        let addr = format!("{}:{}", server.host, server.port);

        let tcp = TcpStream::connect_timeout(
            &addr.parse().map_err(|e| {
                AppError::SshConnection(format!("Invalid address '{}': {}", addr, e))
            })?,
            Duration::from_secs(timeout as u64),
        )
        .map_err(|e| {
            AppError::SshConnection(format!("TCP connection to {} failed: {}", addr, e))
        })?;

        let mut session = Session::new().map_err(|e| {
            AppError::Ssh(format!("Failed to create SSH session: {}", e))
        })?;

        session.set_tcp_stream(tcp);
        session.set_timeout(timeout * 1000); // milliseconds
        session.handshake().map_err(|e| {
            AppError::SshConnection(format!("SSH handshake failed: {}", e))
        })?;

        // Authenticate based on auth method
        match &server.auth {
            SshAuth::Agent => {
                let mut agent = session.agent().map_err(|e| {
                    AppError::SshConnection(format!("SSH agent init failed: {}", e))
                })?;
                agent.connect().map_err(|e| {
                    AppError::SshConnection(format!("SSH agent connect failed: {}", e))
                })?;
                agent.list_identities().map_err(|e| {
                    AppError::SshConnection(format!("SSH agent list identities failed: {}", e))
                })?;

                let identities = agent.identities().map_err(|e| {
                    AppError::SshConnection(format!("SSH agent identities failed: {}", e))
                })?;

                let mut authenticated = false;
                for identity in identities {
                    if agent.userauth(&server.username, &identity).is_ok() {
                        authenticated = true;
                        break;
                    }
                }
                if !authenticated {
                    return Err(AppError::SshConnection(
                        "SSH agent authentication failed: no matching key".into(),
                    ));
                }
            }
            SshAuth::Key { private_key_path } => {
                let key_path = shellexpand_path(private_key_path);
                if !Path::new(&key_path).exists() {
                    return Err(AppError::SshConnection(format!(
                        "SSH key file not found: {}",
                        key_path
                    )));
                }
                // Try without passphrase first
                let result = session.userauth_pubkey_file(
                    &server.username,
                    None,
                    Path::new(&key_path),
                    None,
                );
                if result.is_err() {
                    // Try reading passphrase from Keychain
                    let passphrase = read_keychain_password(&server.id).ok();
                    session
                        .userauth_pubkey_file(
                            &server.username,
                            None,
                            Path::new(&key_path),
                            passphrase.as_deref(),
                        )
                        .map_err(|e| {
                            AppError::SshConnection(format!(
                                "SSH key authentication failed: {}",
                                e
                            ))
                        })?;
                }
            }
            SshAuth::Password => {
                let password = read_keychain_password(&server.id).map_err(|e| {
                    AppError::SshConnection(format!(
                        "Failed to read password from Keychain: {}",
                        e
                    ))
                })?;
                session
                    .userauth_password(&server.username, &password)
                    .map_err(|e| {
                        AppError::SshConnection(format!(
                            "SSH password authentication failed: {}",
                            e
                        ))
                    })?;
            }
        }

        if !session.authenticated() {
            return Err(AppError::SshConnection(
                "SSH authentication failed".into(),
            ));
        }

        Ok(session)
    }
}

/// Expand ~ in paths
fn shellexpand_path(path: &str) -> String {
    if path.starts_with("~/") {
        if let Some(home) = dirs::home_dir() {
            return home
                .join(&path[2..])
                .to_string_lossy()
                .to_string();
        }
    }
    path.to_string()
}

/// Read a password from macOS Keychain
pub fn read_keychain_password(server_id: &str) -> Result<String, AppError> {
    let output = std::process::Command::new("security")
        .args([
            "find-generic-password",
            "-s",
            "com.skillpilot.ssh",
            "-a",
            server_id,
            "-w",
        ])
        .output()
        .map_err(|e| AppError::Keychain(format!("Failed to run security command: {}", e)))?;

    if output.status.success() {
        Ok(String::from_utf8_lossy(&output.stdout).trim().to_string())
    } else {
        Err(AppError::Keychain(format!(
            "Password not found in Keychain for server '{}'",
            server_id
        )))
    }
}

/// Save a password to macOS Keychain
pub fn save_keychain_password(server_id: &str, password: &str) -> Result<(), AppError> {
    // Delete existing entry first (ignore errors)
    let _ = std::process::Command::new("security")
        .args([
            "delete-generic-password",
            "-s",
            "com.skillpilot.ssh",
            "-a",
            server_id,
        ])
        .output();

    let output = std::process::Command::new("security")
        .args([
            "add-generic-password",
            "-s",
            "com.skillpilot.ssh",
            "-a",
            server_id,
            "-w",
            password,
        ])
        .output()
        .map_err(|e| AppError::Keychain(format!("Failed to save to Keychain: {}", e)))?;

    if output.status.success() {
        Ok(())
    } else {
        Err(AppError::Keychain(format!(
            "Failed to save password to Keychain: {}",
            String::from_utf8_lossy(&output.stderr)
        )))
    }
}

/// Delete a password from macOS Keychain
pub fn delete_keychain_password(server_id: &str) {
    let _ = std::process::Command::new("security")
        .args([
            "delete-generic-password",
            "-s",
            "com.skillpilot.ssh",
            "-a",
            server_id,
        ])
        .output();
}
