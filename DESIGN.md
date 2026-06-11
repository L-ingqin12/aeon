# AEON: Agent Evolution & Optimization Network

> **一个能根据对话历史自我进化的 Agent/Skill 系统**
>
> AEON 让 Claude Code 的 skills 和 agents 能够像生物一样进化——从对话中学习，自动优化自身，并在版本控制下安全部署。

---

## 目录

1. [核心概念](#1-核心概念)
2. [系统架构](#2-系统架构)
3. [进化机制](#3-进化机制)
4. [基因组设计](#4-基因组设计)
5. [进化触发器](#5-进化触发器)
6. [验证与部署](#6-验证与部署)
7. [与 Claude Code 的集成](#7-与-claude-code-的集成)
8. [进化示例](#8-进化示例)

---

## 1. 核心概念

### 1.1 什么是 AEON？

AEON 是一个**元级 Agent 系统**，它不直接解决用户问题，而是**优化那些解决问题的 Agent**。它回答的问题是：

> *"基于我们所有的对话历史，我的 skills 和 agents 应该如何改进？"*

### 1.2 可进化的实体

| 实体类型 | 存储位置 | 进化内容 | 示例 |
|---------|---------|---------|------|
| **Skill** | `.claude/skills/*.md` | 指令、触发条件、工具选择 | 优化 code-review skill 的检查维度 |
| **Agent** | `agents/*.md` | 系统提示、策略模式、工具集 | 让 plan agent 更擅长架构权衡 |
| **Memory** | `memory/*.md` | 事实内容、置信度、关联 | 精炼用户偏好描述 |
| **CLAUDE.md** | `CLAUDE.md` | 项目指令、约定 | 添加新发现的项目规范 |
| **Hook** | `settings.json` | 自动触发规则 | 调整何时自动运行测试 |
| **Workflow** | `.claude/workflows/*.js` | 编排策略、并行度 | 优化 fan-out 策略 |

### 1.3 三大设计原则

1. **观察优于假设** — 所有进化基于真实对话数据，不凭空猜测
2. **渐进优于激进** — 小步快跑，每次只改一个维度，可回滚
3. **人在环中** — 高风险变更需用户确认，低风险变更自动应用

---

## 2. 系统架构

```
┌──────────────────────────────────────────────────────────────────┐
│                         AEON 系统架构                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌─────────────┐     ┌─────────────┐     ┌─────────────┐        │
│   │  👁️ Observer │────▶│  🔍 Analyzer │────▶│  🧬 Evolver  │        │
│   │  观察者Agent │     │  分析者Agent │     │  进化者Agent │        │
│   └──────┬──────┘     └──────┬──────┘     └──────┬──────┘        │
│          │                   │                   │                │
│          ▼                   ▼                   ▼                │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                 🧠 Evolution Engine                  │       │
│   │                                                      │       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │       │
│   │  │ Genome       │  │ Fitness      │  │ Deployment  │ │       │
│   │  │ Manager      │  │ Evaluator    │  │ Manager     │ │       │
│   │  │ 基因组管理器  │  │ 适应度评估器  │  │ 部署管理器  │ │       │
│   │  └──────┬───────┘  └──────┬───────┘  └──────┬─────┘ │       │
│   └─────────┼─────────────────┼─────────────────┼───────┘       │
│             │                 │                 │                │
│             ▼                 ▼                 ▼                │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                  💾 Storage Layer                    │       │
│   │                                                      │       │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │       │
│   │  │ Memory   │  │ Skills   │  │ Evolution        │   │       │
│   │  │ Store    │  │ Store    │  │ History (Git)    │   │       │
│   │  └──────────┘  └──────────┘  └──────────────────┘   │       │
│   └──────────────────────────────────────────────────────┘       │
│                                                                   │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                 🔗 Integration Layer                 │       │
│   │                                                      │       │
│   │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │       │
│   │  │ /evolve  │  │ Hooks    │  │ CLI              │   │       │
│   │  │ Skill    │  │ 自动触发  │  │ 命令行           │   │       │
│   │  └──────────┘  └──────────┘  └──────────────────┘   │       │
│   └──────────────────────────────────────────────────────┘       │
│                                                                   │
└──────────────────────────────────────────────────────────────────┘
```

### 2.1 数据流

```
对话历史 ──▶ Observer ──▶ 结构化观察 ──▶ Analyzer ──▶ 改进建议
                                                          │
                    ┌─────────────────────────────────────┘
                    ▼
              Evolver ──▶ 变异后的基因组 ──▶ Fitness Evaluator
                                                    │
                    ┌───────────────────────────────┘
                    ▼
              通过？──▶ Deployment Manager ──▶ Git Commit
                    │                              │
                    ▼                              ▼
              放弃/重试                    更新后的 Skill/Agent
```

---

## 3. 进化机制

### 3.1 进化循环

```
┌────────────────────────────────────────────────────┐
│                  Evolution Cycle                    │
├────────────────────────────────────────────────────┤
│                                                     │
│   Trigger ──▶ Observe ──▶ Analyze ──▶ Generate     │
│      ▲                                       │      │
│      │                                       ▼      │
│      └──────────── Deploy ◀── Validate ◀─────┘      │
│                                                     │
│   每一轮进化都是一个完整的 O-A-G-V-D 循环              │
│                                                     │
└────────────────────────────────────────────────────┘
```

### 3.2 观察（Observe）— 从对话中提取信号

Observer Agent 扫描对话转录，提取以下信号：

```yaml
signals:
  # 用户纠正信号
  corrections:
    - pattern: "不，应该用 X 而不是 Y"
      signal: tool_preference
      strength: 0.9
    - pattern: "以后都这样做"
      signal: permanent_preference
      strength: 1.0

  # 成功模式
  success_patterns:
    - pattern: "完美，这正是我想要的"
      signal: approach_validated
      strength: 0.8
    - pattern: task_completed_without_correction
      signal: implicit_success
      strength: 0.5

  # 失败模式
  failure_patterns:
    - pattern: agent_tool_error_repeated
      signal: tool_misconfiguration
      strength: 0.7
    - pattern: user_had_to_repeat_instruction
      signal: instruction_clarity_issue
      strength: 0.6

  # 隐式偏好
  implicit_preferences:
    - pattern: user_always_chooses_option_A
      signal: default_preference
      strength: 0.4
    - pattern: user_skips_confirmation_for_X
      signal: trust_established
      strength: 0.5
```

### 3.3 分析（Analyze）— 识别改进机会

Analyzer Agent 将观察信号转化为具体的改进建议：

```yaml
improvement_opportunities:
  - id: "opt-001"
    target: "code-review-skill"
    type: "prompt_refinement"
    signal_source: ["correction-12", "correction-15", "failure-3"]
    description: "用户连续3次要求同时检查性能问题，但 skill 指令未涵盖"
    suggested_action: "在 code-review skill 中增加性能检查维度"
    confidence: 0.85
    impact: "medium"

  - id: "opt-002"
    target: "plan-agent"
    type: "strategy_update"
    signal_source: ["success-7", "success-8", "success-11"]
    description: "当用户询问架构问题时，先画图再列步骤的成功率100%"
    suggested_action: "在 plan agent 的系统提示中加入 '优先使用图表' 策略"
    confidence: 0.92
    impact: "high"

  - id: "opt-003"
    target: "memory:user-preference"
    type: "knowledge_refinement"
    signal_source: ["correction-4", "implicit-2"]
    description: "用户偏好的测试框架已从 Jest 变为 Vitest"
    suggested_action: "更新 memory 中的测试框架偏好"
    confidence: 0.78
    impact: "low"
```

### 3.4 生成（Generate）— 创建进化版本

Evolver Agent 生成改进后的实体版本：

**变异算子（Mutation Operators）：**

| 算子 | 适用目标 | 描述 | 示例 |
|------|---------|------|------|
| `prompt_clarify` | Skill, Agent | 增加具体指令和示例 | 添加 "同时检查性能影响" |
| `tool_add` | Agent | 添加缺失的工具 | 给 review agent 加 WebSearch |
| `tool_remove` | Agent | 移除不用的工具 | 移除从未成功调用的工具 |
| `strategy_inject` | Agent | 注入成功策略模式 | "优先使用 pipeline() 而非 parallel()" |
| `trigger_tune` | Skill | 调整触发条件 | 降低触发阈值 |
| `knowledge_update` | Memory | 更新过时的事实 | 更新技术栈偏好 |
| `example_add` | Skill, Agent | 添加成功案例 | 将成功的对话作为 few-shot 示例 |
| `constraint_add` | Skill, Agent | 添加约束规则 | "不要在使用A的同时使用B" |

---

## 4. 基因组设计

### 4.1 Skill 基因组

```json
{
  "genome_type": "skill",
  "entity_id": "code-review",
  "version": "v2.3.1",
  "generation": 7,
  "lineage": ["v1.0.0", "v1.2.0", "v2.0.0", "v2.3.0"],
  "chromosomes": {
    "name": {
      "value": "code-review",
      "mutable": true,
      "mutation_history": ["review-pr → code-review (gen-3)"]
    },
    "description": {
      "value": "Code review a pull request with multi-dimensional analysis",
      "mutable": true
    },
    "triggers": {
      "value": ["code review", "review PR", "review this", "check the code"],
      "mutable": true,
      "expansion_strategy": "semantic_clustering"
    },
    "instructions": {
      "value": "Review code for: correctness, security, performance, readability...",
      "mutable": true,
      "mutation_rate": 0.3
    },
    "tools": {
      "value": ["Read", "Bash", "Grep", "LSP"],
      "mutable": true
    },
    "model_preference": {
      "value": "sonnet",
      "mutable": true
    },
    "strategy_patterns": {
      "value": ["adversarial_verify", "multi_dimension_check"],
      "mutable": true
    }
  },
  "fitness": {
    "overall_score": 0.87,
    "success_rate": 0.92,
    "user_satisfaction": 0.85,
    "correction_frequency": 0.08,
    "last_evaluated": "2026-06-11T10:00:00Z"
  },
  "metadata": {
    "created": "2026-05-01",
    "last_evolved": "2026-06-10",
    "total_mutations": 12,
    "survived_mutations": 7,
    "reverted_mutations": 3,
    "rejected_mutations": 2
  }
}
```

### 4.2 Agent 基因组

```json
{
  "genome_type": "agent",
  "entity_id": "plan-agent",
  "version": "v3.1.0",
  "generation": 9,
  "chromosomes": {
    "system_prompt": {
      "value": "You are a software architect agent...",
      "mutable": true,
      "mutation_rate": 0.4
    },
    "tool_set": {
      "value": ["Read", "Glob", "Grep", "LSP", "AskUserQuestion"],
      "mutable": true
    },
    "decision_framework": {
      "value": "trade_off_analysis",
      "mutable": true
    },
    "output_format": {
      "value": "structured_plan_with_alternatives",
      "mutable": false
    },
    "persona": {
      "value": "experienced_architect",
      "mutable": true
    }
  },
  "fitness": {
    "overall_score": 0.91,
    "plan_acceptance_rate": 0.88,
    "implementation_success_rate": 0.94,
    "user_modifications_required": 0.12
  }
}
```

### 4.3 基因组版本控制

```
每个基因组的每次变异都会产生一个新的 Git commit：

  git log --oneline genomes/code-review-skill.json

  a1b2c3d  gen-7: prompt_clarify → 增加安全性检查维度
  e4f5g6h  gen-6: trigger_tune → 降低触发阈值到0.6
  i7j8k9l  gen-5: REVERTED — performance impact negative
  m0n1o2p  gen-4: example_add → 添加SQL注入检查示例
  ...
```

---

## 5. 进化触发器

### 5.1 触发方式

| 触发方式 | 频率 | 适用场景 |
|---------|------|---------|
| **手动** `/evolve` | 用户决定 | 定期维护、重大改进 |
| **对话结束 Hook** | 每次对话后 | 增量学习 |
| **累积阈值** | N 次纠正/bug 后 | 问题驱动的进化 |
| **定时任务** | 每日/每周 | 定期批量优化 |
| **事件驱动** | 特定事件发生时 | 如 "新增3个skill后" |

### 5.2 Hook 配置示例

```json
{
  "hooks": {
    "Stop": [
      {
        "matcher": "user_initiated",
        "command": "claude --skill evolve --auto --mode incremental"
      }
    ],
    "PostToolUse": [
      {
        "matcher": "Edit",
        "command": "claude --internal-note 'code_change_detected'"
      }
    ]
  }
}
```

### 5.3 进化模式

| 模式 | 描述 | 自动应用？ | 适用变更 |
|------|------|-----------|---------|
| **incremental** | 小幅改进，低风险 | ✅ 是 | 措辞优化、示例添加 |
| **guided** | 中等变更，需审查 | ⚠️ 建议后暂停 | 策略调整、工具增删 |
| **major** | 重大重构，需确认 | ❌ 否 | 重写指令、改变行为 |
| **experimental** | 实验性进化 | 🔬 A/B 测试 | 新策略、激进优化 |

---

## 6. 验证与部署

### 6.1 适应度评估（Fitness Evaluation）

```
进化后的 Agent/Skill 必须通过以下评估才能部署：

  ┌─────────────────────────────────────────┐
  │         Fitness Evaluation Pipeline      │
  ├─────────────────────────────────────────┤
  │                                          │
  │  1. Regression Test                      │
  │     └─ 在历史对话上回放，结果不应变差      │
  │                                          │
  │  2. Adversarial Test                     │
  │     └─ 对抗性 Agent 尝试找出新版本的弱点   │
  │                                          │
  │  3. Consistency Check                    │
  │     └─ 与相关 Skill/Agent 的一致性检查     │
  │                                          │
  │  4. Human Review (conditional)           │
  │     └─ 高风险变更需要用户确认              │
  │                                          │
  │  5. Canary Deployment (conditional)      │
  │     └─ 先在20%的场景中测试，逐步推广       │
  │                                          │
  └─────────────────────────────────────────┘
```

### 6.2 部署策略

```
部署流程：

  生成进化版本
      │
      ▼
  创建新分支 (evolve/code-review-gen-8)
      │
      ▼
  运行适应度评估
      │
      ├── 通过 ──▶ 自动合并 (incremental)
      │              │
      │              ▼
      │           更新基因组版本号
      │              │
      │              ▼
      │           Git tag v2.4.0
      │
      ├── 部分通过 ──▶ 创建 PR (guided)
      │                  │
      │                  ▼
      │               用户审查
      │                  │
      │               ├── 批准 ──▶ 合并
      │               └── 拒绝 ──▶ 记录拒绝原因，用于未来进化
      │
      └── 未通过 ──▶ 记录失败原因 ──▶ 放弃此变异
```

### 6.3 回滚机制

```bash
# 回滚到上一个版本
/evolve rollback code-review

# 回滚到指定版本
/evolve rollback code-review --version v2.2.0

# 查看回滚历史
/evolve history code-review
```

---

## 7. 与 Claude Code 的集成

### 7.1 集成点

```
Claude Code 生态系统中的 AEON 位置：

  ┌────────────────────────────────────────────┐
  │              Claude Code                    │
  │                                            │
  │  ┌──────────┐  ┌──────────┐  ┌──────────┐ │
  │  │ Skills   │  │ Agents   │  │ Workflows│ │
  │  └────┬─────┘  └────┬─────┘  └────┬─────┘ │
  │       │             │             │        │
  │       └──────────┬──┴─────────────┘        │
  │                  │                         │
  │           ┌──────▼──────┐                  │
  │           │    AEON     │                  │
  │           │  Evolution  │                  │
  │           │   Engine    │                  │
  │           └──────┬──────┘                  │
  │                  │                         │
  │           ┌──────▼──────┐                  │
  │           │   Memory    │                  │
  │           │   System    │                  │
  │           └─────────────┘                  │
  └────────────────────────────────────────────┘
```

### 7.2 命令接口

```bash
# 触发完整进化循环
/evolve

# 进化特定 skill
/evolve skill code-review

# 进化特定 agent
/evolve agent plan

# 查看进化状态
/evolve status

# 审查待处理的进化
/evolve review

# 回滚
/evolve rollback <entity>

# 查看进化历史
/evolve history [entity]

# 设置进化模式
/evolve config --auto-mode incremental
```

### 7.3 Skill 定义

`/evolve` skill 通过 Skill 工具暴露给 Claude Code。见 [`skills/evolve.md`](skills/evolve.md)。

### 7.4 Evolver Agent 定义

Evolver Agent 是执行进化的核心 Agent。见 [`agents/evolver.md`](agents/evolver.md)。

---

## 8. 进化示例

### 8.1 示例：Code Review Skill 的进化

**初始版本 (v1.0.0)**:
```markdown
# code-review
Review code for bugs and issues.
```

**对话历史触发进化**:
```
用户: "review this PR"
Claude: [检查了正确性和安全性]
用户: "你漏了性能问题，这个查询在大数据量下会很慢"
Claude: [补充了性能分析]
用户: "以后 review 的时候，性能和安全性都要检查"
```

**Observer 提取信号**:
- `correction`: 遗漏性能检查
- `permanent_preference`: review 时需同时检查正确性、安全性、性能

**Evolver 生成 v2.0.0**:
```markdown
# code-review
Review code across multiple dimensions:
1. **Correctness** — logic errors, edge cases, type safety
2. **Security** — injection, auth, data exposure
3. **Performance** — query efficiency, memory, algorithmic complexity
4. **Maintainability** — readability, DRY, SOLID principles
```

**适应度评估**: 在历史 PR review 对话上回放，覆盖率从 60% → 95%
**部署**: 自动应用 (incremental 模式)

### 8.2 示例：从对话中自动创建 Memory

```
用户: "我们的 API 都使用 REST，不要用 GraphQL"
Claude: "好的，记住了。"
---
→ Observer 检测到 "permanent_preference" 信号
→ Evolver 自动创建 memory:

---
name: api-architecture-preference
description: API 架构偏好 — REST over GraphQL
metadata:
  type: user
  confidence: 0.95
  source: conversation-2026-06-11
---

用户明确要求所有 API 使用 REST 风格，不使用 GraphQL。
**Why:** 用户/团队的技术栈偏好。
**How to apply:** 设计或建议 API 方案时，默认使用 REST。
```

### 8.3 示例：Agent 策略进化

```
初始 Plan Agent:
  "分析需求，列出实现步骤"
  
↓ 多轮对话后，Observer 发现成功的 plan 都有架构图

进化后 Plan Agent:
  "1. 先绘制架构图（ASCII或Mermaid）
   2. 标注关键决策点
   3. 列出实现步骤及依赖关系
   4. 对每个决策提供至少一个替代方案"
```

---

## 附录 A：进化信号完整列表

| 信号类别 | 信号名称 | 强度 | 描述 |
|---------|---------|------|------|
| 纠正 | `explicit_correction` | 0.9 | 用户明确说"不对"、"应该是" |
| 纠正 | `missing_dimension` | 0.7 | 用户指出遗漏的方面 |
| 纠正 | `wrong_tool_choice` | 0.8 | 用户说"用X工具而不是Y" |
| 成功 | `explicit_praise` | 0.8 | 用户说"完美"、"很好" |
| 成功 | `task_completed_clean` | 0.5 | 无纠正地完成任务 |
| 成功 | `user_forwarded_result` | 0.6 | 用户直接使用了输出 |
| 偏好 | `format_preference` | 0.6 | 用户偏好特定输出格式 |
| 偏好 | `tool_preference` | 0.6 | 用户偏好特定工具 |
| 偏好 | `style_preference` | 0.4 | 用户偏好特定代码风格 |
| 失败 | `tool_error` | 0.7 | 工具调用出错 |
| 失败 | `stuck_loop` | 0.9 | Agent 陷入循环 |
| 失败 | `incomplete_output` | 0.6 | 输出不完整或被截断 |

## 附录 B：安全与限制

1. **沙箱执行** — 进化在隔离的 Git worktree 中进行
2. **变更审计** — 所有进化都记录在 Git 历史中
3. **人工把关** — high-impact 变更需要用户确认
4. **渐进推广** — 重大变更支持金丝雀部署
5. **自动回滚** — 适应度下降超过 10% 自动回滚
6. **速率限制** — 每24小时最多 3 次 major 模式进化

---

*AEON — Let your agents grow with every conversation.*
