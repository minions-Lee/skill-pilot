use crate::error::AppError;
use crate::models::LinkStatus;
use std::fs;
use std::os::unix::fs as unix_fs;
use std::path::{Path, PathBuf};

fn user_skills_dir() -> Result<PathBuf, AppError> {
    dirs::home_dir()
        .map(|h| h.join(".claude").join("skills"))
        .ok_or(AppError::ConfigDirNotFound)
}

fn project_skills_dir(project_path: &str) -> PathBuf {
    PathBuf::from(project_path).join(".claude").join("skills")
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

/// Toggle a skill's user-level symlink (create or remove)
#[tauri::command]
pub fn toggle_skill_user_level(
    skill_name: String,
    source_path: String,
    currently_active: bool,
) -> Result<LinkStatus, AppError> {
    let target_dir = user_skills_dir()?;
    let source = PathBuf::from(&source_path);

    if currently_active {
        remove_skill_link(&skill_name, &target_dir)?;
        Ok(LinkStatus::Inactive)
    } else {
        create_skill_link(&skill_name, &source, &target_dir)?;
        Ok(LinkStatus::Active)
    }
}

/// Toggle a skill's project-level symlink
#[tauri::command]
pub fn toggle_skill_project_level(
    skill_name: String,
    source_path: String,
    project_path: String,
    currently_active: bool,
) -> Result<LinkStatus, AppError> {
    let target_dir = project_skills_dir(&project_path);
    let source = PathBuf::from(&source_path);

    if currently_active {
        remove_skill_link(&skill_name, &target_dir)?;
        Ok(LinkStatus::Inactive)
    } else {
        create_skill_link(&skill_name, &source, &target_dir)?;
        Ok(LinkStatus::Active)
    }
}

/// Apply a profile: create symlinks for all skills in the profile
#[tauri::command]
pub fn apply_profile_links(
    skill_entries: Vec<(String, String)>, // (name, source_path) pairs
    target_path: Option<String>,          // None = user-level, Some = project-level
) -> Result<Vec<String>, AppError> {
    let target_dir = match &target_path {
        Some(p) => project_skills_dir(p),
        None => user_skills_dir()?,
    };

    let mut created = Vec::new();
    for (name, source) in &skill_entries {
        let source_path = PathBuf::from(source);
        match create_skill_link(name, &source_path, &target_dir) {
            Ok(()) => created.push(name.clone()),
            Err(e) => eprintln!("Failed to link {}: {}", name, e),
        }
    }

    Ok(created)
}

/// Sync a project's skills directory: create missing symlinks and remove stale ones
#[tauri::command]
pub fn sync_project_links(
    skill_entries: Vec<(String, String)>, // desired (name, source_path) pairs
    project_path: String,
) -> Result<Vec<String>, AppError> {
    let target_dir = project_skills_dir(&project_path);

    // Collect desired skill names
    let desired_names: std::collections::HashSet<String> =
        skill_entries.iter().map(|(name, _)| name.clone()).collect();

    // Remove symlinks that are no longer desired
    if target_dir.is_dir() {
        for entry in fs::read_dir(&target_dir)? {
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
    let mut created = Vec::new();
    for (name, source) in &skill_entries {
        let source_path = PathBuf::from(source);
        match create_skill_link(name, &source_path, &target_dir) {
            Ok(()) => created.push(name.clone()),
            Err(e) => eprintln!("Failed to link {}: {}", name, e),
        }
    }

    Ok(created)
}

/// Clean up broken symlinks in a skills directory
#[tauri::command]
pub fn clean_broken_links(target_path: Option<String>) -> Result<Vec<String>, AppError> {
    let target_dir = match &target_path {
        Some(p) => project_skills_dir(p),
        None => user_skills_dir()?,
    };

    if !target_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut cleaned = Vec::new();
    for entry in fs::read_dir(&target_dir)? {
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
            cleaned.push(name);
        }
    }

    Ok(cleaned)
}

/// Scan a project's .claude/skills/ directory and return all links found
/// Returns (name, target_path, status) for each entry
#[tauri::command]
pub fn get_project_skill_links(
    project_path: String,
) -> Result<Vec<(String, String, String)>, AppError> {
    let target_dir = project_skills_dir(&project_path);
    if !target_dir.is_dir() {
        return Ok(Vec::new());
    }

    let mut results = Vec::new();
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
            let status = if path.exists() { "Active" } else { "Broken" };
            results.push((name, target, status.to_string()));
        } else if meta.is_dir() {
            results.push((name, path.to_string_lossy().to_string(), "Direct".to_string()));
        }
    }

    results.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));
    Ok(results)
}

/// Get all symlinks in the user skills directory
#[tauri::command]
pub fn get_user_skill_links() -> Result<Vec<(String, String, bool)>, AppError> {
    let target_dir = user_skills_dir()?;
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
