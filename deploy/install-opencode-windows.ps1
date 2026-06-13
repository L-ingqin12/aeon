# AEON Windows Deployment Script for OpenCode
# Run in PowerShell: .\install-opencode-windows.ps1
# Or: powershell -ExecutionPolicy Bypass -File install-opencode-windows.ps1

$ErrorActionPreference = "Stop"
Write-Host "🧬 AEON — Agent Evolution & Optimization Network" -ForegroundColor Cyan
Write-Host "   Installing to OpenCode global environment (Windows)..." -ForegroundColor Gray
Write-Host ""

# === Paths ===
$OpenCodeRoot = "$env:USERPROFILE\.opencode"
$RepoUrl = "https://github.com/L-ingqin12/aeon.git"
$TempClone = "$env:TEMP\aeon-install"

# === Step 1: Clone or download AEON ===
Write-Host "[1/6] Fetching AEON..." -ForegroundColor Yellow
if (Test-Path $TempClone) { Remove-Item -Recurse -Force $TempClone }
git clone --depth 1 --branch opencode $RepoUrl $TempClone 2>&1 | Out-Null
Write-Host "       Cloned to $TempClone"

# === Step 2: Deploy agents (subagents) ===
Write-Host "[2/6] Deploying AEON agents..." -ForegroundColor Yellow
$AgentDest = "$OpenCodeRoot\agent"
New-Item -ItemType Directory -Force -Path $AgentDest | Out-Null
Copy-Item "$TempClone\.opencode\agent\aeon-*.md" -Destination $AgentDest -Force
$agentCount = (Get-ChildItem "$AgentDest\aeon-*.md").Count
Write-Host "       $agentCount agents deployed to $AgentDest"

# === Step 3: Deploy command (/evolve entry) ===
Write-Host "[3/6] Deploying /evolve command..." -ForegroundColor Yellow
$CommandDest = "$OpenCodeRoot\command"
New-Item -ItemType Directory -Force -Path $CommandDest | Out-Null
Copy-Item "$TempClone\.opencode\command\evolve.md" -Destination $CommandDest -Force
Write-Host "       evolve.md → $CommandDest"

# === Step 4: Deploy skill (auto-discovery) ===
Write-Host "[4/6] Deploying AEON skill..." -ForegroundColor Yellow
$SkillDest = "$OpenCodeRoot\skill\aeon-evolve"
New-Item -ItemType Directory -Force -Path $SkillDest | Out-Null
Copy-Item "$TempClone\.opencode\skill\aeon-evolve\*" -Destination $SkillDest -Force -Recurse
Write-Host "       aeon-evolve → $SkillDest"

# === Step 5: AEON config (independent from opencode.json!) ===
Write-Host "[5/6] Setting up AEON config..." -ForegroundColor Yellow
$AeonConfigDest = "$OpenCodeRoot\aeon"
New-Item -ItemType Directory -Force -Path "$AeonConfigDest\genomes" | Out-Null
New-Item -ItemType Directory -Force -Path "$AeonConfigDest\memory" | Out-Null
New-Item -ItemType Directory -Force -Path "$OpenCodeRoot\script" | Out-Null
Copy-Item "$TempClone\.opencode\aeon\config.json" -Destination $AeonConfigDest -Force

# Initialize history file if missing
$HistoryFile = "$AeonConfigDest\evolution-history.jsonl"
if (-not (Test-Path $HistoryFile)) {
    "[]" | Out-File -FilePath $HistoryFile -Encoding utf8
}
Write-Host "       Config → $AeonConfigDest\config.json"
Write-Host "       Storage → $AeonConfigDest\"

# === Step 6: Merge opencode.json (if user has one) ===
Write-Host "[6/6] Checking opencode.json..." -ForegroundColor Yellow
$UserConfig = "$OpenCodeRoot\opencode.json"
if (Test-Path $UserConfig) {
    Write-Host "       Existing opencode.json found — SKIPPING (do NOT manually merge 'aeon' keys!)"
    Write-Host "       AEON config is at $AeonConfigDest\config.json (independent)"
} else {
    Copy-Item "$TempClone\opencode.json" -Destination $UserConfig -Force
    Write-Host "       Created $UserConfig from template"
}

# === Cleanup ===
Remove-Item -Recurse -Force $TempClone -ErrorAction SilentlyContinue

# === Done ===
Write-Host ""
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host "  ✅ AEON installed to OpenCode global environment" -ForegroundColor Green
Write-Host "═══════════════════════════════════════════════════" -ForegroundColor Green
Write-Host ""
Write-Host "Installed:" -ForegroundColor White
Write-Host "  Agents:    $OpenCodeRoot\agent\aeon-*.md ($agentCount files)" -ForegroundColor Gray
Write-Host "  Command:   $OpenCodeRoot\command\evolve.md" -ForegroundColor Gray
Write-Host "  Skill:     $OpenCodeRoot\skill\aeon-evolve\" -ForegroundColor Gray
Write-Host "  Config:    $OpenCodeRoot\aeon\config.json" -ForegroundColor Gray
Write-Host ""
Write-Host "Next steps:" -ForegroundColor White
Write-Host "  1. Restart OpenCode desktop app" -ForegroundColor Gray
Write-Host "  2. Type /evolve to run the first evolution cycle" -ForegroundColor Gray
Write-Host "  3. Review ~/.opencode/aeon/pending-review.md for pending changes" -ForegroundColor Gray
Write-Host ""
