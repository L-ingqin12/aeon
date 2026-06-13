# AEON Windows Deployment Script for OpenCode
# Run: powershell -ExecutionPolicy Bypass -File install-opencode-windows.ps1

$ErrorActionPreference = "Stop"
Write-Host "🧬 AEON — Agent Evolution & Optimization Network" -ForegroundColor Cyan
Write-Host "   Installing to OpenCode global environment (Windows)..." -ForegroundColor Gray

# === Path Resolution (matches OpenCode source: packages/opencode/src/global/index.ts) ===
# Priority: OPENCODE_CONFIG_DIR > XDG_CONFIG_HOME/opencode > ~/.config/opencode
# Ref: https://github.com/anomalyco/opencode (XDG-compliant, xdg-basedir npm package)
if ($env:OPENCODE_CONFIG_DIR) {
    $OpenCodeRoot = $env:OPENCODE_CONFIG_DIR
} elseif ($env:XDG_CONFIG_HOME) {
    $OpenCodeRoot = Join-Path $env:XDG_CONFIG_HOME "opencode"
} else {
    $OpenCodeRoot = Join-Path $env:USERPROFILE ".config\opencode"
}
Write-Host "   OpenCode global root: $OpenCodeRoot" -ForegroundColor DarkGray

$RepoUrl = "https://github.com/L-ingqin12/aeon.git"
$TempClone = Join-Path $env:TEMP "aeon-install"
Write-Host ""

# === Step 1: Fetch AEON ===
Write-Host "[1/6] Fetching AEON..." -ForegroundColor Yellow
if (Test-Path $TempClone) { Remove-Item -Recurse -Force $TempClone }
git clone --depth 1 --branch opencode $RepoUrl $TempClone 2>&1 | Out-Null
Write-Host "       Done"

# === Step 2: Deploy agents (subagents) ===
Write-Host "[2/6] Deploying AEON agents..." -ForegroundColor Yellow
$AgentDest = Join-Path $OpenCodeRoot "agent"
New-Item -ItemType Directory -Force -Path $AgentDest | Out-Null
Copy-Item (Join-Path $TempClone ".opencode\agent\aeon-*.md") -Destination $AgentDest -Force
$agentCount = (Get-ChildItem (Join-Path $AgentDest "aeon-*.md")).Count
Write-Host "       $agentCount agents → $AgentDest"

# === Step 3: Deploy command (/evolve entry) ===
Write-Host "[3/6] Deploying /evolve command..." -ForegroundColor Yellow
$CommandDest = Join-Path $OpenCodeRoot "command"
New-Item -ItemType Directory -Force -Path $CommandDest | Out-Null
Copy-Item (Join-Path $TempClone ".opencode\command\evolve.md") -Destination $CommandDest -Force
Write-Host "       evolve.md → $CommandDest"

# === Step 4: Deploy skill (auto-discovery) ===
Write-Host "[4/6] Deploying AEON skill..." -ForegroundColor Yellow
$SkillDest = Join-Path $OpenCodeRoot "skill\aeon-evolve"
New-Item -ItemType Directory -Force -Path $SkillDest | Out-Null
Copy-Item (Join-Path $TempClone ".opencode\skill\aeon-evolve\*") -Destination $SkillDest -Force -Recurse
Write-Host "       aeon-evolve → $SkillDest"

# === Step 5: AEON config (independent file, NOT merged into opencode.json!) ===
Write-Host "[5/6] Setting up AEON config..." -ForegroundColor Yellow
$AeonConfigDest = Join-Path $OpenCodeRoot "aeon"
$ScriptDest = Join-Path $OpenCodeRoot "script"
New-Item -ItemType Directory -Force -Path (Join-Path $AeonConfigDest "genomes") | Out-Null
New-Item -ItemType Directory -Force -Path (Join-Path $AeonConfigDest "memory") | Out-Null
New-Item -ItemType Directory -Force -Path $ScriptDest | Out-Null
Copy-Item (Join-Path $TempClone ".opencode\aeon\aeon.json") -Destination $AeonConfigDest -Force

$HistoryFile = Join-Path $AeonConfigDest "evolution-history.jsonl"
if (-not (Test-Path $HistoryFile)) {
    "[]" | Out-File -FilePath $HistoryFile -Encoding utf8
}
Write-Host "       Config → $AeonConfigDest\aeon.json"

# === Step 6: opencode.json (only standard fields, no custom keys) ===
Write-Host "[6/6] Checking opencode.json..." -ForegroundColor Yellow
$UserConfig = Join-Path $OpenCodeRoot "opencode.json"
if (Test-Path $UserConfig) {
    Write-Host "       Existing opencode.json — SKIPPED (AEON uses independent config)"
} else {
    Copy-Item (Join-Path $TempClone "opencode.json") -Destination $UserConfig -Force
    Write-Host "       Created $UserConfig"
}

# === Cleanup ===
Remove-Item -Recurse -Force $TempClone -ErrorAction SilentlyContinue

# === Done ===
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ AEON installed to OpenCode global environment" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "  Root:   $OpenCodeRoot" -ForegroundColor Gray
Write-Host "  Agents: $AgentDest ($agentCount files)" -ForegroundColor Gray
Write-Host "  Skill:  $SkillDest" -ForegroundColor Gray
Write-Host "  Config: $AeonConfigDest\aeon.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Next:" -ForegroundColor White
Write-Host "  1. Restart OpenCode desktop" -ForegroundColor Gray
Write-Host "  2. Type /evolve" -ForegroundColor Gray
Write-Host ""
