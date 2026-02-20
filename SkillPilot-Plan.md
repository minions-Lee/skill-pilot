# SkillPilot - macOS 桌面应用实现计划

## Context

当前 `~/.claude/skills/` 下有 60 个 skill 全量加载，不区分项目类型。Java 项目能看到 PPT 和营销的 skill，内容创作项目也会加载 Maven 相关 skill。这导致 context 浪费、skill 触发混乱。

**目标**：构建一个 macOS .dmg 桌面应用（项目名 **SkillPilot**），提供 skill 可视化管理、按项目类型精准配置、内容预览、依赖关系图、使用统计等能力。

**核心理念**：所有 skill 存放在仓库根目录 (`~/Documents/pe/skills/`)，通过 symlink 链接到 `~/.claude/skills/`（用户级）或 `<project>/.claude/skills/`（项目级），永远不复制。

**工程位置**：`~/Documents/pe/skills/skill-pilot/`

---

## 背景知识

### Claude Code Skill 加载机制

| 层级 | 路径 | 生效范围 |
|------|------|---------|
| 用户级 | `~/.claude/skills/` | 所有对话，永远加载 |
| 项目级 | `<project>/.claude/skills/` | 仅该项目目录下的对话 |

### 当前 Skill 仓库结构

仓库根目录 `/Users/eamanc/Documents/pe/skills/` 包含：
- 10 个 git submodule（superpowers, marketingskills, baoyu-skills, awesome-claude-skills 等）
- ~9 个独立 skill 目录（maven-operating, docker-bluegreen-deploy 等）
- 嵌套 skill（fenxiang-skills/backend/skills/code-review/ 等多级结构）
- 总计 ~1200+ 个 SKILL.md 文件

### Skill 目录结构

每个 skill 是一个包含 `SKILL.md` 的目录：
```
skill-name/
├── SKILL.md        # 必需：YAML frontmatter (name, description) + Markdown 指令
├── scripts/        # 可选：可执行脚本
├── references/     # 可选：参考文档
└── assets/         # 可选：模板/数据文件
```

YAML frontmatter 格式：
```yaml
---
name: skill-name         # 必需
description: "..."       # 必需，触发机制
version: 1.0.0           # 可选
tags: ["tag1", "tag2"]   # 可选
---
```

### 现有 Symlink 模式（5 种）

1. **子模块内嵌 skill**: `~/.claude/skills/code-review -> /pe/skills/fenxiang-skills/backend/skills/code-review/`
2. **子模块 skills/ 子目录**: `~/.claude/skills/brainstorming -> /pe/skills/superpowers/skills/brainstorming/`
3. **顶层独立 skill**: `~/.claude/skills/maven-operating -> /pe/skills/maven-operating`
4. **相对路径**: `~/.claude/skills/github-search -> ../../.agents/skills/github-search`
5. **真实目录**: `~/.claude/skills/weekly-report/`（非 symlink）

### 关键边界情况

- `guided-learning/SKILL.md` 无 YAML frontmatter → 需用目录名 + 首行内容兜底
- `planning-with-files/` 在 `.cursor/`, `.gemini/` 等子目录有 13 份重复 SKILL.md → 需排除 `.` 开头中间目录
- 相对路径 symlink → 需 `canonicalize()` 解析真实路径

---

## 技术栈

**Tauri 2.0 + React + TypeScript + Tailwind CSS**

| 选型 | 理由 |
|------|------|
| Tauri 2.0 (Rust) | .dmg 仅 10-20MB（Electron 150MB+），原生 macOS 窗口，Rust 擅长文件系统操作 |
| React 19 + Vite | 快速开发，丰富生态 |
| Zustand | 轻量状态管理 |
| @tanstack/react-virtual | 1200+ skill 虚拟滚动 |
| react-markdown + remark-gfm | SKILL.md 内容预览渲染 |
| @dnd-kit | 拖拽 skill 进 Profile |
| react-force-graph-2d | 依赖关系力导向图 |
| recharts | 使用统计图表 |

---

## 项目结构

```
skill-pilot/
├── src-tauri/                    # Rust 后端
│   ├── Cargo.toml
│   ├── tauri.conf.json
│   ├── capabilities/default.json # 文件系统权限声明
│   └── src/
│       ├── main.rs
│       ├── lib.rs                # 注册所有 command
│       ├── error.rs              # 统一错误处理
│       ├── commands/
│       │   ├── mod.rs
│       │   ├── scanner.rs        # 扫描 skill 仓库，解析 frontmatter
│       │   ├── linker.rs         # symlink 增删查
│       │   ├── profiles.rs       # Profile CRUD + 预置模板
│       │   ├── projects.rs       # 项目绑定
│       │   └── stats.rs          # 使用统计收集
│       └── models/
│           ├── mod.rs
│           ├── skill.rs          # Skill + SkillFrontmatter + LinkStatus
│           ├── profile.rs        # Profile 数据模型
│           └── project.rs        # ProjectConfig 数据模型
├── src/                          # React 前端
│   ├── main.tsx
│   ├── App.tsx                   # 路由 + 三栏布局
│   ├── types/
│   │   ├── skill.ts
│   │   ├── profile.ts
│   │   └── project.ts
│   ├── store/
│   │   ├── useSkillStore.ts      # skill 目录、过滤、选中
│   │   ├── useProfileStore.ts    # Profile CRUD
│   │   └── useProjectStore.ts    # 项目绑定
│   ├── hooks/
│   │   ├── useScanner.ts         # invoke('scan_skills_repo')
│   │   ├── useLinker.ts          # invoke('toggle_skill_*')
│   │   └── useStats.ts           # 统计数据
│   ├── components/
│   │   ├── layout/
│   │   │   ├── AppShell.tsx      # CSS Grid 三栏容器
│   │   │   └── TitleBar.tsx      # macOS 沉浸式标题栏
│   │   ├── sidebar/
│   │   │   ├── Sidebar.tsx       # 左侧导航容器
│   │   │   ├── RepoSection.tsx   # 仓库列表（可折叠）
│   │   │   ├── ProfileList.tsx   # Profile 列表
│   │   │   └── ProjectList.tsx   # 项目列表
│   │   ├── skill-grid/
│   │   │   ├── SkillGrid.tsx     # 虚拟滚动网格
│   │   │   ├── SkillCard.tsx     # Skill 卡片（toggle/拖拽/徽章）
│   │   │   ├── SkillFilter.tsx   # 搜索 + 过滤器
│   │   │   └── GroupHeader.tsx   # 分组标题
│   │   ├── skill-detail/
│   │   │   ├── SkillDetail.tsx   # 右侧详情面板
│   │   │   ├── MarkdownView.tsx  # SKILL.md 渲染
│   │   │   └── LinkStatus.tsx    # 链接状态徽章
│   │   ├── profile-editor/
│   │   │   ├── ProfileEditor.tsx # Modal：拖拽编辑 Profile
│   │   │   └── ProfileApply.tsx  # 应用到用户级/项目级
│   │   ├── project-binder/
│   │   │   ├── ProjectBinder.tsx # 项目管理视图
│   │   │   └── ProjectCard.tsx   # 项目卡片
│   │   ├── dependency-graph/
│   │   │   └── DependencyGraph.tsx # 力导向依赖关系图
│   │   └── stats-dashboard/
│   │       └── StatsDashboard.tsx  # 统计看板
│   ├── utils/
│   │   ├── tauri.ts              # 类型化 invoke 封装
│   │   └── markdown.ts           # Markdown 渲染配置
│   └── styles/
│       ├── globals.css           # Tailwind base + macOS 系统色
│       └── tokens.css            # 颜色 token
├── package.json
├── tsconfig.json
├── vite.config.ts
└── tailwind.config.ts
```

---

## 实现步骤

### Step 1: 环境准备 + 项目初始化

```bash
# 安装 Rust（如未安装）
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
source ~/.cargo/env

# 初始化 Tauri 项目
cd ~/Documents/pe/skills
npm create tauri-app@latest skill-pilot -- --template react-ts
cd skill-pilot

# 前端依赖
npm install zustand @tanstack/react-virtual react-markdown remark-gfm
npm install @dnd-kit/core @dnd-kit/sortable
npm install react-force-graph-2d recharts
npm install tailwindcss @tailwindcss/vite

# Tauri Rust 依赖
cd src-tauri
cargo add tauri-plugin-dialog tauri-plugin-shell
cargo add serde serde_json serde_yaml walkdir dirs anyhow thiserror
cd ..
```

### Step 2: Rust 数据模型

实现 `src-tauri/src/models/` 下的 Skill、Profile、ProjectConfig 结构体，全部 derive Serialize/Deserialize。

**Skill 核心字段**：
- `id` (String) - 相对路径唯一标识
- `name` (String) - frontmatter.name 或目录名
- `description` (String) - frontmatter.description
- `source_path` (PathBuf) - 磁盘绝对路径
- `source_repo` (String) - 所属子模块/仓库名
- `category` (Option<String>) - 自动推断分类
- `tags` (Vec<String>)
- `has_scripts`, `has_references` (bool)
- `link_status_user` (LinkStatus) - Active/Broken/Inactive/Direct
- `dependencies` (Vec<String>) - 引用的其他 skill

### Step 3: Skill 扫描器（核心）

`src-tauri/src/commands/scanner.rs`

1. `walkdir` 递归扫描，找所有 `SKILL.md`
2. 排除路径：`.git/`, `.cursor/`, `.gemini/`, `.codex/`, `node_modules/`, `.continue/`
3. `serde_yaml` 解析 frontmatter，兜底无 frontmatter 情况
4. 解析 `.gitmodules` → 推断 `source_repo`
5. 路径段推断 `category`（fenxiang-skills/backend/ → "backend"）
6. 正则提取 SKILL.md 中的 skill 引用 → 构建依赖关系
7. 按 `name` 去重（保留最短路径）

### Step 4: Symlink 管理器

`src-tauri/src/commands/linker.rs`

| Command | 功能 |
|---------|------|
| `get_all_link_statuses` | 批量查询链接状态 |
| `toggle_skill_user_level` | 创建/删除用户级 symlink |
| `toggle_skill_project_level` | 创建/删除项目级 symlink |
| `apply_profile` | 批量应用 Profile |
| `clean_broken_links` | 清理断链 |

### Step 5: Profile & Project 持久化

`~/.claude-skill-manager/` 存储 config.json、profiles/*.json、projects.json、stats.json。

预置 5 套 Profile 模板：Java 开发、通用工作流、内容创作、营销增长、DevOps。

### Step 6: 前端三栏布局

CSS Grid 三栏：左 260px（Sidebar）+ 中 flex-1（SkillGrid）+ 右 360px（Detail）。
macOS 沉浸式标题栏（titleBarStyle: Overlay）。

### Step 7: Skill 卡片网格

`@tanstack/react-virtual` 虚拟滚动。卡片含：名称、仓库徽章、描述、链接指示灯、Toggle、拖拽手柄。支持按仓库/分类/字母分组。

### Step 8: Skill 内容预览

`react-markdown` + `remark-gfm` 渲染 SKILL.md。展示 scripts/ 和 references/ 文件列表。链接状态 Toggle。

### Step 9: 依赖关系图

`react-force-graph-2d` 力导向图。节点=Skill（颜色=仓库），边=依赖。支持缩放、拖拽、高亮依赖链。

### Step 10: 使用统计看板

`recharts` 图表：skill 使用分布（柱状图）、Profile 使用（饼图）、用户级 vs 项目级（堆叠条形图）、链接健康度（环形图）、操作时间线。

### Step 11: Profile 编辑器

Modal 弹窗。左：可用 skill 列表。右：`@dnd-kit` 拖拽排序的 Profile skill 列表。名称、描述、颜色选择器。

### Step 12: 项目绑定

项目列表 + Tauri 原生目录选择器。每个项目可叠加多个 Profile + 额外 skill。

### Step 13: 构建 .dmg

```bash
npm run tauri build
# → src-tauri/target/release/bundle/dmg/SkillPilot_0.1.0_aarch64.dmg
```

---

## 验证方式

1. **扫描**: 设仓库根目录 → 确认 1200+ skills 分组显示正确
2. **链接**: Toggle skill → 确认 `~/.claude/skills/` symlink 创建/删除
3. **Profile**: 创建 Java 开发 Profile → 应用到项目 → 确认项目 `.claude/skills/` 下 symlink
4. **预览**: 点击 skill → 右侧 Markdown 渲染正确
5. **依赖图**: `baoyu-image-gen` 节点有多条出边
6. **统计**: 看板图表数据正确
7. **断链**: 删除源目录 → 刷新 → 显示 Broken 橙色状态

---

## 关键参考文件

| 文件 | 用途 |
|------|------|
| `/Users/eamanc/Documents/pe/skills/.gitmodules` | 子模块列表 |
| `/Users/eamanc/Documents/pe/skills/linking-skills/SKILL.md` | symlink 语义参考 |
| `~/.claude/skills/` | 用户级 skill 目标目录 |
| `/Users/eamanc/Documents/pe/skills/guided-learning/SKILL.md` | 无 frontmatter 边界情况 |
| `/Users/eamanc/Documents/pe/skills/planning-with-files/` | 重复去重边界情况 |
