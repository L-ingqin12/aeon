# 完整进化周期示例

本文档展示了一个完整的 AEON 进化周期——从观察对话到部署改进。

## 背景

一个使用 Claude Code 的开发团队，经过一周的开发后，运行 `/evolve` 来分析对话历史并优化他们的 skills。

## Phase 1: 数据收集

```
收集到：
- 对话转录：23 个（最近7天）
- 可进化实体：6 个
  - Skills: code-review, test-generator, docs-writer
  - Agents: plan-agent, explore-agent
  - Memory: 12 个 memory 文件
```

## Phase 2: 观察分析

Observer Agent 扫描了 23 个对话，提取了以下信号：

### 发现的纠正信号

| # | 对话 | 目标 | 信号 | 描述 |
|---|------|------|------|------|
| 1 | conv-003 | code-review | explicit_correction | 用户指出"你漏了检查 SQL 注入" |
| 2 | conv-007 | code-review | missing_dimension | 用户说"性能呢？这个查询在大表上会很慢" |
| 3 | conv-011 | code-review | explicit_correction | 用户说"安全检查也要看依赖版本" |
| 4 | conv-015 | test-generator | wrong_approach | 用户说"不要只写单元测试，也要考虑集成测试" |
| 5 | conv-019 | plan-agent | missing_dimension | 用户说"你考虑过部署回滚方案吗？" |

### 发现的成功模式

| # | 对话 | 目标 | 模式 | 成功率 |
|---|------|------|------|--------|
| 1 | conv-002,06,08,10,14,18 | plan-agent | 先画架构图再列步骤 | 100% (6/6) |
| 2 | conv-004,09,12,16,20 | explore-agent | 用表格总结发现 | 90% (5/5 获得好评) |
| 3 | conv-005,13,17 | code-review | 用 diff 格式展示建议 | 100% (3/3) |

### 改进机会

Observer 综合信号，识别出 **4 个改进机会**：

```
opt-001: code-review 缺少性能和安全检查维度 (confidence: 0.87)
opt-002: plan-agent 应默认包含架构图 (confidence: 0.92)
opt-003: test-generator 指令过于狭窄 (confidence: 0.78)
opt-004: explore-agent 输出格式未标准化 (confidence: 0.81)
```

## Phase 3: 生成进化

### opt-001: code-review — prompt_clarify

**变异前 (v2.3.0)**:
```markdown
## Instructions
Review code changes for:
1. Correctness — logic errors, edge cases
2. Maintainability — readability, DRY principles
```

**变异后 (v2.4.0)**:
```markdown
## Instructions
Review code changes across four dimensions:
1. Correctness — logic errors, edge cases, type mismatches, null handling
2. Security — injection (SQL, NoSQL, command), XSS, auth bypass,
   sensitive data exposure, dependency vulnerabilities
3. Performance — N+1 queries, missing indexes, O(n²) algorithms,
   excessive allocations, unbounded collections
4. Maintainability — readability, DRY, SOLID, consistent naming,
   appropriate abstraction level
```

**变更摘要**: 从 2 维度扩展到 4 维度；Security 和 Performance 是新增维度。

### opt-002: plan-agent — strategy_inject

**变异前 system_prompt 片段**:
```
Analyze the requirements and propose an implementation plan.
List the steps in order.
```

**变异后 system_prompt 片段**:
```
Analyze the requirements and propose an implementation plan.

1. First, draw an architecture diagram (ASCII art or Mermaid) showing
   the key components and their interactions.
2. Annotate critical decision points in the diagram.
3. Then list implementation steps in dependency order.
4. For each major decision, provide at least one alternative approach
   with a brief trade-off comparison.
```

### opt-003: test-generator — prompt_clarify

被拒绝 — 适应度评估显示新增的集成测试指令与项目的 Vitest 配置不兼容。将在修复后重新提交。

### opt-004: explore-agent — example_add

**变异前**:
```
Search the codebase and report your findings.
```

**变异后**:
```
Search the codebase and report your findings.

Format your output as:
1. A summary table of all findings
2. Detailed sections for each finding
3. Cross-references between related findings

Example:
| File | Type | Description | Priority |
|------|------|-------------|----------|
| src/auth.ts | Security | Hardcoded secret | High |
```

## Phase 4: 适应度验证

### opt-001 — ✅ 通过 (fitness: 0.91)

```
回归测试 (3个历史对话):
  - conv-003 (SQL注入遗漏) → 新版本会检查 ✓
  - conv-007 (性能遗漏) → 新版本会检查 ✓
  - conv-011 (依赖版本) → 新版本会检查 ✓
  覆盖度: 0.96 | 改进度: 0.25 | 回归度: 0.0

对抗性测试:
  - 弱点: "如果 PR 只有一个配置文件变更，全量4维度检查可能过度"
  - 严重度: minor
  - 判定: 不阻塞（正确性 > 过度检查的成本）

一致性检查:
  - 与其他 skill 无冲突 ✓
  - 与 CLAUDE.md 一致 ✓
```

### opt-002 — ✅ 通过 (fitness: 0.94)

```
回归测试 (3个历史对话):
  - 所有测试对话中，新版本的 plan 结构更清晰 ✓
  覆盖度: 0.98 | 改进度: 0.18 | 回归度: 0.0

对抗性测试:
  - 无弱点发现 ✓

一致性检查:
  - 与现有 plan-agent 的行为模式兼容 ✓
```

### opt-003 — ❌ 拒绝 (fitness: 0.62)

```
回归测试:
  - conv-015 (原要求集成测试) 新版本生成了 vitest 不支持的配置 ✗
  覆盖度: 0.70 | 改进度: -0.05 | 回归度: 0.15

拒绝原因: 需要更多项目配置信息才能正确生成集成测试指令
```

### opt-004 — ✅ 通过 (fitness: 0.88)

```
回归测试:
  - 所有历史对话中，表格格式使输出更易读 ✓
  覆盖度: 0.93 | 改进度: 0.10 | 回归度: 0.0

自动应用（增量改进，低风险）
```

## Phase 5: 部署

```
═══════════════════════════════════════
🧬 AEON Evolution Cycle Complete
═══════════════════════════════════════
   ✅ Auto-applied: 3
     - code-review v2.3.0 → v2.4.0 (+Security, +Performance)
     - plan-agent  v1.0.0 → v1.1.0 (+Architecture diagram strategy)
     - explore-agent v0.5.0 → v0.6.0 (+Table output format)
   ⏳ Pending review: 0
   ❌ Rejected: 1
     - test-generator (fitness 0.62 — needs project context)
═══════════════════════════════════════
```

## 用户视角

运行 `/evolve` 后，用户看到：

```markdown
# 🧬 进化报告 — 2026-06-11

## 扫描摘要
- 分析对话数：23
- 发现信号：47
- 改进机会：4 → 3 应用，1 拒绝

## 已应用的进化
| # | 目标 | 版本 | 变更 | 适应度 |
|---|------|------|------|--------|
| 1 | code-review | v2.4.0 | 增加 Security + Performance 检查维度 | 0.91 |
| 2 | plan-agent | v1.1.0 | 默认包含架构图和替代方案 | 0.94 |
| 3 | explore-agent | v0.6.0 | 表格化输出格式 | 0.88 |

## 被拒绝
| # | 目标 | 原因 |
|---|------|------|
| 1 | test-generator | 需要更多项目上下文才能安全进化 |

## Git 状态
```
On branch main
Changes to be committed:
  modified:   .claude/skills/code-review.md
  modified:   agents/plan-agent.md
  modified:   agents/explore-agent.md
  new file:   .claude/aeon/evolution-history.jsonl
```

---
✅ 3 个进化已暂存。请审查后提交：
   git commit -m "aeon: evolve code-review, plan-agent, explore-agent"
```

## 关键要点

1. **进化是渐进的** — 每次只改一个维度，可独立回滚
2. **质量守门** — Fitness Evaluator 阻止了 opt-003（会被用户抱怨的变更）
3. **透明可审计** — 所有变更都有 why，记录在 evolution-history.jsonl
4. **人在环中** — 用户最终决定是否 commit 变更
5. **学习积累** — 被拒绝的 opt-003 会被记录下来，未来有更多上下文时可能重新尝试
