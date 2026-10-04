# MAISHAA WORKSPACE 2 — Windows PowerShell Dev Script (Development Mode)
# 0. Always switch to the script's own directory
Set-Location -LiteralPath $PSScriptRoot

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Launching MAISHAA WORKSPACE 2 (Development Mode)" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js existence
try {
    $null = node -v
} catch {
    Write-Host "[ERROR] Node.js is not found in system PATH." -ForegroundColor Red
    Write-Host "Dependencies require Node.js LTS (^20.19.0 or >=22.12.0) from https://nodejs.org/" -ForegroundColor Yellow
    Read-Host "Press Enter to exit..."
    Exit 1
}

# Enforce dependency-compatible Node version
node scripts/check-node-version.cjs
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Node.js version is incompatible with project dependencies." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    Exit 1
}

if (-not (Test-Path "node_modules")) {
    Write-Host "[WARNING] node_modules not found. Running .\setup.ps1 first..." -ForegroundColor Yellow
    & ".\setup.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Setup failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        Exit 1
    }
}

Write-Host "Starting development server on port 3000..." -ForegroundColor Green
Write-Host "Open your browser at: http://localhost:3000" -ForegroundColor Yellow
Write-Host ""

npm run dev
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Dev server terminated with error code $LASTEXITCODE." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
}
