# AEON Windows + OpenCode 部署指南

## 环境要求

- Windows 10/11
- OpenCode 桌面版已安装
- Git for Windows
- PowerShell 5.1+

## OpenCode Windows 全局路径

> **验证来源**: OpenCode 使用 XDG 规范（[xdg-basedir](https://github.com/sindresorhus/xdg-basedir) npm 包）。
> 源码: `packages/opencode/src/global/index.ts` → `$XDG_CONFIG_HOME/opencode`
> 回退: `~/.config/opencode/` → Windows = `%USERPROFILE%\.config\opencode\`
>
> 参考 Issues: [anomalyco/opencode#6669](https://github.com/anomalyco/opencode/issues/6669), [#4170](https://github.com/anomalyco/opencode/issues/4170)

路径解析优先级:
1. `OPENCODE_CONFIG_DIR` 环境变量
2. `XDG_CONFIG_HOME/opencode`
3. `~/.config/opencode/`（默认）

| 组件 | 路径 |
|------|------|
| 根目录 | `%USERPROFILE%\.config\opencode\` |
| Agents | `%USERPROFILE%\.config\opencode\agent\` |
| Commands | `%USERPROFILE%\.config\opencode\command\` |
| Skills | `%USERPROFILE%\.config\opencode\skill\aeon-evolve\SKILL.md` |
| 主配置 | `%USERPROFILE%\.config\opencode\opencode.json` |
| AEON 配置 | `%USERPROFILE%\.config\opencode\aeon\config.json` |
| AEON 存储 | `%USERPROFILE%\.config\opencode\aeon\` |

## 一键安装

```powershell
# 下载并运行安装脚本
git clone --depth 1 --branch opencode https://github.com/L-ingqin12/aeon.git $env:TEMP\aeon
powershell -ExecutionPolicy Bypass -File $env:TEMP\aeon\deploy\install-opencode-windows.ps1
```

## 手动安装

### Step 1: 部署 Agents

```powershell
mkdir -Force $env:USERPROFILE\.opencode\agent
Copy-Item aeon\.opencode\agent\aeon-*.md $env:USERPROFILE\.opencode\agent\
```

### Step 2: 部署 Command

```powershell
mkdir -Force $env:USERPROFILE\.opencode\command
Copy-Item aeon\.opencode\command\evolve.md $env:USERPROFILE\.opencode\command\
```

### Step 3: 部署 Skill

```powershell
Copy-Item -Recurse aeon\.opencode\skill\aeon-evolve $env:USERPROFILE\.opencode\skill\
```

### Step 4: 设置 AEON 配置

```powershell
mkdir -Force $env:USERPROFILE\.opencode\aeon\genomes
mkdir -Force $env:USERPROFILE\.opencode\aeon\memory
mkdir -Force $env:USERPROFILE\.opencode\script
Copy-Item aeon\.opencode\aeon\config.json $env:USERPROFILE\.opencode\aeon\
"[]" | Out-File $env:USERPROFILE\.opencode\aeon\evolution-history.jsonl
```

### Step 5: 检查 opencode.json

```powershell
# 如果已有 opencode.json，不要覆盖！AEON 使用独立配置文件。
if (-not (Test-Path $env:USERPROFILE\.opencode\opencode.json)) {
    Copy-Item aeon\opencode.json $env:USERPROFILE\.opencode\opencode.json
}
```

## ⚠️ 重要注意事项

### 不要将 AEON 配置合并到 opencode.json

`opencode.json` 是 OpenCode 的主配置文件，schema 严格校验。自定义键（如 `aeon`）会导致：
- 模型列表加载失败
- Agent 列表为空
- 会话无法创建
- Skills 不显示

AEON 配置独立存放在 `%USERPROFILE%\.config\opencode\aeon\config.json`。

### Windows 路径差异

| Linux/Mac | Windows |
|-----------|---------|
| `~/.opencode/` | `%USERPROFILE%\.config\opencode\` |
| `/` 路径分隔符 | `\` 路径分隔符 |
| `mkdir -p` | `mkdir -Force` |
| `cp` | `Copy-Item` |

## 验证安装

1. 重启 OpenCode 桌面版
2. 输入 `/evolve` → 应看到 AEON 进化循环启动
3. 检查 agent 列表 → 应包含 `aeon-observer`, `aeon-evolver` 等

## 卸载

```powershell
Remove-Item -Recurse $env:USERPROFILE\.opencode\agent\aeon-*.md
Remove-Item $env:USERPROFILE\.opencode\command\evolve.md
Remove-Item -Recurse $env:USERPROFILE\.opencode\skill\aeon-evolve
Remove-Item -Recurse $env:USERPROFILE\.opencode\aeon
```
