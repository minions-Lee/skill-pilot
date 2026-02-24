use serde::{Deserialize, Serialize};

/// SSH authentication method
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(tag = "type")]
pub enum SshAuth {
    /// SSH key file authentication
    Key {
        /// Path to private key file (e.g. ~/.ssh/id_ed25519)
        private_key_path: String,
    },
    /// SSH Agent authentication (uses system ssh-agent)
    Agent,
    /// Password authentication (password stored in macOS Keychain, not in JSON)
    Password,
}

/// Remote server configuration (persisted to ~/.claude-skill-manager/remotes.json)
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct RemoteServer {
    /// Unique identifier
    pub id: String,
    /// User-friendly display name
    pub name: String,
    /// Hostname or IP address
    pub host: String,
    /// SSH port (default: 22)
    pub port: u16,
    /// SSH username
    pub username: String,
    /// Authentication method
    pub auth: SshAuth,
    /// Remote skill repository path
    pub remote_repo_path: String,
    /// Remote config directory (default: ~/.claude-skill-manager)
    pub remote_config_dir: Option<String>,
    /// Remote Claude skills directory (default: ~/.claude/skills)
    pub remote_skills_dir: Option<String>,
    /// Connection timeout in seconds (default: 10)
    pub connect_timeout_secs: Option<u32>,
    /// Command execution timeout in seconds (default: 30)
    pub command_timeout_secs: Option<u32>,
}

/// Connection status for a remote server
#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
#[serde(tag = "status", content = "message")]
pub enum ConnectionStatus {
    Disconnected,
    Connecting,
    Connected,
    Error(String),
}
