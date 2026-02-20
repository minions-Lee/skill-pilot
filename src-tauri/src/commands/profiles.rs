use crate::error::AppError;
use crate::models::Profile;
use std::fs;
use std::path::PathBuf;

fn config_dir() -> Result<PathBuf, AppError> {
    dirs::home_dir()
        .map(|h| h.join(".claude-skill-manager"))
        .ok_or(AppError::ConfigDirNotFound)
}

fn profiles_dir() -> Result<PathBuf, AppError> {
    let dir = config_dir()?.join("profiles");
    fs::create_dir_all(&dir)?;
    Ok(dir)
}

fn profile_path(id: &str) -> Result<PathBuf, AppError> {
    Ok(profiles_dir()?.join(format!("{}.json", id)))
}

/// List all profiles (presets + user-created, user overrides take priority)
#[tauri::command]
pub fn list_profiles() -> Result<Vec<Profile>, AppError> {
    // Load user profiles from disk first
    let mut user_profiles: std::collections::HashMap<String, Profile> = std::collections::HashMap::new();
    let dir = profiles_dir()?;
    if dir.is_dir() {
        for entry in fs::read_dir(&dir)? {
            let entry = entry?;
            if entry.path().extension().is_some_and(|e| e == "json") {
                let content = fs::read_to_string(entry.path())?;
                if let Ok(profile) = serde_json::from_str::<Profile>(&content) {
                    user_profiles.insert(profile.id.clone(), profile);
                }
            }
        }
    }

    // Build final list: for presets, use user override if exists
    let mut profiles: Vec<Profile> = Vec::new();
    for preset in Profile::presets() {
        if let Some(user_version) = user_profiles.remove(&preset.id) {
            profiles.push(user_version);
        } else {
            profiles.push(preset);
        }
    }

    // Add remaining user-created profiles (non-preset IDs)
    for (_, profile) in user_profiles {
        profiles.push(profile);
    }

    Ok(profiles)
}

/// Create or update a profile
#[tauri::command]
pub fn save_profile(profile: Profile) -> Result<Profile, AppError> {
    let path = profile_path(&profile.id)?;
    let json = serde_json::to_string_pretty(&profile)?;
    fs::write(&path, json)?;
    Ok(profile)
}

/// Delete a user-created profile
#[tauri::command]
pub fn delete_profile(id: String) -> Result<(), AppError> {
    let path = profile_path(&id)?;
    if path.exists() {
        fs::remove_file(&path)?;
    }
    Ok(())
}

/// Get a single profile by ID
#[tauri::command]
pub fn get_profile(id: String) -> Result<Profile, AppError> {
    // Check presets first
    if let Some(preset) = Profile::presets().into_iter().find(|p| p.id == id) {
        return Ok(preset);
    }

    // Check user profiles
    let path = profile_path(&id)?;
    if path.exists() {
        let content = fs::read_to_string(&path)?;
        let profile: Profile = serde_json::from_str(&content)?;
        return Ok(profile);
    }

    Err(AppError::Custom(format!("Profile not found: {}", id)))
}
