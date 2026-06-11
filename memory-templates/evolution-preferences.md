---
name: evolution-preferences
description: AEON 进化系统的用户偏好配置
metadata:
  type: user
---

# AEON Evolution Preferences

## 自动应用偏好
- 我倾向于让低风险变更（措辞优化、示例添加）自动应用
- 中风险变更（策略调整、工具增删）请排队审查，我会在 `/evolve review` 中查看
- 高风险变更（行为重写）必须明确征求我的同意

## 进化频率
- 每次对话结束后自动运行增量进化是可以的
- 每周一次的深度进化（/evolve full）是我偏好的节奏

## 已知偏好（供 AEON 参考，避免重复学习）
[[api-architecture-preference]]

**Why:** 这些设置控制 AEON 的自动化程度，避免过度打扰。
**How to apply:** AEON 在执行进化前应检查此 memory，遵守自动化级别设置。
