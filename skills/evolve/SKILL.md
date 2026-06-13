---
name: evolve
description: AEON autonomous agent evolution. PROACTIVELY suggest /evolve at session start when (a) last evolution >2 conversations ago, (b) user corrected agent multiple times, or (c) new repeated patterns detected. Check ~/.claude/aeon/last-check.json for trigger status. Use to optimize agents, create skills from patterns, research knowledge, review evolutions, or run "/evolve".
---

# AEON — Agent Evolution & Optimization Network

让 Claude Code 的 Skills 和 Agents 从对话中学习并自我进化。

## 三大能力

| 能力 | 方向 | 描述 |
|------|------|------|
| 🔬 **研究 (Research)** | 外部知识注入 | 搜索网络，收集 prompt/tool 最佳实践 |
| 🔧 **进化 (Evolve)** | 存量改进 | 优化已有的 skills/agents/memories |
| 🌱 **引导 (Bootstrap)** | 增量生长 | 从对话中发现新 skill 机会 |

## 自主模式 ⭐

Claude Code 通过 Stop hook 实现自动触发（已配置在 settings.local.json 中）。每次对话结束后自动运行增量进化。

自主能力：
- **自动触发** — Stop hook 在对话结束时触发
- **跨会话学习** — 分析多个会话间的模式
- **自验证** — 进化后自动回放历史对话验证
- **知识缺口检测** — 发现不足时主动搜索或提问
- **Fan-out 并行** — 多 subagent 并行执行（通过 Workflow pipeline/parallel）
- **交互提问** — 不确定时问用户（最多 3 问/会话）
- **元进化** — 从回滚和拒绝中学习，自动调整阈值

## 核心原则

1. **脚本优先 (Script-First)** — Skills 封装思考，脚本封装执行。封闭世界用脚本，开放世界用 Skill
2. **如无必要，勿增实体** — 新建 skill 是最后选择。脚本 > Memory > 进化已有 > 新建

## 用法

```
/evolve              # 完整进化循环（Evolve + Bootstrap 双链路）
/evolve status       # 查看进化状态
/evolve review       # 审查待处理的进化
/evolve history      # 查看进化历史
```

## 执行 /evolve 时的流程

### 进化链路 (Evolve) — 存量改进
1. **Collect** — 收集对话转录和实体定义（用 Bash/Glob 直接操作，不用 agent）
2. **Observe** — 调用 `~/.claude/agents/aeon/observer.md` 提取信号
3. **Evolve** — 调用 `~/.claude/agents/aeon/evolver.md` 生成进化版本
4. **Validate** — 调用 `~/.claude/agents/aeon/fitness-evaluator.md` 验证质量
5. **Deploy** — 自动应用低风险变更，高风险变更排队等待审查

### 引导链路 (Bootstrap) — 增量生长
1. **Discover** — 调用 `~/.claude/agents/aeon/workflow-discoverer.md` 发现重复工作流
2. **Evaluate Necessity** — 调用 `~/.claude/agents/aeon/necessity-evaluator.md` 进行 7 关判断
3. **Bootstrap** — 通过者调用 `~/.claude/agents/aeon/skill-bootstrapper.md` 生成新 skill/脚本

### 7 道关卡

| 关卡 | 问题 | 失败路径 |
|------|------|---------|
| **G0 脚本优先** ⭐ | 封闭世界（已知路径+结果）？ | 🔧 生成脚本 + 薄 wrapper |
| **G1 频率** | 最近50次对话出现 ≥3 次？ | 🗑️ 不处理 |
| **G2 稳定性** | 步骤序列已收敛？ | 📝 memory + "evolving" |
| **G3 边界** | 触发/输入/输出清晰？ | 📝 memory |
| **G4 重叠** | 现有 skill 不覆盖？ | 🔧 进化现有 skill |
| **G5 复杂度** | ≥2/4 复杂度指标？ | 📝 memory |
| **G6 路由** | 不造成触发冲突？ | ⚠️ 重新设计 |

## 输出格式

进化结束后输出结构化报告：

```
🧬 AEON Evolution Report
══ 进化链路 (Evolve) ══
   ✅ Auto-applied: N
   ⏳ Pending review: N
   ❌ Rejected: N
══ 引导链路 (Bootstrap) ══
   🔧 Scripts: N (封闭世界→确定性执行)
   🏭 Skills: N (开放世界→LLM推理)
   📝 Memory: N
```

## 配置

在 `~/.claude/settings.local.json` 中：

```json
{
  "aeon": {
    "auto_evolution": {
      "enabled": true,
      "mode": "incremental",
      "auto_apply": ["prompt_clarify", "example_add", "knowledge_update"],
      "require_review": ["tool_add", "tool_remove", "strategy_inject"]
    },
    "fitness": {
      "auto_apply_threshold": 0.85
    },
    "limits": {
      "max_evolutions_per_day": 5,
      "conversation_lookback": 50
    }
  }
}
```
