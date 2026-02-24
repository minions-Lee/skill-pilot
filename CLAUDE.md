# SkillPilot

macOS 桌面应用，管理 Claude Code 的 skill symlink。

## 技术栈

- **Tauri 2.0** (Rust 后端) + **React 19** + **TypeScript 5.8** + **Vite 6**
- **Zustand 5** 状态管理
- **Tailwind CSS v4** (`@import "tailwindcss"`, 不是 v3 config)
- **Recharts** 图表 / **react-force-graph-2d** 依赖图 / **@tanstack/react-virtual** 虚拟滚动

## 构建

```bash
# 开发
npm run tauri dev

# 生产构建
PATH="$HOME/.nvm/versions/node/v24.7.0/bin:$HOME/.cargo/bin:/usr/bin:/bin:/usr/sbin:/sbin" npm run tauri build

# 输出
src-tauri/target/release/bundle/macos/SkillPilot.app
```

## 核心原则：配置即链接，链接即配置

**这是最重要的规范。** 操作配置文件时，必须同时操作对应的 symlink。绝不允许只改配置不改 link，或只改 link 不改配置。

### 创建 profile + 绑定 project

1. 写 profile JSON → `~/.claude-skill-manager/profiles/{id}.json`
2. 更新 `~/.claude-skill-manager/projects.json`，在目标 project 的 `profile_ids` 中添加 profile id
3. 对每个绑定的 project，确保 `.claude/skills/` 目录存在，然后创建 symlink：
   ```bash
   mkdir -p {project_path}/.claude/skills
   ln -sf {source_path} {project_path}/.claude/skills/{skill_name}
   ```

### 删除 profile 或解绑 project

1. 从 `projects.json` 中移除 profile id / 删除 profile JSON 文件
2. 删除对应 project 中该 profile 所有 skill 的 symlink：
   ```bash
   rm {project_path}/.claude/skills/{skill_name}
   ```

### 修改 profile 的 skill_ids

1. 更新 profile JSON 的 `skill_ids`
2. 对每个绑定该 profile 的 project：`ln -sf` 新增的 skill，`rm` 被移除的 skill

### Symlink 路径

- **User-level**: `~/.claude/skills/{skill_name}` → `{source_path}`
- **Project-level**: `{project_path}/.claude/skills/{skill_name}` → `{source_path}`

### Skill 源路径查找

Skills 仓库: `/Users/eamanc/Documents/pe/skills`

| 类型 | 路径模式 | 示例 |
|------|----------|------|
| 顶级 skill | `/Users/eamanc/Documents/pe/skills/{name}/` | `maven-operating`, `linear-dark-ui-style` |
| 子模块 skill | `/Users/eamanc/Documents/pe/skills/{submodule}/skills/{name}/` | `fenxiang-skills/backend/skills/code-review` |
| 嵌套子模块 | `/Users/eamanc/Documents/pe/skills/{submodule}/{category}/skills/{name}/` | `fenxiang-skills/frontend/skills/h5-development-standards` |

确认 source_path 存在后再创建 symlink。如果找不到，用 `find /Users/eamanc/Documents/pe/skills -name "{skill_name}" -type d` 搜索。

## 配置文件

### Profile (`~/.claude-skill-manager/profiles/{id}.json`)

```json
{
  "id": "my-profile",
  "name": "显示名称",
  "description": "描述",
  "color": "#5e6ad2",
  "skill_ids": ["brainstorming", "git-committing"],
  "is_preset": false
}
```

`skill_ids` 中的值是 skill 的 name（目录名），如 `brainstorming`、`code-review`。

### Projects (`~/.claude-skill-manager/projects.json`)

```json
[
  {
    "id": "uuid-here",
    "name": "project-name",
    "path": "/absolute/path/to/project",
    "profile_ids": ["my-profile", "preset-java"],
    "extra_skill_ids": []
  }
]
```

### 预设 Profile (8个，Rust 硬编码)

| ID | 名称 | 颜色 |
|----|------|------|
| `preset-java` | Java 开发 | #d4a259 |
| `preset-workflow` | 通用工作流 | #3B82F6 |
| `preset-marketing` | 营销增长 | #EC4899 |
| `preset-devops` | DevOps | #10B981 |
| `preset-frontend` | 前端工程开发 | #f2994a |
| `preset-media-content` | 自媒内容创作 | #a77bca |
| `preset-office-content` | 办公内容创作 | #7c8ea6 |
| `preset-info-collect` | 信息收集 | #4da7c9 |

预设可被用户覆盖（在 profiles 目录创建同 id 的 JSON 文件）。

## UI 风格：Linear Dark

- 13px 基础字号，`#1B1C1F` 背景，`#5E6AD2` 主色
- 设计 token 在 `src/styles/globals.css`（CSS custom properties）
- Sidebar 用 `data-sb="*"` 属性选择器
- **禁止**在 `@layer` 外添加 `* { padding:0; margin:0; }`（会破坏所有 Tailwind 工具类）

## 项目架构

```
src/
  store/           — Zustand: useSkillStore, useProfileStore, useProjectStore
  components/      — React 组件 (23个)
  utils/tauri.ts   — 所有 Tauri IPC 命令封装
  utils/resolveProfileSkills.ts — skill 解析
  types/           — TypeScript 类型定义
  styles/          — globals.css (设计 token)
src-tauri/src/
  commands/        — Rust 命令: scanner, linker, profiles, projects, stats, shell
  models/          — Rust 数据模型: Skill, Profile, ProjectConfig
```
