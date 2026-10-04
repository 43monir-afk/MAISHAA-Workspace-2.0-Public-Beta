# MAISHAA WORKSPACE 2 — Windows PowerShell Start Script (Production Mode)
# 0. Always switch to the script's own directory
Set-Location -LiteralPath $PSScriptRoot

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  Launching MAISHAA WORKSPACE 2 (Production Mode)" -ForegroundColor Cyan
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

# Ensure node_modules exists before build (prevents 'vite not recognized' error)
if (-not (Test-Path "node_modules")) {
    Write-Host "[NOTICE] Dependencies not installed. Running automated setup first..." -ForegroundColor Yellow
    & ".\setup.ps1"
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Automated setup failed." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        Exit 1
    }
}

if (-not (Test-Path "dist\index.html")) {
    Write-Host "[WARNING] Production build (dist\index.html) not found. Building now..." -ForegroundColor Yellow
    npm run build
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Build failed. Please run .\setup.ps1 first." -ForegroundColor Red
        Read-Host "Press Enter to exit..."
        Exit 1
    }
}

Write-Host "Starting production server on port 3000..." -ForegroundColor Green
Write-Host "Serving static assets from dist\ (No Vite dev server needed)" -ForegroundColor Green
Write-Host "Running server.ts via tsx runner..." -ForegroundColor Green
Write-Host "Server-side AI proxy enabled via .env" -ForegroundColor Green
Write-Host ""
Write-Host "Open your web browser at:" -ForegroundColor Yellow
Write-Host "  http://localhost:3000" -ForegroundColor Cyan
Write-Host ""
Write-Host "Press Ctrl+C to stop the server." -ForegroundColor Gray
Write-Host ""

$env:NODE_ENV = "production"
npx tsx server.ts
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Server exited with error code $LASTEXITCODE." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
}
