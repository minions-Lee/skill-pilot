use crate::error::AppError;
use crate::models::{AgentDir, SUPPORTED_AGENT_DIRS};
use std::fs;
use std::path::PathBuf;

fn agent_dirs_path() -> Result<PathBuf, AppError> {
    dirs::home_dir()
        .map(|h| h.join(".claude-skill-manager").join("agent-dirs.json"))
        .ok_or(AppError::ConfigDirNotFound)
}

fn default_agent_dirs() -> Vec<AgentDir> {
    SUPPORTED_AGENT_DIRS
        .iter()
        .map(|(dir, label)| AgentDir {
            dir: dir.to_string(),
            label: label.to_string(),
            enabled: *dir == ".claude",
        })
        .collect()
}

fn load_agent_dirs() -> Result<Vec<AgentDir>, AppError> {
    let path = agent_dirs_path()?;
    if !path.exists() {
        return Ok(default_agent_dirs());
    }

    let content = fs::read_to_string(&path)?;
    let saved: Vec<serde_json::Value> = serde_json::from_str(&content).unwrap_or_default();

    // 以 SUPPORTED_AGENT_DIRS 为基准，合并用户保存的 enabled 状态
    let dirs = SUPPORTED_AGENT_DIRS
        .iter()
        .map(|(dir, label)| {
            let enabled = saved
                .iter()
                .find(|v| v.get("dir").and_then(|d| d.as_str()) == Some(dir))
                .and_then(|v| v.get("enabled")?.as_bool())
                .unwrap_or(*dir == ".claude");
            AgentDir {
                dir: dir.to_string(),
                label: label.to_string(),
                enabled,
            }
        })
        .collect();

    Ok(dirs)
}

/// 获取所有已启用的 agent dir 名称列表（内部公共函数，供 linker/scanner 调用）
pub fn get_active_dir_names() -> Result<Vec<String>, AppError> {
    Ok(load_agent_dirs()?
        .into_iter()
        .filter(|d| d.enabled)
        .map(|d| d.dir)
        .collect())
}

/// 列出所有 agent dirs（含支持列表 + 用户开关状态）
#[tauri::command]
pub fn list_agent_dirs() -> Result<Vec<AgentDir>, AppError> {
    load_agent_dirs()
}

/// 保存用户的 agent dir 开关配置
#[tauri::command]
pub fn save_agent_dirs(dirs: Vec<AgentDir>) -> Result<Vec<AgentDir>, AppError> {
    // 校验：dir 名称必须在支持列表中
    let supported: Vec<&str> = SUPPORTED_AGENT_DIRS.iter().map(|(d, _)| *d).collect();
    for d in &dirs {
        if !supported.contains(&d.dir.as_str()) {
            return Err(AppError::Custom(format!(
                "Unsupported agent dir: {}",
                d.dir
            )));
        }
    }

    let path = agent_dirs_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }

    // 只保存 enabled 状态（label 从常量重建，避免存储冗余）
    let to_save: Vec<serde_json::Value> = dirs
        .iter()
        .map(|d| {
            serde_json::json!({ "dir": d.dir, "enabled": d.enabled })
        })
        .collect();

    fs::write(&path, serde_json::to_string_pretty(&to_save)?)?;

    // 返回完整 list（含 label）
    load_agent_dirs()
}
