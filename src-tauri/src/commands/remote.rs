use crate::error::AppError;
use crate::models::remote::{ConnectionStatus, RemoteServer};
use crate::models::{LinkStatus, Profile, ProjectConfig, Skill};
use crate::ssh::connection::{delete_keychain_password, save_keychain_password, SshPool};
use crate::ssh::executor::{exec_command_checked, shell_escape};
use crate::commands::scanner;
use std::collections::HashSet;
use std::fs;
use std::path::{Path, PathBuf};
use tauri::State;

// ============================================================
// Config file helpers
// ============================================================

fn remotes_path() -> Result<PathBuf, AppError> {
    dirs::home_dir()
        .map(|h| h.join(".claude-skill-manager").join("remotes.json"))
        .ok_or(AppError::ConfigDirNotFound)
}

fn load_remotes() -> Result<Vec<RemoteServer>, AppError> {
    let path = remotes_path()?;
    if !path.exists() {
        return Ok(Vec::new());
    }
    let data = fs::read_to_string(&path)?;
    let servers: Vec<RemoteServer> = serde_json::from_str(&data)?;
    Ok(servers)
}

fn save_remotes(servers: &[RemoteServer]) -> Result<(), AppError> {
    let path = remotes_path()?;
    if let Some(parent) = path.parent() {
        fs::create_dir_all(parent)?;
    }
    let data = serde_json::to_string_pretty(servers)?;
    fs::write(&path, data)?;
    Ok(())
}

fn find_server(servers: &[RemoteServer], id: &str) -> Result<RemoteServer, AppError> {
    servers
        .iter()
        .find(|s| s.id == id)
        .cloned()
        .ok_or_else(|| AppError::RemoteServerNotFound(id.to_string()))
}

/// Get the remote config dir, defaulting to ~/.claude-skill-manager
fn remote_config_dir(server: &RemoteServer) -> String {
    server
        .remote_config_dir
        .clone()
        .unwrap_or_else(|| "~/.claude-skill-manager".to_string())
}

/// Get the remote skills dir, defaulting to ~/.claude/skills
fn remote_skills_dir(server: &RemoteServer) -> String {
    server
        .remote_skills_dir
        .clone()
        .unwrap_or_else(|| "~/.claude/skills".to_string())
}

// ============================================================
// Server configuration CRUD
// ============================================================

/// List all configured remote servers
#[tauri::command]
pub fn list_remote_servers() -> Result<Vec<RemoteServer>, AppError> {
    load_remotes()
}

/// Save (create or update) a remote server configuration
#[tauri::command]
pub fn save_remote_server(server: RemoteServer) -> Result<RemoteServer, AppError> {
    let mut servers = load_remotes()?;
    if let Some(existing) = servers.iter_mut().find(|s| s.id == server.id) {
        *existing = server.clone();
    } else {
        servers.push(server.clone());
    }
    save_remotes(&servers)?;
    Ok(server)
}

/// Delete a remote server configuration
#[tauri::command]
pub fn delete_remote_server(id: String) -> Result<(), AppError> {
    let mut servers = load_remotes()?;
    servers.retain(|s| s.id != id);
    save_remotes(&servers)?;
    // Clean up Keychain entry
    delete_keychain_password(&id);
    Ok(())
}

/// Save SSH credential (password or passphrase) to macOS Keychain
#[tauri::command]
pub fn save_ssh_credential(server_id: String, credential: String) -> Result<(), AppError> {
    save_keychain_password(&server_id, &credential)
}

// ============================================================
// Connection management
// ============================================================

/// Test connection to a remote server
#[tauri::command]
pub fn test_remote_connection(
    server: RemoteServer,
    ssh_pool: State<SshPool>,
) -> Result<ConnectionStatus, AppError> {
    ssh_pool.test_connection(&server)
}

/// Disconnect from a remote server
#[tauri::command]
pub fn disconnect_remote(server_id: String, ssh_pool: State<SshPool>) -> Result<(), AppError> {
    ssh_pool.disconnect(&server_id);
    Ok(())
}

/// Get connection status for a remote server
#[tauri::command]
pub fn get_connection_status(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<ConnectionStatus, AppError> {
    Ok(ssh_pool.get_status(&server_id))
}

// ============================================================
// Remote initialization
// ============================================================

/// Initialize remote config directories (creates them if missing)
#[tauri::command]
pub fn remote_init_config(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<(), AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let config_dir = remote_config_dir(&server);
    let skills_dir = remote_skills_dir(&server);

    let cmd = format!(
        "mkdir -p {config}/profiles && mkdir -p {skills} && \
         test -f {config}/projects.json || echo '[]' > {config}/projects.json",
        config = shell_escape(&config_dir),
        skills = shell_escape(&skills_dir),
    );

    exec_command_checked(&session, &cmd)?;
    Ok(())
}

// ============================================================
// Remote Scanner
// ============================================================

/// Scan the remote skill repository and return all discovered skills
#[tauri::command]
pub fn remote_scan_skills_repo(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<Skill>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let repo_path = &server.remote_repo_path;
    let skills_dir = remote_skills_dir(&server);

    // 1. Batch find all SKILL.md files and their content in one command
    let find_cmd = format!(
        "find {} -name 'SKILL.md' \
         -not -path '*/.git/*' -not -path '*/node_modules/*' \
         -not -path '*/.cursor/*' -not -path '*/.gemini/*' \
         -not -path '*/.codex/*' -not -path '*/.continue/*' \
         -not -path '*/.idea/*' -not -path '*/target/*' \
         -not -path '*/.vscode/*' \
         -exec sh -c 'echo \"===SP_SEP===\" && echo \"PATH:$0\" && cat \"$0\"' {{}} \\;",
        shell_escape(repo_path)
    );
    let output = exec_command_checked(&session, &find_cmd).unwrap_or_default();

    // 2. Get user-level symlink info in one command
    let links_cmd = format!(
        "ls -la {} 2>/dev/null || true",
        shell_escape(&skills_dir)
    );
    let links_output = exec_command_checked(&session, &links_cmd).unwrap_or_default();

    // Parse symlink info into a set of active skill names
    let active_links: HashSet<String> = parse_ls_symlinks(&links_output);

    // 3. Try to get .gitmodules content for submodule detection
    let gitmodules_cmd = format!(
        "cat {}/.gitmodules 2>/dev/null || true",
        shell_escape(repo_path)
    );
    let gitmodules_content = exec_command_checked(&session, &gitmodules_cmd).unwrap_or_default();

    // Parse gitmodules content
    let submodules = parse_gitmodules_content(&gitmodules_content, Path::new(repo_path));

    // 4. Parse the find output into Skills
    let repo_root = PathBuf::from(repo_path);
    let mut skills: Vec<Skill> = Vec::new();
    let mut seen_names: HashSet<String> = HashSet::new();

    for block in output.split("===SP_SEP===") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }

        // Extract path line and content
        let mut lines = block.lines();
        let path_line = match lines.next() {
            Some(l) if l.starts_with("PATH:") => &l[5..],
            _ => continue,
        };

        let content: String = lines.collect::<Vec<&str>>().join("\n");
        let skill_md_path = PathBuf::from(path_line);
        let skill_dir = match skill_md_path.parent() {
            Some(p) => p.to_path_buf(),
            None => continue,
        };

        let frontmatter = scanner::parse_frontmatter(&content);

        let dir_name = skill_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let name = frontmatter.name.unwrap_or_else(|| dir_name.clone());

        if seen_names.contains(&name) {
            continue;
        }
        seen_names.insert(name.clone());

        let id = skill_dir
            .strip_prefix(&repo_root)
            .map(|r| r.to_string_lossy().to_string())
            .unwrap_or_else(|_| dir_name.clone());

        let description = frontmatter.description.unwrap_or_else(|| {
            content
                .lines()
                .skip_while(|l| l.starts_with("---") || l.trim().is_empty())
                .find(|l| !l.starts_with("---") && !l.trim().is_empty())
                .unwrap_or("")
                .trim_start_matches('#')
                .trim()
                .to_string()
        });

        let source_repo = scanner::infer_source_repo(&skill_dir, &repo_root, &submodules);
        let category = scanner::infer_category(&skill_dir, &repo_root);
        let dependencies = scanner::extract_dependencies(&content);

        // For remote skills, check has_scripts/has_references by path convention
        // (we don't do extra SSH calls for these — not critical)
        let has_scripts = false;
        let has_references = false;

        // Link status from the pre-fetched symlink data
        let link_status_user = if active_links.contains(&name) {
            LinkStatus::Active
        } else {
            LinkStatus::Inactive
        };

        skills.push(Skill {
            id,
            name,
            description,
            source_path: skill_dir,
            source_repo,
            category,
            tags: frontmatter.tags,
            has_scripts,
            has_references,
            link_status_user,
            dependencies,
            raw_content: content,
        });
    }

    skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));
    Ok(skills)
}

// ============================================================
// Remote Linker
// ============================================================

/// Toggle a skill's user-level symlink on the remote server
#[tauri::command]
pub fn remote_toggle_skill_user_level(
    server_id: String,
    skill_name: String,
    source_path: String,
    currently_active: bool,
    ssh_pool: State<SshPool>,
) -> Result<LinkStatus, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let skills_dir = remote_skills_dir(&server);

    if currently_active {
        let cmd = format!(
            "rm -f {}/{}",
            shell_escape(&skills_dir),
            shell_escape(&skill_name)
        );
        exec_command_checked(&session, &cmd)?;
        Ok(LinkStatus::Inactive)
    } else {
        let cmd = format!(
            "mkdir -p {} && ln -sf {} {}/{}",
            shell_escape(&skills_dir),
            shell_escape(&source_path),
            shell_escape(&skills_dir),
            shell_escape(&skill_name)
        );
        exec_command_checked(&session, &cmd)?;
        Ok(LinkStatus::Active)
    }
}

/// Toggle a skill's project-level symlink on the remote server
#[tauri::command]
pub fn remote_toggle_skill_project_level(
    server_id: String,
    skill_name: String,
    source_path: String,
    project_path: String,
    currently_active: bool,
    ssh_pool: State<SshPool>,
) -> Result<LinkStatus, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let target_dir = format!("{}/.claude/skills", project_path);

    if currently_active {
        let cmd = format!(
            "rm -f {}/{}",
            shell_escape(&target_dir),
            shell_escape(&skill_name)
        );
        exec_command_checked(&session, &cmd)?;
        Ok(LinkStatus::Inactive)
    } else {
        let cmd = format!(
            "mkdir -p {} && ln -sf {} {}/{}",
            shell_escape(&target_dir),
            shell_escape(&source_path),
            shell_escape(&target_dir),
            shell_escape(&skill_name)
        );
        exec_command_checked(&session, &cmd)?;
        Ok(LinkStatus::Active)
    }
}

/// Sync a remote project's skills directory
#[tauri::command]
pub fn remote_sync_project_links(
    server_id: String,
    skill_entries: Vec<(String, String)>,
    project_path: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<String>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let target_dir = format!("{}/.claude/skills", project_path);

    let desired_names: HashSet<String> = skill_entries.iter().map(|(n, _)| n.clone()).collect();

    // Get current symlinks
    let ls_cmd = format!("ls -la {} 2>/dev/null || true", shell_escape(&target_dir));
    let ls_output = exec_command_checked(&session, &ls_cmd).unwrap_or_default();
    let existing_links = parse_ls_symlinks(&ls_output);

    // Build batch command: remove stale + create desired
    let mut cmds: Vec<String> = vec![format!("mkdir -p {}", shell_escape(&target_dir))];

    // Remove stale symlinks
    for link_name in &existing_links {
        if !desired_names.contains(link_name) {
            cmds.push(format!(
                "rm -f {}/{}",
                shell_escape(&target_dir),
                shell_escape(link_name)
            ));
        }
    }

    // Create/update desired symlinks
    for (name, source) in &skill_entries {
        cmds.push(format!(
            "ln -sf {} {}/{}",
            shell_escape(source),
            shell_escape(&target_dir),
            shell_escape(name)
        ));
    }

    let batch = cmds.join(" && ");
    exec_command_checked(&session, &batch)?;

    Ok(skill_entries.iter().map(|(n, _)| n.clone()).collect())
}

/// Apply profile links on the remote server
#[tauri::command]
pub fn remote_apply_profile_links(
    server_id: String,
    skill_entries: Vec<(String, String)>,
    target_path: Option<String>,
    ssh_pool: State<SshPool>,
) -> Result<Vec<String>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let dir = match &target_path {
        Some(p) => format!("{}/.claude/skills", p),
        None => remote_skills_dir(&server),
    };

    let mut cmds: Vec<String> = vec![format!("mkdir -p {}", shell_escape(&dir))];
    for (name, source) in &skill_entries {
        cmds.push(format!(
            "ln -sf {} {}/{}",
            shell_escape(source),
            shell_escape(&dir),
            shell_escape(name)
        ));
    }

    let batch = cmds.join(" && ");
    exec_command_checked(&session, &batch)?;

    Ok(skill_entries.iter().map(|(n, _)| n.clone()).collect())
}

/// Clean broken symlinks on the remote server
#[tauri::command]
pub fn remote_clean_broken_links(
    server_id: String,
    target_path: Option<String>,
    ssh_pool: State<SshPool>,
) -> Result<Vec<String>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let dir = match &target_path {
        Some(p) => format!("{}/.claude/skills", p),
        None => remote_skills_dir(&server),
    };

    // Find broken symlinks
    let cmd = format!(
        "find {} -maxdepth 1 -type l ! -exec test -e {{}} \\; -print 2>/dev/null || true",
        shell_escape(&dir)
    );
    let output = exec_command_checked(&session, &cmd).unwrap_or_default();

    let mut cleaned = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        if let Some(name) = Path::new(line).file_name() {
            let name_str = name.to_string_lossy().to_string();
            let rm_cmd = format!("rm -f {}", shell_escape(line));
            if exec_command_checked(&session, &rm_cmd).is_ok() {
                cleaned.push(name_str);
            }
        }
    }

    Ok(cleaned)
}

/// Get project skill links from the remote server
#[tauri::command]
pub fn remote_get_project_skill_links(
    server_id: String,
    project_path: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<(String, String, String)>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let target_dir = format!("{}/.claude/skills", project_path);

    let cmd = format!(
        "ls -la {} 2>/dev/null || true",
        shell_escape(&target_dir)
    );
    let output = exec_command_checked(&session, &cmd).unwrap_or_default();

    let mut results = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        // Parse ls -la output: lrwxrwxrwx ... name -> target
        if !line.starts_with('l') && !line.starts_with('d') {
            continue;
        }
        if let Some((name, target, is_symlink)) = parse_ls_entry(line) {
            if is_symlink {
                // Check if target exists
                let check_cmd = format!(
                    "test -e {}/{} && echo 'exists' || echo 'broken'",
                    shell_escape(&target_dir),
                    shell_escape(&name)
                );
                let status_out = exec_command_checked(&session, &check_cmd).unwrap_or_default();
                let status = if status_out.trim() == "exists" {
                    "Active"
                } else {
                    "Broken"
                };
                results.push((name, target, status.to_string()));
            } else {
                results.push((name, String::new(), "Direct".to_string()));
            }
        }
    }

    results.sort_by(|a, b| a.0.to_lowercase().cmp(&b.0.to_lowercase()));
    Ok(results)
}

/// Get user-level skill links from the remote server
#[tauri::command]
pub fn remote_get_user_skill_links(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<(String, String, bool)>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let skills_dir = remote_skills_dir(&server);

    let cmd = format!(
        "ls -la {} 2>/dev/null || true",
        shell_escape(&skills_dir)
    );
    let output = exec_command_checked(&session, &cmd).unwrap_or_default();

    let mut links = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if !line.starts_with('l') {
            continue;
        }
        if let Some((name, target, true)) = parse_ls_entry(line) {
            let check_cmd = format!(
                "test -e {}/{} && echo 'valid' || echo 'invalid'",
                shell_escape(&skills_dir),
                shell_escape(&name)
            );
            let status_out = exec_command_checked(&session, &check_cmd).unwrap_or_default();
            let valid = status_out.trim() == "valid";
            links.push((name, target, valid));
        }
    }

    Ok(links)
}

// ============================================================
// Remote Profiles
// ============================================================

/// List profiles from the remote server
#[tauri::command]
pub fn remote_list_profiles(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<Profile>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    // Read all profile JSON files
    let cmd = format!(
        "for f in {}/profiles/*.json; do [ -f \"$f\" ] && echo '===PROFILE_SEP===' && cat \"$f\"; done 2>/dev/null || true",
        shell_escape(&config_dir)
    );
    let output = exec_command_checked(&session, &cmd).unwrap_or_default();

    // Parse user profiles
    let mut user_profiles: Vec<Profile> = Vec::new();
    for block in output.split("===PROFILE_SEP===") {
        let block = block.trim();
        if block.is_empty() {
            continue;
        }
        if let Ok(profile) = serde_json::from_str::<Profile>(block) {
            user_profiles.push(profile);
        }
    }

    // Merge with presets (same logic as local profiles.rs)
    let mut result: Vec<Profile> = Vec::new();

    for preset in Profile::presets() {
        if let Some(user_p) = user_profiles.iter().find(|p| p.id == preset.id) {
            result.push(user_p.clone());
        } else {
            result.push(preset);
        }
    }

    // Add non-preset user profiles
    for p in &user_profiles {
        if !Profile::presets().iter().any(|preset| preset.id == p.id) {
            result.push(p.clone());
        }
    }

    Ok(result)
}

/// Save a profile to the remote server
#[tauri::command]
pub fn remote_save_profile(
    server_id: String,
    profile: Profile,
    ssh_pool: State<SshPool>,
) -> Result<Profile, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    let json = serde_json::to_string_pretty(&profile)?;
    let cmd = format!(
        "mkdir -p {}/profiles && cat > {}/profiles/{}.json << 'SKILLPILOT_EOF'\n{}\nSKILLPILOT_EOF",
        shell_escape(&config_dir),
        shell_escape(&config_dir),
        shell_escape(&profile.id),
        json
    );
    exec_command_checked(&session, &cmd)?;

    Ok(profile)
}

/// Delete a profile from the remote server
#[tauri::command]
pub fn remote_delete_profile(
    server_id: String,
    id: String,
    ssh_pool: State<SshPool>,
) -> Result<(), AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    let cmd = format!(
        "rm -f {}/profiles/{}.json",
        shell_escape(&config_dir),
        shell_escape(&id)
    );
    exec_command_checked(&session, &cmd)?;

    Ok(())
}

// ============================================================
// Remote Projects
// ============================================================

/// List projects from the remote server
#[tauri::command]
pub fn remote_list_projects(
    server_id: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<ProjectConfig>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    let cmd = format!(
        "cat {}/projects.json 2>/dev/null || echo '[]'",
        shell_escape(&config_dir)
    );
    let output = exec_command_checked(&session, &cmd)?;
    let projects: Vec<ProjectConfig> = serde_json::from_str(output.trim())?;

    Ok(projects)
}

/// Save a project to the remote server
#[tauri::command]
pub fn remote_save_project(
    server_id: String,
    project: ProjectConfig,
    ssh_pool: State<SshPool>,
) -> Result<ProjectConfig, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    // Read existing projects
    let read_cmd = format!(
        "cat {}/projects.json 2>/dev/null || echo '[]'",
        shell_escape(&config_dir)
    );
    let output = exec_command_checked(&session, &read_cmd)?;
    let mut projects: Vec<ProjectConfig> = serde_json::from_str(output.trim())?;

    // Update or add
    if let Some(existing) = projects.iter_mut().find(|p| p.id == project.id) {
        *existing = project.clone();
    } else {
        projects.push(project.clone());
    }

    // Write back
    let json = serde_json::to_string_pretty(&projects)?;
    let write_cmd = format!(
        "cat > {}/projects.json << 'SKILLPILOT_EOF'\n{}\nSKILLPILOT_EOF",
        shell_escape(&config_dir),
        json
    );
    exec_command_checked(&session, &write_cmd)?;

    Ok(project)
}

/// Delete a project from the remote server
#[tauri::command]
pub fn remote_delete_project(
    server_id: String,
    id: String,
    ssh_pool: State<SshPool>,
) -> Result<(), AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;
    let config_dir = remote_config_dir(&server);

    // Read existing projects
    let read_cmd = format!(
        "cat {}/projects.json 2>/dev/null || echo '[]'",
        shell_escape(&config_dir)
    );
    let output = exec_command_checked(&session, &read_cmd)?;
    let mut projects: Vec<ProjectConfig> = serde_json::from_str(output.trim())?;

    projects.retain(|p| p.id != id);

    // Write back
    let json = serde_json::to_string_pretty(&projects)?;
    let write_cmd = format!(
        "cat > {}/projects.json << 'SKILLPILOT_EOF'\n{}\nSKILLPILOT_EOF",
        shell_escape(&config_dir),
        json
    );
    exec_command_checked(&session, &write_cmd)?;

    Ok(())
}

// ============================================================
// Remote Shell (file reading)
// ============================================================

/// List files in a remote skill directory
#[tauri::command]
pub fn remote_list_skill_files(
    server_id: String,
    skill_dir: String,
    subdir: String,
    ssh_pool: State<SshPool>,
) -> Result<Vec<RemoteFileEntry>, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let dir = if subdir.is_empty() {
        skill_dir.clone()
    } else {
        format!("{}/{}", skill_dir, subdir)
    };

    let cmd = format!(
        "find {} -type f -not -name '.*' 2>/dev/null | sort || true",
        shell_escape(&dir)
    );
    let output = exec_command_checked(&session, &cmd).unwrap_or_default();

    let base = PathBuf::from(&dir);
    let mut entries = Vec::new();
    for line in output.lines() {
        let line = line.trim();
        if line.is_empty() {
            continue;
        }
        let path = PathBuf::from(line);
        let name = path
            .strip_prefix(&base)
            .map(|r| r.to_string_lossy().to_string())
            .unwrap_or_else(|_| line.to_string());
        entries.push(RemoteFileEntry {
            name,
            path: line.to_string(),
            size: 0, // Not easily available without stat
            is_dir: false,
        });
    }

    Ok(entries)
}

/// Read a file's content from the remote server
#[tauri::command]
pub fn remote_read_file_content(
    server_id: String,
    path: String,
    ssh_pool: State<SshPool>,
) -> Result<String, AppError> {
    let servers = load_remotes()?;
    let server = find_server(&servers, &server_id)?;
    let session = ssh_pool.get_or_connect(&server)?;

    let cmd = format!("cat {}", shell_escape(&path));
    exec_command_checked(&session, &cmd)
}

// ============================================================
// Helper types and functions
// ============================================================

#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
pub struct RemoteFileEntry {
    pub name: String,
    pub path: String,
    pub size: u64,
    pub is_dir: bool,
}

/// Parse `ls -la` output to extract symlink names
fn parse_ls_symlinks(output: &str) -> HashSet<String> {
    let mut names = HashSet::new();
    for line in output.lines() {
        let line = line.trim();
        if line.starts_with('l') {
            if let Some((name, _, true)) = parse_ls_entry(line) {
                names.insert(name);
            }
        }
    }
    names
}

/// Parse a single `ls -la` line into (name, target, is_symlink)
fn parse_ls_entry(line: &str) -> Option<(String, String, bool)> {
    let is_symlink = line.starts_with('l');
    let is_dir = line.starts_with('d');

    if !is_symlink && !is_dir {
        return None;
    }

    if is_symlink {
        // Format: lrwxrwxrwx ... name -> target
        if let Some(arrow_pos) = line.find(" -> ") {
            let before_arrow = &line[..arrow_pos];
            let target = line[arrow_pos + 4..].trim().to_string();
            // Name is the last word before the arrow
            let name = before_arrow
                .rsplit_once(char::is_whitespace)
                .map(|(_, n)| n.to_string())
                .unwrap_or_default();
            if !name.is_empty() {
                return Some((name, target, true));
            }
        }
    } else if is_dir {
        // Format: drwxr-xr-x ... name
        let parts: Vec<&str> = line.split_whitespace().collect();
        if let Some(name) = parts.last() {
            let name = name.to_string();
            if name != "." && name != ".." {
                return Some((name, String::new(), false));
            }
        }
    }

    None
}

/// Parse .gitmodules content string (for remote repos where we can't read files directly)
fn parse_gitmodules_content(
    content: &str,
    repo_root: &Path,
) -> std::collections::HashMap<String, PathBuf> {
    let mut modules = std::collections::HashMap::new();

    let mut current_name: Option<String> = None;
    let mut current_path: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("[submodule ") {
            if let (Some(name), Some(path)) = (current_name.take(), current_path.take()) {
                modules.insert(path.clone(), repo_root.join(&path));
                modules.insert(name, repo_root.join(&path));
            }
            current_name = trimmed
                .strip_prefix("[submodule \"")
                .and_then(|s| s.strip_suffix("\"]"))
                .map(|s| s.to_string());
        } else if trimmed.starts_with("path = ") {
            current_path = trimmed.strip_prefix("path = ").map(|s| s.to_string());
        }
    }
    if let (Some(name), Some(path)) = (current_name, current_path) {
        modules.insert(path.clone(), repo_root.join(&path));
        modules.insert(name, repo_root.join(&path));
    }

    modules
}
