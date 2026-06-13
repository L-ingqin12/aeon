---
description: Trigger AEON evolution cycle — analyze conversations, evolve existing agents/skills, discover new skill opportunities, and research web knowledge for improvements
mode: all
---

# /evolve — AEON Evolution Command

触发 AEON 进化循环。分析对话历史，研究外部知识，优化已有 agents/skills，发现新 skill 机会。

## 用法

```
/evolve                  # 完整进化循环（Research + Evolve + Bootstrap）
/evolve auto             # 自主模式：自动触发、跨会话学习、自验证
/evolve research <topic> # 搜索网络知识并生成参考文档
/evolve status           # 查看进化状态
/evolve review           # 审查待处理的进化
/evolve history          # 查看进化历史
/evolve rollback N       # 回滚到指定版本
/evolve docs             # 查看 AEON 生成的参考文档
```

## 执行流程

### Phase 0: Research (知识增强) ⭐ 新增
如果 `autonomous.research.enabled = true`，在进化前调用 `aeon-researcher` 搜索相关知识：
- 搜索 prompt engineering 最佳实践
- 搜索工具使用模式优化
- 搜索类似问题的社区解决方案
- 结果保存到 `docs/research/` 供后续参考

### Phase 1: Collect
收集对话转录和实体定义（确定性操作，零 agent 调用）。

### Phase 2: Observe (进化链路)
调用 `aeon-observer` subagent 提取信号：
- 用户纠正模式
- 成功/失败模式
- 隐含偏好
- 跨会话学习（`autonomous.cross_session.enabled`）

### Phase 3: Evolve
对每个改进机会，调用 `aeon-evolver` subagent 生成进化版本。
研究结果作为上下文注入 evolver。

### Phase 4: Validate (自验证)
调用 `aeon-fitness-evaluator` subagent 进行质量验证：
- 回归测试（历史对话回放）
- 对抗性验证
- 一致性检查
当 `autonomous.self_validation.enabled = true`，自动执行全部验证。

### Phase 5: Discover (引导链路)
调用 `aeon-workflow-discoverer` subagent 发现重复工作流模式。

### Phase 6: Evaluate Necessity
对每个发现的模式，调用 `aeon-necessity-evaluator` subagent 进行 7 关判断。

### Phase 7: Bootstrap
对通过 7 关的模式，调用 `aeon-skill-bootstrapper` subagent 生成新 skill/脚本。

### Phase 8: Report & Docs
- 生成结构化进化报告
- 自动生成参考文档到 `docs/references/`

## 自主模式 (`/evolve auto`)

启用后 AEON 会以最大并行度自主运行：

```
┌─ Research Phase ─────────────────────────────────────┐
│  aeon-researcher ×3 (并行)                            │
│  ├─ Topic A: prompt patterns                         │
│  ├─ Topic B: tool optimization                       │
│  └─ Topic C: skill design                            │
└──────────────────────────────────────────────────────┘
                        ↓
┌─ Observe Phase ──────────────────────────────────────┐
│  aeon-observer ×2 (并行)                              │
│  ├─ 对话信号提取                                      │
│  └─ 跨会话模式分析                                    │
└──────────────────────────────────────────────────────┘
                        ↓
┌─ Evolve Phase ───────────────────────────────────────┐
│  aeon-evolver ×3 (并行)                               │
│  ├─ Candidate A: prompt_clarify                      │
│  ├─ Candidate B: strategy_inject                     │
│  └─ Candidate C: tool_add                            │
└──────────────────────────────────────────────────────┘
                        ↓
┌─ Validate Phase ─────────────────────────────────────┐
│  aeon-fitness-evaluator ×2 (并行)                     │
│  ├─ 回归测试                                          │
│  └─ 对抗性验证                                        │
└──────────────────────────────────────────────────────┘
                        ↓
                    Report + Docs
```

### 自主能力清单

| 能力 | 并发度 | 触发条件 |
|------|--------|---------|
| 🔬 主动研究 | ×3 | 每周 + 进化前 + 知识缺口检测 |
| 👁️ 信号观察 | ×2 | 每 2 次对话后 |
| 🧬 进化候选 | ×3 | 每个改进机会多个变异方案 |
| 🛡️ 自验证 | ×2 | 回归 + 对抗并行 |
| 🔎 模式发现 | ×2 | 不同模式类型并行搜索 |
| 📊 知识图谱 | auto | 跨会话关联 |
| 🔄 元进化 | auto | 从回滚和拒绝中学习 |
| ❓ 交互提问 | - | 不确定时，最多 3 问/会话 |

自主模式配置在 `~/.config/opencode/aeon/aeon.json` → `autonomous` + `parallelism` 段。

## 原则

1. **脚本优先** — 封闭世界用脚本，开放世界用 Skill
2. **如无必要，勿增实体** — 新建 skill 是最后选择
3. **观察优于假设** — 所有改进基于真实对话数据 + 外部研究验证
4. **渐进优于激进** — 每次只改一个维度
5. **人在环中** — 高风险变更需用户确认；低风险自动应用
6. **Git 审计** — 每个进化一个 commit，回滚 = git revert
