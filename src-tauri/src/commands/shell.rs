use serde::Serialize;
use std::fs;
use std::path::PathBuf;
use std::process::Command;

#[derive(Debug, Clone, Serialize)]
pub struct FileEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
}

#[tauri::command]
pub fn reveal_in_finder(path: String) -> Result<(), String> {
    Command::new("open")
        .arg(&path)
        .spawn()
        .map_err(|e| format!("Failed to open path: {}", e))?;
    Ok(())
}

/// List files in a skill's subdirectory (references/ or scripts/)
#[tauri::command]
pub fn list_skill_files(skill_dir: String, subdir: String) -> Result<Vec<FileEntry>, String> {
    let dir = PathBuf::from(&skill_dir).join(&subdir);
    if !dir.is_dir() {
        return Ok(vec![]);
    }

    let mut entries = Vec::new();
    collect_files(&dir, &dir, &mut entries)?;
    entries.sort_by(|a, b| a.name.cmp(&b.name));
    Ok(entries)
}

fn collect_files(base: &PathBuf, dir: &PathBuf, entries: &mut Vec<FileEntry>) -> Result<(), String> {
    let read_dir = fs::read_dir(dir).map_err(|e| format!("Failed to read dir: {}", e))?;
    for entry in read_dir {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let path = entry.path();
        let metadata = entry.metadata().map_err(|e| format!("Failed to read metadata: {}", e))?;

        // Skip hidden files
        if entry.file_name().to_string_lossy().starts_with('.') {
            continue;
        }

        let relative = path.strip_prefix(base).unwrap_or(&path);
        let name = relative.to_string_lossy().to_string();

        if metadata.is_dir() {
            // Recurse into subdirectories
            collect_files(base, &path, entries)?;
        } else {
            entries.push(FileEntry {
                name,
                path: path.to_string_lossy().to_string(),
                size: metadata.len(),
                is_dir: false,
            });
        }
    }
    Ok(())
}

/// Read a file's content as UTF-8 text
#[tauri::command]
pub fn read_file_content(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| format!("Failed to read file {}: {}", path, e))
}
