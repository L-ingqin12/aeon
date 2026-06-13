# 🧬 AEON — Agent Evolution & Optimization Network

> **让 Claude Code 的 Skills 和 Agents 像生物一样进化——从对话中学习，自动优化自身。**

[![Concept](https://img.shields.io/badge/concept-meta--agent-blue)](.)
[![Status](https://img.shields.io/badge/status-design%20%2B%20reference%20implementation-orange)](.)
[![License](https://img.shields.io/badge/license-MIT-green)](./LICENSE)

---

## 一句话概述

AEON 是一个**元级 Agent 系统**。它不直接解决用户问题，而是**观察你与 Claude Code 的对话，自动发现改进机会，生成并验证 Skills/Agents 的进化版本**。

## 解决什么问题？

AEON 回答两个问题：
1. **进化**: "这个已有的 skill 可以更好吗？" → **存量改进**
2. **引导**: "该有一个新 skill 来做这件事吗？" → **增量生长**

```
问题：Skills 和 Agents 写好后是静态的，不会从使用中改进
     ↓
现象：用户反复纠正同一个问题、Agent 重复犯错、好的策略没有被固化
      反复执行相同流程、但每次都要从头描述
     ↓
AEON：观察 → 分析 → 进化 → 验证 → 部署    (Evolve 链路)
      发现 → 必要性判断 → 引导创建 skill   (Bootstrap 链路)
```

### 核心原则：如无必要，勿增实体

**新建 skill 是最后选择，不是默认选择。** AEON 在创建任何新 skill 之前，会通过 6 道关卡严格判断是否必要。大部分重复模式用 memory 记录偏好就够了。

### 真实场景

| 场景 | 没有 AEON | 有 AEON |
|------|----------|---------|
| 用户3次指出遗漏了安全检查 | 手动修改 skill 指令 | 🔧 Evolve: 自动添加 Security 维度 |
| Agent 发现"先画图再列步骤"100%成功 | 策略丢失在对话记录中 | 🔧 Evolve: 策略注入 Agent prompt |
| 用户偏好的框架从 Jest 变为 Vitest | Memory 中的旧信息一直留着 | 🔧 Evolve: 自动更新 memory |
| 用户反复手动做 部署→检查→通知 | 每次重新描述流程 | 🌱 Bootstrap: 7关通过后自动创建 deploy skill |
| 用户3次手动排查日志同一套流程 | 没有意识到可以固化 | 🌱 Bootstrap: 发现模式→判断必要性→创建 log-analyzer skill |
| 一个简单偏好（"用yarn不用npm"）被误建为skill | 过度工程化 | ⚖️ Necessity Evaluator: Gate 5 拒绝→改为 memory |

## 核心架构

AEON 有两条互补链路：

```
┌──────────────────────────────────────────────────────────┐
│                      AEON System                         │
│                                                          │
│  🔧 进化链路 (Evolve) — 存量优化                          │
│  👁️Observer → 🔍Analyzer → 🧬Evolver → 🛡️Fitness → 🚀Deploy   │
│                                                          │
│  🌱 引导链路 (Bootstrap) — 增量生长                        │
│  🔎Discoverer → ⚖️Necessity(7关) → 🏭Bootstrapper        │
│                                                          │
│  ⚖️ Necessity Evaluator 是守门人                          │
│  "如无必要，勿增实体" — 默认答案是 NO                       │
└──────────────────────────────────────────────────────────┘
```

## 快速开始

### Claude Code 安装

```bash
git clone https://github.com/L-ingqin12/aeon.git

# 将 skill 添加到你的项目
cp -r aeon/skills/evolve .claude/skills/evolve

# 将 agent 定义添加到你的项目
cp -r aeon/agents/ .claude/agents/aeon/

# 初始化 AEON 存储
mkdir -p .claude/aeon/genomes
echo '[]' > .claude/aeon/evolution-history.jsonl
```

### OpenCode + oh-my-openagent 安装

```bash
git clone https://github.com/L-ingqin12/aeon.git /tmp/aeon-install

# 复制 agent 定义（注册为 subagent）
cp /tmp/aeon-install/.opencode/agents/aeon-*.md .opencode/agents/

# 复制 command（/evolve 入口）
cp /tmp/aeon-install/.opencode/commands/evolve.md .opencode/commands/

# 复制 skill（自动被发现和注入）
cp -r /tmp/aeon-install/.opencode/skills/aeon-evolve .opencode/skills/

# 复制 AEON 独立配置（⚠️ 不要合并到 opencode.json）
cp /tmp/aeon-install/.opencode/aeon/aeon.json .opencode/aeon/aeon.json
# 初始化 AEON 存储
mkdir -p .opencode/aeon/{genomes,memory}
echo '[]' > .opencode/aeon/evolution-history.jsonl
```

### Windows (OpenCode 桌面版)

```powershell
git clone --depth 1 --branch opencode https://github.com/L-ingqin12/aeon.git $env:TEMP\aeon
powershell -ExecutionPolicy Bypass -File $env:TEMP\aeon\deploy\install-opencode-windows.ps1
```

> 📖 完整跨平台适配说明见 [PLATFORM-ADAPTER.md](PLATFORM-ADAPTER.md) | Windows 详细指南见 [deploy/WINDOWS-GUIDE.md](deploy/WINDOWS-GUIDE.md)

### 第一次使用

```
/evolve
```

运行后你会看到：

**进化链路 (Evolve)**:
1. 对话分析摘要
2. 发现的改进机会（已有 skill/agent）
3. 建议的进化方案
4. 自动应用的低风险改进
5. 需要审查的中高风险改进

**引导链路 (Bootstrap)**:
6. 发现的重复工作流模式
7. 7 关必要性判断结果
8. 通过验证的新 skill 定义
9. 降级为 memory 的简单模式

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
├── DESIGN.md                           # 完整架构设计文档（含两条链路）
├── LICENSE                             # MIT 许可证
│
├── skills/
│   └── evolve/SKILL.md                 # /evolve skill 定义（子目录格式）（Claude Code 可直接使用）
│
├── agents/
│   ├── observer.md                     # Observer Agent — 对话信号提取（进化链路）
│   ├── evolver.md                      # Evolver Agent — 核心进化引擎（进化链路）
│   ├── fitness-evaluator.md           # Fitness Evaluator — 质量守门人（进化链路）
│   ├── workflow-discoverer.md          # Workflow Discoverer — 重复模式发现（引导链路）
│   ├── necessity-evaluator.md          # Necessity Evaluator — 7关必要性判断（引导链路）
│   └── skill-bootstrapper.md           # Skill Bootstrapper — 新 skill 生成（引导链路）
│
├── tools/
│   └── evolution-engine.js            # 完整双链路 Workflow 脚本（概念参考实现）
│
├── hooks/
│   └── settings.json                   # Hook 配置（自动触发进化）
│
├── examples/
│   └── evolution-cycle.md             # 完整进化周期示例
│
├── deploy/
│   ├── install-opencode-windows.ps1   # Windows 一键部署脚本
│   └── WINDOWS-GUIDE.md               # Windows 部署指南
│
└── memory-templates/
    └── evolution-preferences.md        # Memory 模板（记录进化偏好）
```

## 进化模式

| 模式 | 风险 | 自动应用？ | 示例 |
|------|------|-----------|------|
| **incremental** | 低 | ✅ 是 | 措辞优化、示例添加 |
| **guided** | 中 | ⚠️ 审查后 | 策略调整、工具变更 |
| **major** | 高 | ❌ 需确认 | 重写指令、行为变更 |
| **experimental** | 未知 | 🔬 A/B测试 | 新策略探索 |

## 必要性判断（7 道关卡）

引导链路中，每个候选模式必须通过 7 关。**Gate 0 是第一道也是最关键的防线。**

| 关卡 | 问题 | 失败路径 |
|------|------|---------|
| **G0 脚本优先** ⭐ | 封闭世界问题（已知路径+结果，异常可枚举）？ | 🔧 生成脚本 + 薄 wrapper |
| **G1 频率** | 最近50次对话出现 ≥3 次？ | 🗑️ 不处理 |
| **G2 稳定性** | 步骤序列已收敛？ | 📝 memory + "evolving" |
| **G3 边界** | 触发/输入/输出清晰？ | 📝 memory |
| **G4 重叠** | 现有 skill 不覆盖？ | 🔧 进化现有 skill |
| **G5 复杂度** | ≥2/4 复杂度指标？ | 📝 memory（太简单） |
| **G6 路由** | 不造成触发冲突？ | ⚠️ 重新设计或放弃 |

### Script vs Skill 边界

| | 脚本 | Skill |
|---|------|------|
| **问题类型** | 封闭世界 | 开放世界 |
| **路径** | 确定，已知分支 | 不确定，需要分析 |
| **结果** | 可预测 | 需要情境判断 |
| **示例** | `grep ERROR \| sort \| uniq -c` | "分析这些错误的根因" |

## 变异算子（进化链路）

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

### 脚本优先 (Script-First)
**Skills 封装思考，脚本封装执行。** 封闭世界问题（已知路径、确定结果、异常可枚举）用脚本解决——零 token，毫秒级，100% 准确。只有开放世界问题（需要推理、情境判断）才创建 skill。

### 观察优于假设
所有进化基于真实对话数据。AEON 不会凭空猜测应该如何改进——它从你的使用模式中学习。

### 如无必要，勿增实体
新建 skill 是最后选择。Memory 优先，进化次之，新建最末。6 道关卡确保每个新建的 skill 都是必要且经过验证的。

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
