use crate::error::AppError;
use crate::models::ProjectConfig;
use std::fs;
use std::path::PathBuf;

fn projects_path() -> Result<PathBuf, AppError> {
    let dir = dirs::home_dir()
        .map(|h| h.join(".claude-skill-manager"))
        .ok_or(AppError::ConfigDirNotFound)?;
    fs::create_dir_all(&dir)?;
    Ok(dir.join("projects.json"))
}

fn load_projects() -> Result<Vec<ProjectConfig>, AppError> {
    let path = projects_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let content = fs::read_to_string(&path)?;
    let projects: Vec<ProjectConfig> = serde_json::from_str(&content)?;
    Ok(projects)
}

fn save_projects(projects: &[ProjectConfig]) -> Result<(), AppError> {
    let path = projects_path()?;
    let json = serde_json::to_string_pretty(projects)?;
    fs::write(&path, json)?;
    Ok(())
}

/// List all registered projects
#[tauri::command]
pub fn list_projects() -> Result<Vec<ProjectConfig>, AppError> {
    load_projects()
}

/// Add or update a project
#[tauri::command]
pub fn save_project(project: ProjectConfig) -> Result<ProjectConfig, AppError> {
    let mut projects = load_projects()?;

    if let Some(existing) = projects.iter_mut().find(|p| p.id == project.id) {
        *existing = project.clone();
    } else {
        projects.push(project.clone());
    }

    save_projects(&projects)?;
    Ok(project)
}

/// Delete a project
#[tauri::command]
pub fn delete_project(id: String) -> Result<(), AppError> {
    let mut projects = load_projects()?;
    projects.retain(|p| p.id != id);
    save_projects(&projects)?;
    Ok(())
}
