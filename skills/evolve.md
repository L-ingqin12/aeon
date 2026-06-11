# /evolve — Agent & Skill 进化系统

让 Claude Code 的 skills 和 agents 从对话中学习并自我优化。

## 用法

```
/evolve                        # 触发完整进化循环（分析所有对话，生成改进）
/evolve status                 # 查看当前进化状态
/evolve review                 # 审查待处理的进化建议
/evolve history [entity]       # 查看进化历史
/evolve rollback <entity>      # 回滚到上一个版本
/evolve config                 # 查看/修改进化配置
```

## 工作流程

当用户触发 `/evolve` 时，按以下流程执行：

### Phase 1: 收集数据

1. 扫描最近的对话转录（`.claude/transcripts/`）
2. 读取所有现有 skill 定义（`.claude/skills/`）
3. 读取所有现有 agent 定义
4. 读取 memory 存储（`memory/`）
5. 读取进化历史（`.claude/aeon/evolution-history.jsonl`）

### Phase 2: 观察分析

调用 **Observer Agent** 分析对话数据，提取：
- 用户纠正模式
- 成功/失败模式
- 隐含偏好
- 可改进的机会

### Phase 3: 生成进化

调用 **Evolver Agent** 针对每个改进机会生成进化版本：
- 对于增量改进（措辞优化、示例添加），自动生成并排队
- 对于中等变更（策略调整、工具变更），生成后暂停等待审查
- 对于重大变更（重写指令），生成草案供用户审阅

### Phase 4: 验证

每个进化版本需要经过：
1. **回归测试** — 在3个历史对话上回放
2. **对抗验证** — 对抗性 Agent 尝试找出弱点
3. **一致性检查** — 确保与其他 skill/agent 不冲突

### Phase 5: 部署

- 通过的增量改进自动应用
- 通过的中等变更创建待审查列表
- 重大变更提交给用户决策

## 配置

在 `.claude/aeon/config.json` 中：

```json
{
  "auto_mode": "incremental",
  "max_evolutions_per_day": 5,
  "require_review_for": ["guided", "major", "experimental"],
  "fitness_threshold": 0.7,
  "rollback_threshold": 0.1,
  "conversation_lookback": 50,
  "notification": true
}
```

## 输出格式

进化结束后输出结构化报告：

```markdown
# 🧬 进化报告 — 2026-06-11

## 扫描摘要
- 分析对话数：12
- 发现信号：47
- 改进机会：5

## 已应用的进化
| # | 目标 | 类型 | 变更 | 适应度 |
|---|------|------|------|--------|
| 1 | code-review | prompt_clarify | +性能检查维度 | 0.92 |
| 2 | memory:api-pref | knowledge_update | REST over GraphQL | 0.95 |

## 待审查
| # | 目标 | 类型 | 变更 | 置信度 |
|---|------|------|------|--------|
| 3 | plan-agent | strategy_inject | 优先使用Mermaid | 0.85 |

## 被拒绝
| # | 目标 | 原因 |
|---|------|------|
| 4 | test-skill | 适应度下降 0.15 > 阈值 0.1 |

---
使用 `/evolve review` 审查待处理的进化
使用 `/evolve rollback <entity>` 回滚变更
```
