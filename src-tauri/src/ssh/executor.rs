use crate::error::AppError;
use ssh2::Session;
use std::io::Read;

/// Result of a remote command execution
pub struct RemoteCommandResult {
    pub stdout: String,
    pub stderr: String,
    pub exit_code: i32,
}

/// Execute a single command on the remote server via SSH
pub fn exec_command(session: &Session, cmd: &str) -> Result<RemoteCommandResult, AppError> {
    let mut channel = session.channel_session().map_err(|e| {
        AppError::Ssh(format!("Failed to open SSH channel: {}", e))
    })?;

    channel.exec(cmd).map_err(|e| {
        AppError::Ssh(format!("Failed to execute command: {}", e))
    })?;

    let mut stdout = String::new();
    channel.read_to_string(&mut stdout).map_err(|e| {
        AppError::Ssh(format!("Failed to read stdout: {}", e))
    })?;

    let mut stderr = String::new();
    channel.stderr().read_to_string(&mut stderr).map_err(|e| {
        AppError::Ssh(format!("Failed to read stderr: {}", e))
    })?;

    channel.wait_close().map_err(|e| {
        AppError::Ssh(format!("Failed to close channel: {}", e))
    })?;

    let exit_code = channel.exit_status().unwrap_or(-1);

    Ok(RemoteCommandResult {
        stdout,
        stderr,
        exit_code,
    })
}

/// Execute a command and return stdout, failing if exit code is non-zero
pub fn exec_command_checked(session: &Session, cmd: &str) -> Result<String, AppError> {
    let result = exec_command(session, cmd)?;
    if result.exit_code != 0 {
        // Some commands like ls on empty dir return non-zero; be lenient
        if !result.stderr.trim().is_empty() {
            return Err(AppError::SshCommand {
                exit_code: result.exit_code,
                stderr: result.stderr.trim().to_string(),
            });
        }
    }
    Ok(result.stdout)
}

/// Shell-escape a string for safe use in SSH commands.
/// Wraps the value in single quotes and escapes any embedded single quotes.
pub fn shell_escape(s: &str) -> String {
    format!("'{}'", s.replace('\'', "'\\''"))
}
