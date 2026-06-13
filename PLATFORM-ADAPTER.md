# AEON 跨平台适配指南

AEON 的架构设计是平台无关的。本文档说明如何将 AEON 适配到不同的 AI Coding Agent 平台。

## 当前支持的平台

| 平台 | 适配状态 | 入口 |
|------|---------|------|
| **Claude Code** | ✅ 原生 | `skills/evolve.md` + `agents/*.md` |
| **OpenCode + oh-my-openagent** | ✅ 已适配 | `.opencode/agent/` + `.opencode/command/evolve.md` |

---

## 平台差异总览

| 概念 | Claude Code | OpenCode |
|------|------------|----------|
| **Agent 定义** | 系统提示字符串 | `.opencode/agent/*.md` + YAML frontmatter |
| **Agent 调用方式** | `Agent` tool + `subagent_type` | Primary agent 通过 `delegate_task` 调用 subagent |
| **Agent 权限** | 无声明式权限 | YAML frontmatter `permission:` + `tools:` |
| **Skill 定义** | `.claude/skills/<name>.md` (flat) | `.opencode/skill/<name>/SKILL.md` (subdirectory) |
| **Skill 发现** | `Skill` tool 自动路由 | System prompt injection + `/command` |
| **触发机制** | Hooks (settings.json) | Commands (.opencode/command/) + Plugins |
| **Memory** | `memory/*.md` 文件持久化 | Context cache + `AGENTS.md` |
| **Workflow** | Workflow tool (JS script) | 无原生支持 → 用 sequential delegate_task |
| **配置** | settings.json (.claude/) | opencode.json (仅标准字段) + .opencode/aeon/config.json (AEON 独立配置) |

---

## AEON Agent 在 OpenCode 中的注册

### 文件位置

每个 AEON agent 放在 `.opencode/agent/aeon-<name>.md`：

```
.opencode/agent/
├── aeon-observer.md              # 对话信号提取
├── aeon-evolver.md               # 进化版本生成
├── aeon-fitness-evaluator.md     # 质量验证
├── aeon-workflow-discoverer.md   # 重复模式发现
├── aeon-necessity-evaluator.md   # 6关必要性判断
└── aeon-skill-bootstrapper.md    # 新 skill 生成
```

### 关键 YAML Frontmatter 字段

```yaml
---
description: "一句话描述 agent 的用途"
mode: subagent              # 关键！设为 subagent 才能被 delegate_task 调用
tools:                      # 白名单：只声明需要的工具
  read: true
  write: true               # 只有需要在磁盘上创建设置写权限
  grep: true
permission:                 # 权限策略
  write: allow              # allow | deny | ask
  edit: allow
---
# Markdown body = agent 的 system prompt
```

### 权限设计原则

| Agent | write/edit | 原因 |
|-------|-----------|------|
| observer | deny | 只读扫描，不修改任何文件 |
| evolver | allow | 需要写入进化后的 entity 定义 |
| fitness-evaluator | deny | 只评估质量，不修改 |
| workflow-discoverer | deny | 只读扫描 |
| necessity-evaluator | deny | 只做判断 |
| skill-bootstrapper | allow | 需要创建新的 skill 文件 |

---

## /evolve 的调用链

在 OpenCode 中，`/evolve` 是一个 Command（`.opencode/command/evolve.md`）。

```
用户输入 /evolve
        │
        ▼
oh-my-openagent Primary Agent (Sisyphus/Prometheus/...)
  读取 .opencode/command/evolve.md
  理解执行流程
        │
        ▼
  delegate_task → aeon-observer (收集数据+提取信号)
        │
        ├─→ delegate_task → aeon-evolver × N (每个改进机会)
        │        │
        │        └─→ delegate_task → aeon-fitness-evaluator (验证)
        │
        ├─→ delegate_task → aeon-workflow-discoverer (发现新模式)
        │        │
        │        └─→ delegate_task → aeon-necessity-evaluator × N (6关判断)
        │                │
        │                └─→ delegate_task → aeon-skill-bootstrapper (通过者)
        │
        ▼
  汇总报告 → 展示给用户
```

### 与 Claude Code 的关键区别

| 步骤 | Claude Code | OpenCode |
|------|------------|----------|
| 编排 | Workflow script (JS) | Primary agent 手动编排 |
| 并行 | parallel() / pipeline() | 无原生支持，串行调用 |
| 结构化输出 | schema 参数强制 JSON | 在 prompt 中要求 JSON 格式 |
| 回滚 | Git commit | Git commit（手动） |

---

## Memory 适配

Claude Code 的 memory 文件系统 (`memory/*.md`) 在 OpenCode 中无直接等价物。替代方案：

### 方案 1: AGENTS.md 集成
将 AEON 的学习成果追加到 `AGENTS.md`：
```markdown
## AEON Learned Preferences (auto-generated)
- 用户偏好 REST over GraphQL (confidence: 0.95, source: 2026-06-11)
- 部署前必须运行 migration (confidence: 0.90, source: 2026-06-10)
```

### 方案 2: Skill 资源文件
在 `.opencode/skill/aeon-evolve/` 下维护学习到的偏好：
```
.opencode/skill/aeon-evolve/
├── SKILL.md
├── learned-preferences.md
└── evolution-history.jsonl
```

### 方案 3: 专用 memory 目录
创建 `.opencode/aeon/memory/` 目录，保持与 Claude Code 相同的格式：
```
.opencode/aeon/memory/
├── api-architecture-preference.md
├── deployment-workflow.md
└── ...
```

---

## 路径速查

| 平台 | 全局根目录 | Agent 路径 | Skill 路径 | 配置路径 |
|------|-----------|-----------|-----------|---------|
| **Linux/Mac** | `~/.opencode/` | `~/.opencode/agent/` | `~/.opencode/skill/` | `~/.opencode/aeon/config.json` |
| **Windows** | `%USERPROFILE%\\.opencode\\` | `%USERPROFILE%\\.opencode\\agent\\` | `%USERPROFILE%\\.opencode\\skill\\` | `%USERPROFILE%\\.opencode\\aeon\\config.json` |

---

## 安装指南

### Linux/Mac

```bash
# 1. 克隆 AEON
git clone https://github.com/L-ingqin12/aeon.git /tmp/aeon-install

# 2. 复制 agent 定义
cp /tmp/aeon-install/.opencode/agent/aeon-*.md .opencode/agent/

# 3. 复制 command
cp /tmp/aeon-install/.opencode/command/evolve.md .opencode/command/

# 4. 复制 skill
cp -r /tmp/aeon-install/.opencode/skill/aeon-evolve .opencode/skill/

# 5. 复制 AEON 独立配置（⚠️ 不要合并到 opencode.json！自定义键会导致 OpenCode schema 校验失败）
cp /tmp/aeon-install/.opencode/aeon/config.json .opencode/aeon/config.json

# 6. 如果你还没有 opencode.json，复制模板：
cp /tmp/aeon-install/opencode.json .opencode/opencode.json

# 7. 初始化 AEON 存储
mkdir -p .opencode/aeon/{genomes,memory}
echo '[]' > .opencode/aeon/evolution-history.jsonl

# 7. 重启 OpenCode
# agent 和 skill 会在启动时自动发现
```

### Windows

```powershell
# 一键安装
git clone --depth 1 --branch opencode https://github.com/L-ingqin12/aeon.git $env:TEMP\aeon
powershell -ExecutionPolicy Bypass -File $env:TEMP\aeon\deploy\install-opencode-windows.ps1
```

或手动安装，详见 [`deploy/WINDOWS-GUIDE.md`](deploy/WINDOWS-GUIDE.md)。

### 验证安装

在 OpenCode 中输入 `/evolve`，应触发 AEON 进化循环。

---

## 新增平台适配

要适配新平台（如 Codex CLI、Gemini CLI、Aider），需要：

1. **Agent 注册**: 将该平台的 agent 定义格式应用于 AEON 的 6 个 agent
2. **Skill/Command 注册**: 将 `/evolve` 注册为该平台的触发方式
3. **Memory 映射**: 将该平台的持久化机制映射为 AEON 的 memory 存储
4. **编排适配**: 将该平台的编排机制映射为 AEON 的双链路流程
5. **配置映射**: 将 AEON 配置映射为该平台的配置格式

核心架构（DESIGN.md）无需修改——它是平台无关的。
