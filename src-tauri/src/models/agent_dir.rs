use serde::{Deserialize, Serialize};

/// 所有受支持的 agent 目录（固定列表，顺序即默认排序）
pub const SUPPORTED_AGENT_DIRS: &[(&str, &str)] = &[
    (".claude", "Claude Code"),
    (".codex", "Codex"),
    (".opencode", "OpenCode"),
];

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct AgentDir {
    /// 目录名，如 ".claude"
    pub dir: String,
    /// 显示名称，如 "Claude Code"
    pub label: String,
    /// 用户开关：是否参与 symlink 操作
    pub enabled: bool,
}
