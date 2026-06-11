# AEON: Agent Evolution & Optimization Network

> **一个能根据对话历史自我进化的 Agent/Skill 系统**
>
> AEON 让 Claude Code 的 skills 和 agents 能够像生物一样进化——从对话中学习，自动优化自身，并在版本控制下安全部署。

---

## 目录

1. [核心概念](#1-核心概念)
2. [系统架构](#2-系统架构)
3. [进化机制](#3-进化机制)
4. [Skill 自主发现与引导](#4-skill-自主发现与引导)
5. [基因组设计](#5-基因组设计)
6. [进化触发器](#6-进化触发器)
7. [验证与部署](#7-验证与部署)
8. [与 Claude Code 的集成](#8-与-claude-code-的集成)
9. [进化示例](#9-进化示例)

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
| **New Skill** | `.claude/skills/*.md` | 从对话中**发现新工作流并引导为 skill** | 将反复执行的部署流程自动创建为 deploy skill |

### 1.3 AEON 的两大能力

| 能力 | 描述 | 方向 |
|------|------|------|
| **🔧 进化 (Evolve)** | 优化**已有**的 skill/agent/memory | 存量改进 |
| **🌱 引导 (Bootstrap)** | 发现**尚未存在**的 skill 并创建 | 增量生长 |

### 1.4 五大设计原则

1. **脚本优先 (Script-First)** — Skills 封装思考，脚本封装执行。封闭世界问题用脚本，开放世界问题用 Skill
2. **观察优于假设** — 所有进化基于真实对话数据，不凭空猜测
3. **如无必要，勿增实体** — 新建 skill 是最后选择。脚本 > Memory > 进化已有 > 新建
4. **渐进优于激进** — 小步快跑，每次只改一个维度，可回滚
5. **人在环中** — 高风险变更需用户确认，低风险变更自动应用

### 1.5 Skill vs Script 的边界

这是 AEON 最核心的架构决策：

| 维度 | Script（脚本） | Skill（技能） |
|------|---------------|---------------|
| **问题类型** | 封闭世界（已知路径、已知结果） | 开放世界（未知突发、需要分析） |
| **本质** | 确定性执行 | LLM 推理引导 |
| **异常处理** | 可枚举（权限/超时/不存在 → 固定消息） | 需要情境判断 |
| **准确度** | 100%（无歧义） | 取决于 model |
| **Token 消耗** | 0 | 每次调用消耗 |
| **示例** | `grep ERROR \| sort \| uniq -c \| sort -rn` | "分析这些错误分布，判断根因" |
| **反例** | ❌ 用 skill 做 grep | ❌ 用脚本做 code review |

---

## 2. 系统架构

AEON 有两条核心链路：

```
┌──────────────────────────────────────────────────────────────────┐
│                         AEON 系统架构                             │
├──────────────────────────────────────────────────────────────────┤
│                                                                   │
│   ┌────────────────── 进化链路 (Evolve) ──────────────────────┐  │
│   │  存量优化：改进已有 skill/agent/memory                    │  │
│   │                                                           │  │
│   │  ┌──────────┐   ┌──────────┐   ┌──────────┐             │  │
│   │  │👁️Observer│──▶│🔍Analyzer│──▶│ 🧬Evolver│             │  │
│   │  └──────────┘   └──────────┘   └──────────┘             │  │
│   └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│   ┌──────────────── 引导链路 (Bootstrap) ─────────────────────┐  │
│   │  增量生长：发现新工作流 → 判断必要性 → 创建 skill          │  │
│   │                                                           │  │
│   │  ┌──────────────┐   ┌──────────────────┐   ┌────────────┐│  │
│   │  │🔎 Workflow   │──▶│⚖️ Necessity      │──▶│🏭 Skill    ││  │
│   │  │  Discoverer  │   │  Evaluator (7关) │   │Bootstrapper││  │
│   │  └──────────────┘   └──────────────────┘   └────────────┘│  │
│   └───────────────────────────────────────────────────────────┘  │
│                                                                   │
│   ┌──────────────────────────────────────────────────────┐       │
│   │                 🧠 Evolution Engine                  │       │
│   │                                                      │       │
│   │  ┌──────────────┐  ┌──────────────┐  ┌────────────┐ │       │
│   │  │ Genome       │  │ Fitness      │  │ Deployment  │ │       │
│   │  │ Manager      │  │ Evaluator    │  │ Manager     │ │       │
│   │  │ 基因组管理器  │  │ 适应度评估器  │  │ 部署管理器  │ │       │
│   │  └──────────────┘  └──────────────┘  └────────────┘ │       │
│   └──────────────────────────────────────────────────────┘       │
│                                                                   │
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

**进化链路 (Evolve)**:
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

**引导链路 (Bootstrap)**:
```
对话历史 ──▶ Workflow Discoverer ──▶ 重复模式列表
                                            │
                                            ▼
                                    Necessity Evaluator
                                    七道关卡逐道检查
                                   G0: 脚本优先? → 🔧 生成脚本
                                            │ NO
                                   G1-G6: 逐道判断
                                            │
                              ┌─────────────┼─────────────┐
                              ▼             ▼             ▼
                          ✅ 全部通过   ⚠️ 部分通过   ❌ 未通过
                              │             │             │
                              ▼             ▼             ▼
                         Skill         进化已有      memory / 不处理
                       Bootstrapper    skill
                              │
                              ▼
                        .claude/skills/
                        新建 skill 文件
                              │
                        .claude/scripts/
                        或生成脚本文件
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

## 4. Skill 自主发现与引导 (Bootstrap)

引导链路是 AEON 的"生长"能力——从对话中**发现尚未存在的 skill**。与进化链路不同，引导链路处理的是"该有但没有"的实体。

### 4.1 核心理念

```
进化链路 (Evolve):  "这个 skill 可以更好吗？"  → 存量改进
引导链路 (Bootstrap): "该有这个 skill 吗？"    → 增量生长
```

**关键约束**: 引导链路由 "如无必要，勿增实体" 原则支配。每条链路必经 6 道关卡。

### 4.2 引导流程

```
对话历史
    │
    ▼
┌─────────────────────────────────────────────┐
│ 🔎 Workflow Discoverer                      │
│ 扫描对话 → 聚类意图 → 提取操作序列 → 过滤噪声  │
│                                              │
│ 输出: 重复模式列表 (pattern_id, core_sequence,│
│       trigger_phrases, stability)            │
└────────────────────┬────────────────────────┘
                     │
                     ▼
┌─────────────────────────────────────────────┐
│ ⚖️ Necessity Evaluator (6道关卡)             │
│                                              │
│  Gate 1: 频率 ≥3次？                         │
│  Gate 2: 步骤已收敛稳定？                     │
│  Gate 3: 输入/输出/触发边界清晰？              │
│  Gate 4: 现有skill不覆盖？                    │
│  Gate 5: 复杂度足够(≥2/4指标)？               │
│  Gate 6: 不会造成路由冲突？                   │
│                                              │
│  任一 NO → 走替代路径 (memory / 进化 / 放弃)   │
│  全部 YES → 交给 Skill Bootstrapper          │
└────────────────────┬────────────────────────┘
                     │ 全部通过
                     ▼
┌─────────────────────────────────────────────┐
│ 🏭 Skill Bootstrapper                       │
│                                              │
│  生成完整 skill 定义:                         │
│  - 命名 (与现有skill不冲突)                   │
│  - 触发描述 (从真实对话提取)                   │
│  - 指令步骤 (从 core_sequence 映射)           │
│  - 工具选择 (只包含实际需要的)                 │
│  - 边界条件 (成功+失败路径)                    │
│  - 元数据 (来源对话、创建时间、版本)            │
│                                              │
│  输出: .claude/skills/<name>.md              │
└─────────────────────────────────────────────┘
```

### 4.3 7 道关卡详解

#### Gate 0: 脚本优先检查 ⭐

```
问题: 这个模式是封闭世界问题（已知路径 + 已知结果 + 异常可枚举）？
通过: 是 → 🔧 生成脚本 + 薄 skill wrapper（绕过后续关卡，直接生成脚本）
失败: 否 → Gate 1（开放世界问题，需要 LLM 推理）

示例:
  "检查所有 .ts 文件是否有 console.log"  → 脚本✅ 输入/输出固定，异常可枚举
  "分析这个错误日志的根因"              → Skill✅ 错误类型不可预知，需推理
  "运行测试并列出失败用例"              → 脚本✅ 结果类型确定
  "根据失败用例推断哪个改动导致的"       → Skill✅ 需要关联代码理解
```

此关卡体现了核心原则：**脚本处理封闭世界，Skill 处理开放世界。**

#### Gate 1: 频率检查

```
问题: 这个模式在最近 50 次对话中出现了 ≥3 次？
通过: 是 → Gate 2
失败: 🗑️ 不处理（不值得为一次性事件创建 skill）
```

#### Gate 2: 稳定性检查

```
问题: 步骤序列已收敛且每次基本一致？
通过: 是 → Gate 3
失败: 📝 创建 memory 记录观察，标记 "evolving"，后续再评估
```

#### Gate 3: 边界检查

```
问题: 触发条件、输入、输出、终止条件都清晰？
通过: 全部满足 → Gate 4
失败: 📝 创建 memory（skill 需要清晰边界，否则会误触发或不完整）
```

#### Gate 4: 重叠检查

```
问题: 现有 skill 无法覆盖此模式的 ≥80%？
通过: 基本无覆盖 → Gate 5
失败: 🔧 进化现有 skill（比新建成本低）
```

#### Gate 5: 复杂度检查

```
复杂度指标（≥2 项满足才通过）:
  □ 涉及 ≥3 个步骤
  □ 需要特定工具组合
  □ 有分支决策逻辑
  □ 输出需要特定格式

通过: ≥2 项 → Gate 6
失败: 📝 创建 memory（简单模式不需要独立 skill）
```

#### Gate 6: 路由冲突检查

```
问题: 新 skill 的触发词与现有 skill 无重叠导致误触发？
通过: 无冲突 → ✅ 交给 Skill Bootstrapper
失败: ⚠️ 调整触发条件或放弃
```

### 4.4 替代路径

不是所有模式都该成为 skill。7 道关卡设计了清晰的替代路径：

| 关卡失败 | 替代路径 | 理由 |
|---------|---------|------|
| G0 (脚本优先) | 生成脚本 + 薄 wrapper | 封闭世界问题 — 脚本更高效准确 |
| G1 (频率) | 不处理 | 不值得为偶发事件抽象 |
| G2 (稳定性) | memory + "evolving" 标签 | 模式还在演化中，过早抽象会误导 |
| G3 (边界) | memory | 边界模糊的模式无法正确定义触发条件 |
| G4 (重叠) | 进化现有 skill | 改比建成本低，且避免重复 |
| G5 (复杂度) | memory | 一句话偏好不需要 50 行的 skill 定义 |
| G6 (路由) | 重新设计触发 | 有歧义的 skill 不如没有 |

### 4.5 与进化链路的协作

两条链路独立但互补：

```
引导链路创建 skill v0.1.0
        │
        ▼
    用户使用 skill
        │
        ▼
进化链路发现改进机会
        │
        ▼
    skill v0.2.0 → v0.3.0 → v1.0.0 ...
```

引导链路负责**从 0 到 1**，进化链路负责**从 1 到 N**。

---

## 5. 基因组设计

### 5.1 Skill 基因组

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

### 5.2 Agent 基因组

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

### 5.3 基因组版本控制

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

## 6. 进化触发器

### 6.1 触发方式

| 触发方式 | 频率 | 适用场景 |
|---------|------|---------|
| **手动** `/evolve` | 用户决定 | 定期维护、重大改进 |
| **对话结束 Hook** | 每次对话后 | 增量学习 |
| **累积阈值** | N 次纠正/bug 后 | 问题驱动的进化 |
| **定时任务** | 每日/每周 | 定期批量优化 |
| **事件驱动** | 特定事件发生时 | 如 "新增3个skill后" |

### 6.2 Hook 配置示例

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

### 6.3 进化模式

| 模式 | 描述 | 自动应用？ | 适用变更 |
|------|------|-----------|---------|
| **incremental** | 小幅改进，低风险 | ✅ 是 | 措辞优化、示例添加 |
| **guided** | 中等变更，需审查 | ⚠️ 建议后暂停 | 策略调整、工具增删 |
| **major** | 重大重构，需确认 | ❌ 否 | 重写指令、改变行为 |
| **experimental** | 实验性进化 | 🔬 A/B 测试 | 新策略、激进优化 |

---

## 7. 验证与部署

### 7.1 适应度评估（Fitness Evaluation）

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

### 7.2 部署策略

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

### 7.3 回滚机制

```bash
# 回滚到上一个版本
/evolve rollback code-review

# 回滚到指定版本
/evolve rollback code-review --version v2.2.0

# 查看回滚历史
/evolve history code-review
```

---

## 8. 与 Claude Code 的集成

### 8.1 集成点

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

### 8.2 命令接口

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

### 8.3 Skill 定义

`/evolve` skill 通过 Skill 工具暴露给 Claude Code。见 [`skills/evolve.md`](skills/evolve.md)。

### 8.4 Evolver Agent 定义

Evolver Agent 是执行进化的核心 Agent。见 [`agents/evolver.md`](agents/evolver.md)。

---

## 9. 进化示例

### 9.1 示例：Code Review Skill 的进化

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

### 9.2 示例：从对话中自动创建 Memory

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

### 9.3 示例：Agent 策略进化

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
