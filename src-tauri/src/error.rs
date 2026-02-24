use serde::Serialize;

#[derive(Debug, thiserror::Error)]
pub enum AppError {
    #[error("IO error: {0}")]
    Io(#[from] std::io::Error),

    #[error("YAML parse error: {0}")]
    Yaml(#[from] serde_yaml::Error),

    #[error("JSON error: {0}")]
    Json(#[from] serde_json::Error),

    #[error("Config directory not found")]
    ConfigDirNotFound,

    #[error("{0}")]
    Custom(String),

    #[error("SSH error: {0}")]
    Ssh(String),

    #[error("SSH connection failed: {0}")]
    SshConnection(String),

    #[error("SSH command failed (exit {exit_code}): {stderr}")]
    SshCommand { exit_code: i32, stderr: String },

    #[error("Remote server not found: {0}")]
    RemoteServerNotFound(String),

    #[error("Keychain error: {0}")]
    Keychain(String),
}

impl Serialize for AppError {
    fn serialize<S>(&self, serializer: S) -> Result<S::Ok, S::Error>
    where
        S: serde::Serializer,
    {
        serializer.serialize_str(&self.to_string())
    }
}
