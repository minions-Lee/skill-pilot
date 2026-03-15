use crate::commands::agent_dirs::get_active_dir_names;
use crate::error::AppError;
use crate::models::LinkStatus;
use std::collections::HashMap;
use std::fs;
use std::os::unix::fs as unix_fs;
use std::path::{Path, PathBuf};

/// 返回所有已启用 agent dir 对应的用户级 skills 目录列表
/// [(dir_name, ~/.{dir}/skills)]
fn active_user_skills_dirs() -> Result<Vec<(String, PathBuf)>, AppError> {
    let home = dirs::home_dir().ok_or(AppError::ConfigDirNotFound)?;
    let active = get_active_dir_names()?;
    Ok(active
        .into_iter()
        .map(|d| {
            let path = home.join(&d).join("skills");
            (d, path)
        })
        .collect())
}

/// 返回所有已启用 agent dir 对应的项目级 skills 目录列表
/// [(dir_name, {project_path}/.{dir}/skills)]
fn active_project_skills_dirs(project_path: &str) -> Result<Vec<(String, PathBuf)>, AppError> {
    let base = PathBuf::from(project_path);
    let active = get_active_dir_names()?;
    Ok(active
        .into_iter()
        .map(|d| {
            let path = base.join(&d).join("skills");
            (d, path)
        })
        .collect())
}

/// Create a symlink for a skill at the given target directory
fn create_skill_link(skill_name: &str, source_path: &Path, target_dir: &Path) -> Result<(), AppError> {
    fs::create_dir_all(target_dir)?;
    let link_path = target_dir.join(skill_name);

    // Remove existing link/dir if present
    if link_path.symlink_metadata().is_ok() {
        if link_path.symlink_metadata()?.file_type().is_symlink() {
            fs::remove_file(&link_path)?;
        } else if link_path.is_dir() {
            // Don't remove real directories
            return Err(AppError::Custom(format!(
                "Cannot replace real directory: {}",
                link_path.display()
            )));
        }
    }

    unix_fs::symlink(source_path, &link_path)?;
    Ok(())
}

/// Remove a symlink for a skill at the given target directory
fn remove_skill_link(skill_name: &str, target_dir: &Path) -> Result<(), AppError> {
    let link_path = target_dir.join(skill_name);

    if link_path.symlink_metadata().is_ok() {
        let meta = link_path.symlink_metadata()?;
        if meta.file_type().is_symlink() {
            fs::remove_file(&link_path)?;
        } else {
            return Err(AppError::Custom(format!(
                "Not a symlink, refusing to remove: {}",
                link_path.display()
            )));
        }
    }
    Ok(())
}

/// Toggle a skill's user-level symlink across all active agent dirs
/// Returns per-dir link status map
#[tauri::command]
pub fn toggle_skill_user_level(
    skill_name: String,
    source_path: String,
    currently_active: bool,
) -> Result<HashMap<String, LinkStatus>, AppError> {
    let dirs = active_user_skills_dirs()?;
    let source = PathBuf::from(&source_path);
    let mut statuses = HashMap::new();

    for (dir_name, target_dir) in &dirs {
        let status = if currently_active {
            remove_skill_link(&skill_name, target_dir)?;
            LinkStatus::Inactive
        } else {
            create_skill_link(&skill_name, &source, target_dir)?;
            LinkStatus::Active
        };
        statuses.insert(dir_name.clone(), status);
    }

    Ok(statuses)
}

/// Toggle a skill's project-level symlink across all active agent dirs
#[tauri::command]
pub fn toggle_skill_project_level(
    skill_name: String,
    source_path: String,
    project_path: String,
    currently_active: bool,
) -> Result<HashMap<String, LinkStatus>, AppError> {
    let dirs = active_project_skills_dirs(&project_path)?;
    let source = PathBuf::from(&source_path);
    let mut statuses = HashMap::new();

    for (dir_name, target_dir) in &dirs {
        let status = if currently_active {
            remove_skill_link(&skill_name, target_dir)?;
            LinkStatus::Inactive
        } else {
            create_skill_link(&skill_name, &source, target_dir)?;
            LinkStatus::Active
        };
        statuses.insert(dir_name.clone(), status);
    }

    Ok(statuses)
}

/// Apply a profile: create symlinks for all skills across all active agent dirs
#[tauri::command]
pub fn apply_profile_links(
    skill_entries: Vec<(String, String)>, // (name, source_path) pairs
    target_path: Option<String>,          // None = user-level, Some = project-level
) -> Result<Vec<String>, AppError> {
    let dirs: Vec<(String, PathBuf)> = match &target_path {
        Some(p) => active_project_skills_dirs(p)?,
        None => active_user_skills_dirs()?,
    };

    let mut created = Vec::new();
    for (dir_name, target_dir) in &dirs {
        for (name, source) in &skill_entries {
            let source_path = PathBuf::from(source);
            match create_skill_link(name, &source_path, target_dir) {
                Ok(()) => {
                    if !created.contains(name) {
                        created.push(name.clone());
                    }
                }
                Err(e) => eprintln!("Failed to link {} in {}: {}", name, dir_name, e),
            }
        }
    }

    Ok(created)
}

/// Sync a project's skills directories across all active agent dirs:
/// create missing symlinks and remove stale ones
#[tauri::command]
pub fn sync_project_links(
    skill_entries: Vec<(String, String)>, // desired (name, source_path) pairs
    project_path: String,
) -> Result<Vec<String>, AppError> {
    let dirs = active_project_skills_dirs(&project_path)?;

    let desired_names: std::collections::HashSet<String> =
        skill_entries.iter().map(|(name, _)| name.clone()).collect();

    let mut created = Vec::new();

    for (dir_name, target_dir) in &dirs {
        // Remove symlinks that are no longer desired
        if target_dir.is_dir() {
            for entry in fs::read_dir(target_dir)? {
                let entry = entry?;
                let path = entry.path();
                let meta = match path.symlink_metadata() {
                    Ok(m) => m,
                    Err(_) => continue,
                };
                if meta.file_type().is_symlink() {
                    let name = path
                        .file_name()
                        .map(|n| n.to_string_lossy().to_string())
                        .unwrap_or_default();
                    if !desired_names.contains(&name) {
                        let _ = fs::remove_file(&path);
                    }
                }
            }
        }

        // Create/update desired symlinks
        for (name, source) in &skill_entries {
            let source_path = PathBuf::from(source);
            match create_skill_link(name, &source_path, target_dir) {
                Ok(()) => {
                    if !created.contains(name) {
                        created.push(name.clone());
                    }
                }
                Err(e) => eprintln!("Failed to link {} in {}: {}", name, dir_name, e),
            }
        }
    }

    Ok(created)
}

/// Clean up broken symlinks across all active agent dirs
#[tauri::command]
pub fn clean_broken_links(target_path: Option<String>) -> Result<Vec<String>, AppError> {
    let dirs: Vec<(String, PathBuf)> = match &target_path {
        Some(p) => active_project_skills_dirs(p)?,
        None => active_user_skills_dirs()?,
    };

    let mut cleaned = Vec::new();

    for (_dir_name, target_dir) in &dirs {
        if !target_dir.is_dir() {
            continue;
        }

        for entry in fs::read_dir(target_dir)? {
            let entry = entry?;
            let path = entry.path();
            let meta = match path.symlink_metadata() {
                Ok(m) => m,
                Err(_) => continue,
            };

            if meta.file_type().is_symlink() && !path.exists() {
                let name = path
                    .file_name()
                    .map(|n| n.to_string_lossy().to_string())
                    .unwrap_or_default();
                fs::remove_file(&path)?;
                if !cleaned.contains(&name) {
                    cleaned.push(name);
                }
            }
        }
    }

    Ok(cleaned)
}

/// Scan a project's skills directories across all active agent dirs
/// Returns HashMap<dir_name, Vec<(name, target_path, status)>>
#[tauri::command]
pub fn get_project_skill_links(
    project_path: String,
) -> Result<Vec<(String, String, String)>, AppError> {
    // 保持原签名（只返回 .claude 的数据），以兼容现有 ProjectSkillView 逻辑
    let home = dirs::home_dir().ok_or(AppError::ConfigDirNotFound)?;
    let _ = home; // suppress warning
    let target_dir = PathBuf::from(&project_path).join(".claude").join("skills");
    scan_skills_dir(&target_dir)
}

/// Scan all active agent dirs for a project
/// Returns HashMap<dir_name, Vec<(name, target_path, status)>>
#[tauri::command]
pub fn get_project_skill_links_all(
    project_path: String,
) -> Result<HashMap<String, Vec<(String, String, String)>>, AppError> {
    let dirs = active_project_skills_dirs(&project_path)?;
    let mut result = HashMap::new();

    for (dir_name, target_dir) in dirs {
        result.insert(dir_name, scan_skills_dir(&target_dir)?);
    }

    Ok(result)
}

fn scan_skills_dir(target_dir: &Path) -> Result<Vec<(String, String, String)>, AppError> {
    if !target_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
    for entry in fs::read_dir(target_dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let meta = match path.symlink_metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            let target = fs::read_link(&path)
                .map(|t| t.to_string_lossy().to_string())
                .unwrap_or_default();
            let status = if path.exists() { "Active" } else { "Broken" };
            results.push((name, target, status.to_string()));
        } else if meta.is_dir() {
            results.push((name, path.to_string_lossy().to_string(), "Direct".to_string()));
        }
    }

    results.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));
    Ok(results)
}

/// Get all symlinks in user skills directories across all active agent dirs
#[tauri::command]
pub fn get_user_skill_links() -> Result<Vec<(String, String, bool)>, AppError> {
    // 保持原签名，只返回 .claude 的数据
    let home = dirs::home_dir().ok_or(AppError::ConfigDirNotFound)?;
    let target_dir = home.join(".claude").join("skills");

    if !target_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut links = Vec::new();
    for entry in fs::read_dir(&target_dir)? {
        let entry = entry?;
        let path = entry.path();
        let name = path
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_default();

        let meta = match path.symlink_metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            let target = fs::read_link(&path)
                .map(|t| t.to_string_lossy().to_string())
                .unwrap_or_default();
            let valid = path.exists();
            links.push((name, target, valid));
        }
    }

    Ok(links)
}

/// Sync links from source agent dir to target agent dirs
/// 把 source dir 的所有 links 复制到 target dirs（ln -sf 覆盖，不删除 target 独有的 link）
#[tauri::command]
pub fn sync_agent_dir_links(
    source_dir: String,        // 如 ".claude"
    target_dirs: Vec<String>,  // 如 [".codex"]
    is_user_level: bool,
    project_paths: Vec<String>, // is_user_level=false 时使用
) -> Result<HashMap<String, Vec<String>>, AppError> {
    let home = dirs::home_dir().ok_or(AppError::ConfigDirNotFound)?;
    let mut result: HashMap<String, Vec<String>> = HashMap::new();

    if is_user_level {
        // 用户级：读取 ~/{source_dir}/skills/ 下的所有 symlink
        let source_skills_dir = home.join(&source_dir).join("skills");
        let links = collect_links(&source_skills_dir)?;

        for target_dir_name in &target_dirs {
            let target_skills_dir = home.join(target_dir_name).join("skills");
            let mut created = Vec::new();
            for (name, source_path) in &links {
                let source = PathBuf::from(source_path);
                match create_skill_link(name, &source, &target_skills_dir) {
                    Ok(()) => created.push(name.clone()),
                    Err(e) => eprintln!("sync_agent_dir_links: failed {} → {}: {}", name, target_dir_name, e),
                }
            }
            result.insert(target_dir_name.clone(), created);
        }
    } else {
        // 项目级：对每个项目执行同步
        for project_path in &project_paths {
            let source_skills_dir = PathBuf::from(project_path).join(&source_dir).join("skills");
            let links = collect_links(&source_skills_dir)?;

            for target_dir_name in &target_dirs {
                let target_skills_dir = PathBuf::from(project_path).join(target_dir_name).join("skills");
                let created = result.entry(target_dir_name.clone()).or_default();
                for (name, source_path) in &links {
                    let source = PathBuf::from(source_path);
                    match create_skill_link(name, &source, &target_skills_dir) {
                        Ok(()) => {
                            if !created.contains(name) {
                                created.push(name.clone());
                            }
                        }
                        Err(e) => eprintln!("sync_agent_dir_links: failed {} → {}: {}", name, target_dir_name, e),
                    }
                }
            }
        }
    }

    Ok(result)
}

/// 收集指定目录下所有 symlink 的 (name, original_source) 对
fn collect_links(dir: &Path) -> Result<Vec<(String, String)>, AppError> {
    if !dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut links = Vec::new();
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();
        let meta = match path.symlink_metadata() {
            Ok(m) => m,
            Err(_) => continue,
        };

        if meta.file_type().is_symlink() {
            let name = path
                .file_name()
                .map(|n| n.to_string_lossy().to_string())
                .unwrap_or_default();
            let target = fs::read_link(&path)
                .map(|t| t.to_string_lossy().to_string())
                .unwrap_or_default();
            if !target.is_empty() {
                links.push((name, target));
            }
        }
    }

    Ok(links)
}
