# 🧬 AEON — Agent Evolution & Optimization Network

> **让 Claude Code 的 Skills 和 Agents 像生物一样进化——从对话中学习，自动优化自身。**

[![Concept](https://img.shields.io/badge/concept-meta--agent-blue)](.)
[![Status](https://img.shields.io/badge/status-design%20%2B%20reference%20implementation-orange)](.)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 一句话概述

AEON 是一个**元级 Agent 系统**。它不直接解决用户问题，而是**观察你与 Claude Code 的对话，自动发现改进机会，生成并验证 Skills/Agents 的进化版本**。

## 解决什么问题？

```
问题：Skills 和 Agents 写好后是静态的，不会从使用中改进
     ↓
现象：用户反复纠正同一个问题、Agent 重复犯错、好的策略没有被固化
     ↓
AEON：观察 → 分析 → 进化 → 验证 → 部署
```

### 真实场景

| 场景 | 没有 AEON | 有 AEON |
|------|----------|---------|
| 用户3次指出遗漏了安全检查 | 手动修改 skill 指令 | AEON 自动检测并添加 Security 维度 |
| Agent 发现"先画图再列步骤"100%成功 | 策略丢失在对话记录中 | AEON 将策略注入 Agent 的 system prompt |
| 用户偏好的框架从 Jest 变为 Vitest | Memory 中的旧信息一直留着 | AEON 自动更新 memory |
| 10个对话后 code-review skill 需要优化 | 用户忘记/不知道可以改 | AEON 主动建议并生成改进版 |

## 核心架构

```
┌─────────────────────────────────────────────────────┐
│                   AEON System                        │
│                                                      │
│   👁️ Observer ──▶ 🔍 Analyzer ──▶ 🧬 Evolver        │
│   提取信号         识别机会          生成进化          │
│                                                      │
│              🛡️ Fitness Evaluator                    │
│              回归测试 · 对抗验证 · 一致性检查          │
│                                                      │
│              🚀 Deployment Manager                   │
│              Git版本化 · 金丝雀部署 · 一键回滚         │
└─────────────────────────────────────────────────────┘
```

## 快速开始

### 安装

将 AEON 的 skill 和 agent 定义添加到你的 Claude Code 项目中：

```bash
# 克隆 AEON
git clone https://github.com/L-ingqin12/aeon.git

# 将 skill 添加到你的项目
cp aeon/skills/evolve.md .claude/skills/evolve.md

# 将 agent 定义添加到你的项目
cp -r aeon/agents/ .claude/agents/aeon/

# 初始化 AEON 存储
mkdir -p .claude/aeon/genomes
echo '[]' > .claude/aeon/evolution-history.jsonl
```

### 第一次使用

```
/evolve
```

运行后你会看到：
1. 对话分析摘要
2. 发现的改进机会
3. 建议的进化方案
4. 自动应用的低风险改进
5. 需要审查的中高风险改进

### 日常使用

```bash
# 对话结束后自动触发（通过 Hook）
# 或在需要时手动触发
/evolve                    # 完整进化循环
/evolve review             # 审查待处理的进化
/evolve status             # 查看进化状态
/evolve history code-review  # 查看 skill 的进化历史
/evolve rollback code-review  # 回滚到上一版本
```

## 文件结构

```
aeon/
├── README.md                           # 本文件
├── DESIGN.md                           # 完整架构设计文档
├── LICENSE                             # MIT 许可证
│
├── skills/
│   └── evolve.md                       # /evolve skill 定义（Claude Code 可直接使用）
│
├── agents/
│   ├── evolver.md                      # Evolver Agent — 核心进化引擎
│   ├── observer.md                     # Observer Agent — 对话信号提取
│   └── fitness-evaluator.md           # Fitness Evaluator — 质量守门人
│
├── tools/
│   └── evolution-engine.js            # 进化引擎 Workflow 脚本（概念参考实现）
│
├── hooks/
│   └── settings.json                   # Hook 配置（自动触发进化）
│
├── examples/
│   └── evolution-cycle.md             # 完整进化周期示例
│
└── memory-templates/
    └── evolution-memory.md            # Memory 模板（记录进化偏好）
```

## 进化模式

| 模式 | 风险 | 自动应用？ | 示例 |
|------|------|-----------|------|
| **incremental** | 低 | ✅ 是 | 措辞优化、示例添加 |
| **guided** | 中 | ⚠️ 审查后 | 策略调整、工具变更 |
| **major** | 高 | ❌ 需确认 | 重写指令、行为变更 |
| **experimental** | 未知 | 🔬 A/B测试 | 新策略探索 |

## 变异算子

| 算子 | 描述 | 风险 |
|------|------|------|
| `prompt_clarify` | 增加具体指令和场景覆盖 | 低 |
| `tool_add` | 添加缺失的工具 | 中 |
| `tool_remove` | 移除无效的工具 | 低-中 |
| `strategy_inject` | 注入成功策略模式 | 中 |
| `trigger_tune` | 调整触发灵敏度 | 低 |
| `knowledge_update` | 更新过时的 memory | 低 |
| `example_add` | 从成功对话提取 few-shot | 低 |
| `constraint_add` | 添加禁止规则 | 低-中 |

## 安全设计

1. **沙箱执行** — 进化在隔离的 Git worktree 中进行
2. **变更审计** — 所有进化记录在 Git 历史和 evolution-history.jsonl 中
3. **人工把关** — high-impact 变更需用户确认
4. **自动回滚** — 适应度下降超 10% 自动触发回滚
5. **速率限制** — 每 24 小时最多 5 次进化（3 次自动应用）
6. **渐进推广** — 重大变更支持金丝雀部署

## 设计理念

### 观察优于假设
所有进化基于真实对话数据。AEON 不会凭空猜测应该如何改进——它从你的使用模式中学习。

### 渐进优于激进
小步快跑。每次只改一个维度，每个进化都可以独立回滚。没有"大爆炸"式的重写。

### 人在环中
AEON 是增强工具，不是替代品。低风险变更自动应用，高风险变更始终需要你确认。

## 适用场景

✅ **适合**：
- 有多个自定义 skill/agent 的活跃用户
- 团队共享 skill 库的场景
- 需要持续优化 agent 行为的长期项目

⚠️ **不太适合**：
- 偶尔使用 Claude Code（信号不足）
- 只用默认 skill 和 agent（无自定义实体可进化）
- 对话高度多样化且每次上下文截然不同

## 贡献

AEON 本身也是一个可以被进化的系统！如果你有改进建议：

1. Fork 这个仓库
2. 创建一个进化提案（Evolution Proposal）
3. 提交 PR

## 许可证

MIT — 自由使用、修改、分发。

---

*"The best agents aren't written — they're evolved."*
