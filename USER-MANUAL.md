# SkillPilot 使用手册

## 目录

1. [概述](#1-概述)
2. [核心概念](#2-核心概念)
3. [界面总览](#3-界面总览)
4. [设置 Skill 仓库路径](#4-设置-skill-仓库路径)
5. [浏览 Skill](#5-浏览-skill)
6. [启用和禁用 Skill](#6-启用和禁用-skill)
7. [验证 Skill 链接是否生效](#7-验证-skill-链接是否生效)
8. [Profile 配置](#8-profile-配置)
9. [项目绑定 (Project Binder)](#9-项目绑定-project-binder)
10. [依赖关系图 (Graph)](#10-依赖关系图-graph)
11. [统计看板 (Stats)](#11-统计看板-stats)
12. [底层原理：Symlink 机制](#12-底层原理symlink-机制)

---

## 1. 概述

SkillPilot 是一个 macOS 桌面应用，用于可视化管理 Claude Code 的 Skill。

**解决的问题**：当 `~/.claude/skills/` 下有大量 skill 时，所有对话都会加载全部 skill，导致 context 浪费——Java 项目会加载 PPT 技能，内容创作项目也会加载 Maven 技能。

**解决方式**：SkillPilot 通过 **symlink（符号链接）** 来控制哪些 skill 对 Claude Code 可用。所有 skill 文件始终保存在仓库目录中，不会被复制或移动。SkillPilot 只是在 `~/.claude/skills/`（用户级）或 `<project>/.claude/skills/`（项目级）中创建/删除指向源文件的软链接。

---

## 2. 核心概念

### Skill

一个 skill 是一个包含 `SKILL.md` 文件的目录。`SKILL.md` 包含 YAML frontmatter（名称、描述、标签）和 Markdown 格式的指令。

```
skill-name/
├── SKILL.md        # 必需：skill 定义
├── scripts/        # 可选：可执行脚本
├── references/     # 可选：参考文档
└── assets/         # 可选：模板/数据
```

### Skill 仓库（Repository）

存放所有 skill 的本地目录。可以包含 git submodule、嵌套子目录等。SkillPilot 会递归扫描整个仓库，找出所有含 `SKILL.md` 的目录。

### 链接状态（Link Status）

| 状态 | 含义 | 显示 |
|------|------|------|
| **Active** | `~/.claude/skills/` 下有指向该 skill 的 symlink，且链接有效 | 绿色 |
| **Inactive** | `~/.claude/skills/` 下没有该 skill 的链接 | 灰色 |
| **Broken** | 存在 symlink 但目标路径无效（源被删除/移动） | 橙色 |
| **Direct** | `~/.claude/skills/` 下存在同名的真实目录（非 symlink） | 蓝色 |

### 用户级 vs 项目级

| 层级 | 路径 | 生效范围 |
|------|------|---------|
| 用户级 | `~/.claude/skills/` | 所有 Claude Code 对话 |
| 项目级 | `<project>/.claude/skills/` | 仅在该项目目录下的对话 |

### Profile

预设的 skill 组合。例如创建一个「Java 开发」Profile，包含 maven-operating、code-review、unit-test-gen 等 skill，一键批量启用。

---

## 3. 界面总览

SkillPilot 采用两栏布局：

```
┌──────────────────────────────────────────────────────┐
│  SkillPilot                               [刷新按钮] │  ← 标题栏
├──────────┬───────────────────────────────────────────┤
│          │                                           │
│ Skills   │                                           │
│ Projects │          主内容区                          │
│ Graph    │     (Skill 卡片 / 详情 /                   │
│ Stats    │      项目 / 图 / 统计)                     │
│ ──────── │                                           │
│ Repos    │                                           │
│  ├ repo1 │                                           │
│  └ repo2 │                                           │
│ Profiles │                                           │
│  └ Java  │                                           │
│ Projects │                                           │
│  └ proj1 │                                           │
│ ──────── │                                           │
│ 1200 skills  42 active  ⚙                            │
└──────────┴───────────────────────────────────────────┘
```

### 侧边栏

- **导航区**（上方）：Skills / Projects / Graph / Stats 四个视图切换
- **Repositories**：按仓库分组显示，点击可过滤主视图
- **Profiles**：Profile 列表，右键/hover 可编辑/应用
- **Projects**：已配置的项目列表
- **Footer**：显示 skill 总数、活跃数、齿轮设置按钮

### 标题栏

- 右上角刷新按钮：重新扫描仓库

---

## 4. 设置 Skill 仓库路径

首次使用或需要更换 skill 仓库时：

1. 点击侧边栏最底部的 **齿轮图标** ⚙
2. 弹出 Settings 窗口，显示当前仓库路径
3. 手动输入路径，或点击 **Browse** 按钮用系统文件选择器选择目录
4. 点击 **Save**

**保存后会自动重新扫描整个仓库**，所有 skill 列表、仓库分组、状态都会刷新。

> 默认路径：`/Users/eamanc/Documents/pe/skills`

---

## 5. 浏览 Skill

### 5.1 Skill 卡片网格

点击侧边栏 **Skills** 进入卡片网格视图。每个卡片显示：
- Skill 名称
- 所属仓库（徽章）
- 简短描述
- 链接状态指示灯（绿=Active，灰=Inactive，橙=Broken）
- 标签

### 5.2 搜索和过滤

网格顶部有搜索栏，支持：
- **关键词搜索**：按名称、描述、标签搜索
- **仓库过滤**：点击侧边栏的仓库名称，只显示该仓库的 skill
- **状态过滤**：按 Active / Inactive / Broken 筛选
- **分组方式**：按仓库（Repo）/ 分类（Category）/ 字母（Alpha）/ 状态（Status）分组

### 5.3 Skill 详情

点击任意卡片进入详情页。顶部有 **Back** 按钮返回。

详情页包含三个 Tab：

**SKILL.md Tab**（默认）：
- 左侧：Markdown 渲染的 SKILL.md 完整内容
- 右侧元信息卡片：
  - Link Status：当前链接状态 + Toggle 开关
  - Tags：标签列表
  - Info：分类、所属仓库、是否有 scripts/references
  - Dependencies：依赖的其他 skill
  - Open in Finder 按钮

**References Tab**（仅当 skill 有 `references/` 目录时显示）：
- 文件列表，显示文件名、大小、图标（按文件类型着色）
- 点击文件查看内容（Markdown 会渲染，代码用等宽字体显示）

**Scripts Tab**（仅当 skill 有 `scripts/` 目录时显示）：
- 同 References，列出 scripts 目录下的文件

---

## 6. 启用和禁用 Skill

### 6.1 通过详情页 Toggle

1. 点击 skill 卡片进入详情页
2. 右侧 **Link Status** 卡片中有一个 Toggle 开关
3. 点击开关：
   - **Inactive → Active**：在 `~/.claude/skills/` 创建 symlink
   - **Active → Inactive**：删除 `~/.claude/skills/` 中的 symlink

### 6.2 Toggle 的实际效果

当你 **启用** 一个名为 `code-review` 的 skill 时，SkillPilot 执行的等效命令：

```bash
ln -s /Users/eamanc/Documents/pe/skills/code-review ~/.claude/skills/code-review
```

当你 **禁用** 它时：

```bash
rm ~/.claude/skills/code-review    # 只删除 symlink，不影响源文件
```

> **安全保证**：SkillPilot 只会删除 symlink（符号链接），不会删除真实目录。如果 `~/.claude/skills/code-review` 是一个真实目录（非 symlink），SkillPilot 会拒绝操作并报错。

### 6.3 通过 Profile 批量启用

详见 [第 8 节 Profile 配置](#8-profile-配置)。

---

## 7. 验证 Skill 链接是否生效

启用/禁用 skill 后，可以通过以下方式验证：

### 7.1 在终端验证

```bash
# 查看所有已链接的 skill
ls -la ~/.claude/skills/

# 输出示例：
# code-review -> /Users/eamanc/Documents/pe/skills/code-review
# maven-operating -> /Users/eamanc/Documents/pe/skills/maven-operating
# brainstorming -> /Users/eamanc/Documents/pe/skills/superpowers/skills/brainstorming
```

```bash
# 检查某个具体 skill 是否链接
ls -la ~/.claude/skills/code-review
# 如果显示 -> 指向的路径，说明已启用
# 如果显示 "No such file or directory"，说明未启用
```

```bash
# 验证 symlink 目标是否有效（不是 broken link）
test -e ~/.claude/skills/code-review && echo "有效" || echo "无效或不存在"
```

```bash
# 查看某个 skill 的 SKILL.md 内容（验证内容正确）
cat ~/.claude/skills/code-review/SKILL.md
```

### 7.2 验证项目级 skill

```bash
# 查看项目级 skill 链接
ls -la /path/to/your/project/.claude/skills/

# 例如：
ls -la ~/Documents/pe/js/my-app/.claude/skills/
```

### 7.3 在 Claude Code 中验证

启动一个新的 Claude Code 对话，然后：

```
# 查看当前加载的 skill 列表
/skills
```

或者问 Claude：
> "你当前加载了哪些 skills？请列出来。"

如果刚刚启用的 skill 出现在列表中，说明链接生效了。

### 7.4 常用排查命令

```bash
# 查找所有 broken 的 symlink（指向不存在的目标）
find ~/.claude/skills/ -maxdepth 1 -type l ! -exec test -e {} \; -print

# 查看 symlink 指向的真实路径
readlink -f ~/.claude/skills/code-review

# 统计已链接的 skill 数量
ls ~/.claude/skills/ | wc -l

# 清理所有 broken link（谨慎使用）
find ~/.claude/skills/ -maxdepth 1 -type l ! -exec test -e {} \; -delete
```

> **提示**：SkillPilot 内置了 "Clean Broken Links" 功能，在统计看板中可以一键清理断链。

---

## 8. Profile 配置

Profile 是一组 skill 的预设组合，方便按场景批量管理。

### 8.1 创建 Profile

1. 侧边栏 **Profiles** 区域，点击 **+** 按钮
2. 填写信息：
   - **Name**：Profile 名称（如 "Java 开发"）
   - **Description**：可选描述
   - **Color**：选择一个颜色标识（8 种预设色）
   - **Skills**：搜索并添加 skill 到该 Profile
3. 点击 **Create** 保存

### 8.2 编辑 Profile

hover 侧边栏的 Profile 项，点击编辑图标。

### 8.3 应用 Profile

点击侧边栏 Profile 项的应用按钮，弹出 Apply Profile 窗口：

**User Level（用户级）**：
- 选择此项，点击 Apply
- 效果：为 Profile 中的所有 skill 在 `~/.claude/skills/` 创建 symlink
- 等效命令（以 Profile 包含 3 个 skill 为例）：

```bash
ln -s /path/to/skills/code-review ~/.claude/skills/code-review
ln -s /path/to/skills/maven-operating ~/.claude/skills/maven-operating
ln -s /path/to/skills/unit-test-gen ~/.claude/skills/unit-test-gen
```

**Project Level（项目级）**：
- 选择此项，从下拉列表选择一个已配置的项目
- 效果：为 Profile 中的所有 skill 在 `<project>/.claude/skills/` 创建 symlink
- 等效命令：

```bash
ln -s /path/to/skills/code-review /path/to/project/.claude/skills/code-review
ln -s /path/to/skills/maven-operating /path/to/project/.claude/skills/maven-operating
```

> **注意**：应用 Profile 不会删除已有的其他 skill 链接，只会追加。如果同名 symlink 已存在，会先删除旧的再创建新的。

### 8.4 Profile 使用场景示例

| Profile | 包含的 Skill | 适用场景 |
|---------|-------------|---------|
| Java 开发 | maven-operating, code-review, unit-test-gen, java-project-init | Java 后端项目 |
| 前端开发 | nextjs-migration, frontend-design, webapp-testing | Web 前端项目 |
| 内容创作 | transcript-summarizer, meeting-minutes, doc-coauthoring | 写作/文档类工作 |
| DevOps | docker-bluegreen-deploy, deploy-test, aliyun-init | 部署运维 |

---

## 9. 项目绑定 (Project Binder)

项目绑定让你为特定项目目录配置专属的 skill 组合。

### 9.1 添加项目

1. 点击侧边栏 **Projects** 进入项目绑定视图
2. 点击右上角 **Add Project**
3. 系统文件选择器弹出，选择一个项目目录
4. 项目卡片出现在列表中

### 9.2 配置项目

点击项目卡片，弹出编辑窗口：

- **Name**：项目显示名称（默认为目录名）
- **Path**：项目路径（只读）
- **Profiles**：点选要应用到该项目的 Profile（可多选）
- **Extra Skills**：搜索添加额外的单独 skill

点击 **Save** 保存配置。

### 9.3 项目级 Skill 的工作方式

配置好项目后，通过 Apply Profile 选择 Project Level 应用：

1. Profile 中的所有 skill 会被 symlink 到 `<project>/.claude/skills/`
2. 当你在该项目目录下使用 Claude Code 时，这些 skill 会被自动加载
3. 项目级 skill 只影响在该目录下的 Claude Code 对话，不影响其他项目

```bash
# 项目级 skill 存储位置示例
~/my-java-project/.claude/skills/
├── code-review -> /Users/.../skills/code-review
├── maven-operating -> /Users/.../skills/maven-operating
└── unit-test-gen -> /Users/.../skills/unit-test-gen
```

### 9.4 用户级 + 项目级叠加

Claude Code 会同时加载用户级和项目级的 skill：
- `~/.claude/skills/` 中的 skill → 所有对话都加载
- `<project>/.claude/skills/` 中的 skill → 仅该项目对话加载

因此推荐做法：
- **通用 skill**（如 brainstorming、code-review）放用户级
- **专业 skill**（如 maven-operating、nextjs-migration）放项目级

---

## 10. 依赖关系图 (Graph)

点击侧边栏 **Graph** 进入依赖关系力导向图。

### 10.1 图的含义

- **节点** = Skill（只显示有依赖关系的 skill）
- **边（箭头）** = 依赖关系（A→B 表示 A 依赖 B）
- **节点颜色** = 所属仓库

### 10.2 颜色图例

图的左上角有 **Repos** 图例，显示每个仓库对应的颜色。颜色通过哈希算法从以下 8 色调色板中分配：

| 颜色 | Hex | 样例仓库 |
|------|-----|---------|
| 靛蓝 | `#5e6ad2` | superpowers |
| 绿色 | `#4cb782` | awesome-claude-skills |
| 琥珀 | `#f2994a` | fenxiang-skills |
| 红色 | `#eb5757` | marketingskills |
| 紫色 | `#a77bca` | baoyu-skills |
| 青色 | `#4da7c9` | 独立 skill |
| 金色 | `#d4a259` | — |
| 灰蓝 | `#7c8ea6` | — |

> 具体颜色由仓库名称的哈希值决定，每次运行一致。

### 10.3 交互

- **拖拽节点**：移动单个节点
- **滚轮缩放**：放大/缩小
- **平移画布**：按住空白处拖动
- **点击节点**：跳转到该 skill 的详情页
- 图会自动缩放以适应所有节点

### 10.4 依赖是怎么发现的？

SkillPilot 通过正则表达式扫描每个 SKILL.md 的内容，匹配如下模式来提取依赖：

```
skill: "skill-name"
invoke "skill-name"
use: "skill-name"
require: "skill-name"
depends: "skill-name"
```

如果图中没有节点，说明仓库中没有 skill 声明了对其他 skill 的依赖。

---

## 11. 统计看板 (Stats)

点击侧边栏 **Stats** 进入统计看板，显示使用统计图表。

统计数据包括：
- **Skill Toggle 次数**：各 skill 被启用/禁用的次数
- **Profile 应用次数**：各 Profile 被应用的次数
- **总扫描次数**：仓库被扫描的次数
- **链接创建/删除总数**
- **断链清理数量**

> 统计数据持久化存储在 `~/.claude-skill-manager/stats.json`。

---

## 12. 底层原理：Symlink 机制

SkillPilot 的核心功能基于 Unix 符号链接（symlink）。理解这一机制有助于排查问题。

### 12.1 什么是 Symlink

符号链接（symbolic link）是文件系统中的一种特殊文件，它指向另一个文件或目录。可以理解为"快捷方式"。

```bash
# 创建 symlink 的基本语法
ln -s <源路径> <链接路径>

# 例如：
ln -s /Users/eamanc/Documents/pe/skills/code-review ~/.claude/skills/code-review
#      ^-- 源（skill 实际所在位置）               ^-- 链接（Claude Code 查找的位置）
```

### 12.2 SkillPilot 执行的操作

**启用 Skill（用户级）**：
```bash
# 1. 确保目标目录存在
mkdir -p ~/.claude/skills/

# 2. 如果已有同名 symlink，先删除
rm -f ~/.claude/skills/code-review   # 只在是 symlink 时才删除

# 3. 创建新的 symlink
ln -s /Users/eamanc/Documents/pe/skills/code-review ~/.claude/skills/code-review
```

**禁用 Skill（用户级）**：
```bash
# 只删除 symlink 本身，源文件不受影响
rm ~/.claude/skills/code-review
```

**启用 Skill（项目级）**：
```bash
mkdir -p /path/to/project/.claude/skills/
ln -s /Users/eamanc/Documents/pe/skills/code-review /path/to/project/.claude/skills/code-review
```

**应用 Profile（批量操作）**：
```bash
# 对 Profile 中的每个 skill 执行：
ln -s /source/skill-1 ~/.claude/skills/skill-1
ln -s /source/skill-2 ~/.claude/skills/skill-2
ln -s /source/skill-3 ~/.claude/skills/skill-3
# ...
```

**清理断链**：
```bash
# 找到并删除所有 broken symlink
find ~/.claude/skills/ -maxdepth 1 -type l ! -exec test -e {} \; -delete
```

### 12.3 安全机制

- **不删除真实目录**：如果 `~/.claude/skills/xxx` 是真实目录（非 symlink），SkillPilot 会拒绝操作
- **不移动/复制文件**：所有操作只涉及 symlink 的创建和删除
- **源文件永远不变**：仓库中的 skill 文件不会被修改

### 12.4 数据存储位置

| 内容 | 路径 |
|------|------|
| Skill 仓库 | 用户配置的路径（默认 `~/Documents/pe/skills/`） |
| 用户级链接 | `~/.claude/skills/` |
| 项目级链接 | `<project>/.claude/skills/` |
| Profile/项目配置 | `~/.claude-skill-manager/` |
| 统计数据 | `~/.claude-skill-manager/stats.json` |
| SkillPilot 应用 | `src-tauri/target/release/bundle/macos/SkillPilot.app` |

---

## 附录：快速验证清单

在 SkillPilot 中操作后，用以下命令逐步验证：

```bash
# 1. 查看当前所有 skill 链接
ls -la ~/.claude/skills/

# 2. 确认某个 skill 已启用
ls -la ~/.claude/skills/<skill-name>
# 应显示：<skill-name> -> /path/to/source

# 3. 确认链接目标有效
test -e ~/.claude/skills/<skill-name> && echo "OK" || echo "BROKEN"

# 4. 查看 skill 内容
cat ~/.claude/skills/<skill-name>/SKILL.md | head -20

# 5. 在 Claude Code 中验证
# 新开一个对话，执行 /skills 或问 Claude 加载了哪些 skill

# 6. 查看项目级 skill
ls -la /path/to/project/.claude/skills/

# 7. 统计链接数量
echo "用户级: $(ls ~/.claude/skills/ 2>/dev/null | wc -l) 个"
echo "项目级: $(ls /path/to/project/.claude/skills/ 2>/dev/null | wc -l) 个"
```
