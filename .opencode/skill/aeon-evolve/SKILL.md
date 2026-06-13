---
name: aeon-evolve
description: AEON agent evolution system — analyze conversation history and automatically evolve agents, skills, and workflows. Also discovers new skill opportunities from repeated conversation patterns. Use when the user wants to optimize agents, create skills from conversation patterns, review pending evolutions, or run "/evolve".
version: 1.0.0
---

# AEON — Agent Evolution & Optimization Network

> **让 Agents 和 Skills 从对话中学习并自我进化。**
>
> "如无必要，勿增实体" — 新建 skill 是最后选择。

## 两大能力

| 能力 | 方向 | 描述 |
|------|------|------|
| 🔧 **进化 (Evolve)** | 存量改进 | 优化已有的 agents/skills/memories |
| 🌱 **引导 (Bootstrap)** | 增量生长 | 从对话中发现新 skill 机会 |

## 执行 /evolve 时的工作流

### 进化链路 (Evolve)
1. 调用 `aeon-observer` 扫描对话，提取信号
2. 调用 `aeon-evolver` 对每个改进机会生成进化版本
3. 调用 `aeon-fitness-evaluator` 验证质量
4. 自动应用低风险变更，高风险变更排队等待审查

### 引导链路 (Bootstrap)
1. 调用 `aeon-workflow-discoverer` 发现重复工作流
2. 调用 `aeon-necessity-evaluator` 进行 6 关必要性判断
3. 通过全部 6 关 → 调用 `aeon-skill-bootstrapper` 生成新 skill
4. 未通过 → 走替代路径（AGENTS.md 条目 / 进化现有 agent / 不处理）

## 必要性判断的 6 道关卡

| 关卡 | 问题 | 失败路径 |
|------|------|---------|
| G1 频率 | 最近50次对话出现 ≥3 次？ | 🗑️ 不处理 |
| G2 稳定性 | 步骤序列已收敛？ | 📝 记录 + "evolving" |
| G3 边界 | 触发/输入/输出清晰？ | 📝 AGENTS.md 条目 |
| G4 重叠 | 现有 agent 不覆盖？ | 🔧 进化现有 agent |
| G5 复杂度 | ≥2/4 复杂度指标？ | 📝 AGENTS.md 条目 |
| G6 路由 | 不造成触发冲突？ | ⚠️ 重新设计 |

## Subagents

本 skill 协调以下 subagents（均在 `.opencode/agent/aeon-*.md`）:
- `aeon-observer` — 对话信号提取
- `aeon-evolver` — 进化版本生成
- `aeon-fitness-evaluator` — 质量验证
- `aeon-workflow-discoverer` — 重复模式发现
- `aeon-necessity-evaluator` — 6关必要性判断
- `aeon-skill-bootstrapper` — 新 skill 生成

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
