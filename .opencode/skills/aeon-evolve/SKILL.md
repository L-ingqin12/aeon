---
name: aeon-evolve
description: AEON autonomous agent evolution system. PROACTIVELY suggest running /evolve at session start if (a) last evolution was >2 conversations ago, (b) user has corrected the agent multiple times, or (c) new repeated patterns are detected. Check ~/.config/opencode/aeon/last-check.json for trigger status. Use to optimize agents, create skills from patterns, review evolutions, or run "/evolve".
version: 1.0.0
---

# AEON — Agent Evolution & Optimization Network

> **让 Agents 和 Skills 从对话中学习并自我进化。**
>
> "如无必要，勿增实体" — 新建 skill 是最后选择。

## 自动触发机制 ⭐

**OpenCode 无原生 session hook**，AEON 通过以下方式实现自动触发：

### 方式 1: Skill 主动建议（零配置，推荐）

本 skill 的 description 已包含触发条件。Primary agent 在每次会话**启动时**应：

1. 检查 `~/.config/opencode/aeon/last-check.json` 中的 `last_evolution_at` 时间戳
2. 如果距离上次进化已超过 2 次对话 → **主动建议用户运行 `/evolve`**
3. 如果用户在同一会话中多次纠正 agent → **主动建议运行 `/evolve`**

```
会话开始 → agent 读取 SKILL.md → 检查 last-check.json → 建议 /evolve
```

### 方式 2: 外部调度器（完全自动）

**Windows Task Scheduler**:
```powershell
# 创建每天自动运行 /evolve 的任务
$Action = New-ScheduledTaskAction -Execute "opencode" -Argument "--non-interactive /evolve"
$Trigger = New-ScheduledTaskTrigger -Daily -At "09:00"
Register-ScheduledTask -TaskName "AEON Auto Evolve" -Action $Action -Trigger $Trigger
```

**Linux cron**:
```bash
# 每天 9:00 自动运行
0 9 * * * opencode --non-interactive "/evolve" >> ~/.config/opencode/aeon/cron.log 2>&1
```

### 方式 3: 对话计数触发

每次 `/evolve` 运行时更新 `last-check.json`：

```json
{
  "last_evolution_at": "2026-06-12T09:00:00Z",
  "conversations_since_last": 0,
  "trigger_on_conversation_count": 2,
  "next_check_at": "after 2 more conversations"
}
```

Agent 在新会话开始时读取此文件，对话计数自动递增。

## 三大能力

| 能力 | 方向 | 描述 |
|------|------|------|
| 🔬 **研究 (Research)** | 外部知识注入 | 搜索网络，收集 prompt/tool 最佳实践 |
| 🔧 **进化 (Evolve)** | 存量改进 | 优化已有的 agents/skills/memories |
| 🌱 **引导 (Bootstrap)** | 增量生长 | 发现新 subagent / skill / script 机会 |

## 自主模式

设置 `~/.config/opencode/aeon/aeon.json` 中 `autonomous.enabled = true`：

- **自动触发** — 每 N 次对话后自动运行进化检查
- **跨会话学习** — 分析多个会话间的模式
- **自验证** — 进化后自动回放历史对话验证
- **知识缺口检测** — 发现知识不足时主动搜索或向用户提问 ⭐
- **主动探索** — 根据自身知识需求，主动搜索学习 ⭐
- **交互式提问** — 遇到不确定的情况，向用户确认而非猜测 ⭐
- **文档生成** — 研究结果和进化日志自动归档到 `docs/`

### 交互式决策 ⭐

自主模式下的决策规则：

| 情况 | 行为 |
|------|------|
| 纯技术问题（有客观答案） | 🔬 自己搜索探索 |
| 技术选型有重大 trade-off | ❓ 向用户提问 |
| 用户偏好相关（风格/习惯） | ❓ 向用户提问 |
| 搜索结果矛盾不明确 | ❓ 向用户提供对比，请用户判断 |
| 工具/API 使用方法 | 🔬 自己搜索 |
| 发现两个等效方案 | ❓ 列出对比，请用户选择 |
| 需要确认破坏性变更 | ❓ 必须向用户确认 |

### 自主能力全览 ⭐

| 能力 | 描述 | 触发条件 |
|------|------|---------|
| **自动触发** | 每 2 次对话后自动检查是否需要进化 | 对话结束 |
| **知识缺口检测** | 发现自身知识不足时主动搜索 | Observer 标记 "uncertain" |
| **主动研究** | 定期搜索 prompt/tool/skill 最新实践 | 每周 + 进化前 |
| **跨会话学习** | 30 个会话范围内的模式关联 | 每次 Observe |
| **自验证** | 进化后自动回放历史对话验证 | 每次进化后 |
| **A/B 测试** | 新旧版本并行测试（可选） | 配置启用后 |
| **元进化** | AEON 自己调整阈值、关卡参数 | 从回滚和拒绝中学习 |
| **知识图谱** | 关联跨会话的学习成果 | 自动生成 |
| **回滚学习** | 分析被回滚的进化，避免重复犯错 | 每次回滚后 |
| **交互提问** | 不确定时问用户，确定时自主行动 | 每会话最多 3 问 |

## 执行 /evolve 时的工作流

### Phase 0: Research (知识增强) ⭐
调用 `aeon-researcher` 搜索外部知识（当 `autonomous.research.enabled = true`）

### 进化链路 (Evolve)
1. 调用 `aeon-observer` 扫描对话，提取信号
2. 调用 `aeon-evolver` 对每个改进机会生成进化版本
3. 调用 `aeon-fitness-evaluator` 验证质量
4. 自动应用低风险变更，高风险变更排队等待审查

### 引导链路 (Bootstrap)
1. 调用 `aeon-workflow-discoverer` 发现重复工作流
2. 调用 `aeon-necessity-evaluator` 进行 7 关必要性判断
3. 通过全部 7 关 → 调用 `aeon-skill-bootstrapper` 生成新 skill/脚本
4. 未通过 → 走替代路径（脚本 / AGENTS.md / 进化现有 agent / 不处理）

## 必要性判断的 7 道关卡

| 关卡 | 问题 | 失败路径 |
|------|------|---------|
| **G0 脚本优先** | 封闭世界（已知路径+结果）？ | 🔧 生成脚本 |
| **G0.5 Subagent优先** ⭐ | 需要独立权限/并行/后台？ | 🏭 生成 subagent |
| G1 频率 | 最近50次对话出现 ≥3 次？ | 🗑️ 不处理 |
| G2 稳定性 | 步骤序列已收敛？ | 📝 记录 + "evolving" |
| G3 边界 | 触发/输入/输出清晰？ | 📝 AGENTS.md 条目 |
| G4 重叠 | 现有 agent 不覆盖？ | 🔧 进化现有 agent |
| G5 复杂度 | ≥2/4 复杂度指标？ | 📝 AGENTS.md 条目 |
| G6 路由 | 不造成触发冲突？ | ⚠️ 重新设计 |

## Subagents

本 skill 协调以下 subagents（全局 `~/.config/opencode/agents/aeon-*.md` 或项目 `.opencode/agents/aeon-*.md`）:
- `aeon-observer` — 对话信号提取
- `aeon-evolver` — 进化版本生成
- `aeon-fitness-evaluator` — 质量验证
- `aeon-workflow-discoverer` — 重复模式发现
- `aeon-necessity-evaluator` — 7关必要性判断
- `aeon-skill-bootstrapper` — script/skill 双模式生成

## 配置

**⚠️ AEON 配置独立于 `opencode.json`**，存放在 `~/.config/opencode/aeon/aeon.json`（全局）或 `.opencode/aeon/aeon.json`（项目级）。
不要将 `aeon` 键放入 `opencode.json` — OpenCode schema 不识别自定义字段，会导致模型/agent/skill 全部加载失败。

示例 `.opencode/aeon/aeon.json`：

```json
{
  "auto_evolution": {
    "enabled": true,
    "mode": "incremental",
    "auto_apply": ["prompt_clarify", "example_add", "knowledge_update"],
    "require_review": ["tool_add", "tool_remove", "strategy_inject", "constraint_add"]
  },
  "fitness": {
    "auto_apply_threshold": 0.85,
    "review_threshold": 0.7
  },
  "limits": {
    "max_evolutions_per_day": 5,
    "conversation_lookback": 50
  }
}
```

## Git 审计 ⭐

所有 AEON 操作通过 git 实现完整审计：

- **每个进化一个 commit** — 格式: `aeon(evolve): <entity> — <change>`
- **分支隔离** — 在 `aeon/evolve-*` 分支上进化，验证通过后 merge
- **回滚 = git revert** — 不用自定义逻辑
- **Commit message 含元数据** — entity, mutation, fitness, reason, source

```
git log --oneline --grep="aeon"
a1b2c3d aeon(evolve): code-review — add Security + Performance
e4f5g6h aeon(bootstrap): new skill log-analyzer
i7j8k9l aeon(evolve): plan-agent — architecture-diagram-first
REVERT  aeon(rollback): code-review — revert a1b2c3d (fitness -0.15)
```
