use serde::{Deserialize, Serialize};
use std::path::PathBuf;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ProjectConfig {
    /// Unique identifier
    pub id: String,
    /// Display name
    pub name: String,
    /// Project root directory
    pub path: PathBuf,
    /// Profile IDs applied to this project
    pub profile_ids: Vec<String>,
    /// Additional individual skill IDs beyond profiles
    pub extra_skill_ids: Vec<String>,
}
