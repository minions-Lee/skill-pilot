use crate::error::AppError;
use crate::models::{LinkStatus, Skill, SkillFrontmatter};
use regex::Regex;
use std::collections::{HashMap, HashSet};
use std::fs;
use std::path::{Path, PathBuf};
use walkdir::WalkDir;

/// Directories to skip during scanning
const EXCLUDED_DIRS: &[&str] = &[
    ".git",
    ".cursor",
    ".gemini",
    ".codex",
    ".continue",
    "node_modules",
    ".idea",
    "target",
    ".vscode",
];

/// Parse YAML frontmatter from SKILL.md content
fn parse_frontmatter(content: &str) -> SkillFrontmatter {
    if !content.starts_with("---") {
        return SkillFrontmatter::default();
    }

    let parts: Vec<&str> = content.splitn(3, "---").collect();
    if parts.len() < 3 {
        return SkillFrontmatter::default();
    }

    let yaml_str = parts[1].trim();
    serde_yaml::from_str(yaml_str).unwrap_or_default()
}

/// Parse .gitmodules file to get submodule name→path mapping
fn parse_gitmodules(repo_root: &Path) -> HashMap<String, PathBuf> {
    let gitmodules_path = repo_root.join(".gitmodules");
    let mut modules = HashMap::new();

    let content = match fs::read_to_string(&gitmodules_path) {
        Ok(c) => c,
        Err(_) => return modules,
    };

    let mut current_name: Option<String> = None;
    let mut current_path: Option<String> = None;

    for line in content.lines() {
        let trimmed = line.trim();
        if trimmed.starts_with("[submodule ") {
            // Save previous entry
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
    // Last entry
    if let (Some(name), Some(path)) = (current_name, current_path) {
        modules.insert(path.clone(), repo_root.join(&path));
        modules.insert(name, repo_root.join(&path));
    }

    modules
}

/// Infer which repo/submodule a skill belongs to
fn infer_source_repo(skill_path: &Path, repo_root: &Path, submodules: &HashMap<String, PathBuf>) -> String {
    // Check if skill path is under any submodule
    for (name, sub_path) in submodules {
        if let Ok(canon_sub) = sub_path.canonicalize() {
            if let Ok(canon_skill) = skill_path.canonicalize() {
                if canon_skill.starts_with(&canon_sub) {
                    return name.clone();
                }
            }
        }
        // Fallback: string prefix match
        if skill_path.starts_with(sub_path) {
            return name.clone();
        }
    }
    // Not in any submodule → top-level
    skill_path
        .strip_prefix(repo_root)
        .ok()
        .and_then(|rel| rel.components().next())
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .unwrap_or_else(|| "unknown".to_string())
}

/// Infer category from path segments
fn infer_category(skill_path: &Path, repo_root: &Path) -> Option<String> {
    let rel = skill_path.strip_prefix(repo_root).ok()?;
    let components: Vec<String> = rel
        .components()
        .map(|c| c.as_os_str().to_string_lossy().to_string())
        .collect();

    // Look for known category segments like "backend", "frontend", "skills"
    for seg in &components {
        match seg.as_str() {
            "backend" | "frontend" | "devops" | "marketing" | "content" | "tools" => {
                return Some(seg.clone())
            }
            _ => {}
        }
    }
    None
}

/// Extract referenced skill names from SKILL.md content
fn extract_dependencies(content: &str) -> Vec<String> {
    let re = Regex::new(r#"(?:skill|invoke|use|require|depend)[s]?\s*[:\-]?\s*["'`]([a-zA-Z0-9_-]+)["'`]"#).unwrap();
    let mut deps: Vec<String> = re
        .captures_iter(content)
        .map(|cap| cap[1].to_string())
        .collect();
    deps.sort();
    deps.dedup();
    deps
}

/// Check the link status of a skill in the user-level skills directory
fn check_user_link_status(skill_name: &str, skill_source: &Path) -> LinkStatus {
    let user_skills_dir = dirs::home_dir()
        .map(|h| h.join(".claude").join("skills").join(skill_name));

    let link_path = match user_skills_dir {
        Some(p) => p,
        None => return LinkStatus::Inactive,
    };

    if !link_path.exists() && !link_path.symlink_metadata().is_ok() {
        return LinkStatus::Inactive;
    }

    // Check if it's a symlink
    match link_path.symlink_metadata() {
        Ok(meta) => {
            if meta.file_type().is_symlink() {
                // Check if target is valid
                if link_path.exists() {
                    // Verify it points to the right source
                    match fs::read_link(&link_path) {
                        Ok(target) => {
                            let resolved = if target.is_relative() {
                                link_path.parent().unwrap_or(Path::new("")).join(&target)
                            } else {
                                target
                            };
                            if let (Ok(a), Ok(b)) = (resolved.canonicalize(), skill_source.canonicalize()) {
                                if a == b {
                                    LinkStatus::Active
                                } else {
                                    LinkStatus::Active // Points to different source but still works
                                }
                            } else {
                                LinkStatus::Active
                            }
                        }
                        Err(_) => LinkStatus::Active,
                    }
                } else {
                    LinkStatus::Broken
                }
            } else if meta.is_dir() {
                LinkStatus::Direct
            } else {
                LinkStatus::Inactive
            }
        }
        Err(_) => LinkStatus::Inactive,
    }
}

/// Scan the entire skills repository and return all discovered skills
#[tauri::command]
pub fn scan_skills_repo(repo_path: String) -> Result<Vec<Skill>, AppError> {
    let repo_root = PathBuf::from(&repo_path);
    if !repo_root.is_dir() {
        return Err(AppError::Custom(format!(
            "Repository path does not exist: {}",
            repo_path
        )));
    }

    let submodules = parse_gitmodules(&repo_root);
    let mut skills: Vec<Skill> = Vec::new();
    let mut seen_names: HashSet<String> = HashSet::new();

    for entry in WalkDir::new(&repo_root)
        .follow_links(true)
        .into_iter()
        .filter_entry(|e| {
            let name = e.file_name().to_string_lossy();
            // Skip excluded directories
            if e.file_type().is_dir() {
                return !EXCLUDED_DIRS.iter().any(|&ex| name == ex)
                    && !name.starts_with('.');
            }
            true
        })
    {
        let entry = match entry {
            Ok(e) => e,
            Err(_) => continue,
        };

        if entry.file_name().to_string_lossy() != "SKILL.md" {
            continue;
        }

        let skill_md_path = entry.path().to_path_buf();
        let skill_dir = match skill_md_path.parent() {
            Some(p) => p.to_path_buf(),
            None => continue,
        };

        // Read and parse SKILL.md
        let content = match fs::read_to_string(&skill_md_path) {
            Ok(c) => c,
            Err(_) => continue,
        };

        let frontmatter = parse_frontmatter(&content);

        // Determine name: frontmatter > directory name
        let dir_name = skill_dir
            .file_name()
            .map(|n| n.to_string_lossy().to_string())
            .unwrap_or_else(|| "unknown".to_string());

        let name = frontmatter.name.unwrap_or_else(|| dir_name.clone());

        // Dedup: keep first occurrence (shortest path wins due to WalkDir order)
        if seen_names.contains(&name) {
            continue;
        }
        seen_names.insert(name.clone());

        // Build relative ID
        let id = skill_dir
            .strip_prefix(&repo_root)
            .map(|r| r.to_string_lossy().to_string())
            .unwrap_or_else(|_| dir_name.clone());

        let description = frontmatter
            .description
            .unwrap_or_else(|| {
                // Fallback: first non-empty, non-frontmatter line
                content
                    .lines()
                    .skip_while(|l| l.starts_with("---") || l.trim().is_empty())
                    .find(|l| !l.starts_with("---") && !l.trim().is_empty())
                    .unwrap_or("")
                    .trim_start_matches('#')
                    .trim()
                    .to_string()
            });

        let source_repo = infer_source_repo(&skill_dir, &repo_root, &submodules);
        let category = infer_category(&skill_dir, &repo_root);
        let dependencies = extract_dependencies(&content);
        let has_scripts = skill_dir.join("scripts").is_dir();
        let has_references = skill_dir.join("references").is_dir();
        let link_status_user = check_user_link_status(&name, &skill_dir);

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

    // Sort by name for consistent ordering
    skills.sort_by(|a, b| a.name.to_lowercase().cmp(&b.name.to_lowercase()));

    Ok(skills)
}

/// Refresh link statuses for all skills
#[tauri::command]
pub fn refresh_link_statuses(skills: Vec<Skill>) -> Vec<Skill> {
    skills
        .into_iter()
        .map(|mut s| {
            s.link_status_user = check_user_link_status(&s.name, &s.source_path);
            s
        })
        .collect()
}
