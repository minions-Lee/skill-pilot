use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub enum LinkStatus {
    /// Symlink exists and target is valid
    Active,
    /// Symlink exists but target is missing
    Broken,
    /// No symlink exists
    Inactive,
    /// Real directory (not a symlink)
    Direct,
}

#[derive(Debug, Clone, Serialize, Deserialize, Default)]
pub struct SkillFrontmatter {
    pub name: Option<String>,
    pub description: Option<String>,
    pub version: Option<String>,
    #[serde(default)]
    pub tags: Vec<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Skill {
    /// Unique ID: relative path from repo root
    pub id: String,
    /// Display name from frontmatter or directory name
    pub name: String,
    /// Description from frontmatter
    pub description: String,
    /// Absolute path to the skill directory
    pub source_path: PathBuf,
    /// Which repo/submodule this skill belongs to
    pub source_repo: String,
    /// Auto-inferred category
    pub category: Option<String>,
    /// Tags from frontmatter
    pub tags: Vec<String>,
    /// Whether the skill has a scripts/ directory
    pub has_scripts: bool,
    /// Whether the skill has a references/ directory
    pub has_references: bool,
    /// User-level link status (~/.claude/skills/)
    pub link_status_user: LinkStatus,
    /// Referenced skill names (dependencies)
    pub dependencies: Vec<String>,
    /// Raw SKILL.md content for preview
    pub raw_content: String,
}
