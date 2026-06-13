---
description: Trigger AEON evolution cycle — analyze conversations, evolve existing agents/skills, and discover new skill opportunities
mode: all
---

# /evolve — AEON Evolution Command

触发 AEON 进化循环。分析对话历史，优化已有的 agents/skills，并发现新的 skill 机会。

## 用法

```
/evolve              # 完整进化循环（Evolve + Bootstrap 双链路）
/evolve status       # 查看进化状态
/evolve review       # 审查待处理的进化
/evolve history      # 查看进化历史
/evolve rollback N   # 回滚到指定版本
```

## 执行流程

### Phase 1: Collect
收集对话转录和实体定义。

### Phase 2: Observe (进化链路)
调用 `aeon-observer` subagent 提取信号：
- 用户纠正模式
- 成功/失败模式
- 隐含偏好
- 改进机会

### Phase 3: Evolve
对每个改进机会，调用 `aeon-evolver` subagent 生成进化版本。

### Phase 4: Validate
调用 `aeon-fitness-evaluator` subagent 对每个进化版本进行质量验证。

### Phase 5: Discover (引导链路)
调用 `aeon-workflow-discoverer` subagent 发现重复工作流模式。

### Phase 6: Evaluate Necessity
对每个发现的模式，调用 `aeon-necessity-evaluator` subagent 进行 7 关判断。

### Phase 7: Bootstrap
对通过 7 关的模式，调用 `aeon-skill-bootstrapper` subagent 生成新 skill。

### Phase 8: Report
生成结构化进化报告，展示所有变更和建议。

## 原则

1. **如无必要，勿增实体** — 新建 skill 是最后选择
2. **观察优于假设** — 所有改进基于真实对话数据
3. **渐进优于激进** — 每次只改一个维度
4. **人在环中** — 高风险变更需用户确认
