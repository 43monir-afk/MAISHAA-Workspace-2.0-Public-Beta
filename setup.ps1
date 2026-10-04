# MAISHAA WORKSPACE 2 — Windows PowerShell Setup Script
# 0. Always switch to the script's own directory
Set-Location -LiteralPath $PSScriptRoot

Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  MAISHAA WORKSPACE 2 — Windows Automated Setup" -ForegroundColor Cyan
Write-Host "  Browser-First Local and Private Office Productivity Suite" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""

# 1. Check for Node.js
try {
    $nodeVer = node -v
    Write-Host "[1/4] Found Node.js $nodeVer" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js is not installed or not in system PATH." -ForegroundColor Red
    Write-Host "Dependencies (including Vite 8) require Node.js LTS (^20.19.0 or >=22.12.0)." -ForegroundColor Yellow
    Write-Host "Please install from https://nodejs.org/" -ForegroundColor Yellow
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

# 2. Check for .env file
Write-Host "[2/4] Verifying environment configuration..." -ForegroundColor Green
if (-not (Test-Path ".env")) {
    if (Test-Path ".env.example") {
        Copy-Item ".env.example" ".env"
        Write-Host "      Created .env from .env.example." -ForegroundColor Green
        Write-Host "      NOTE: To enable optional Gemini AI features, edit .env and insert GEMINI_API_KEY." -ForegroundColor Cyan
        Write-Host "      Offline tools (DOCX, PDF, XLSX, PPTX, Forms) work without any API key." -ForegroundColor Cyan
    } else {
        Write-Host "[WARNING] .env.example not found." -ForegroundColor Yellow
    }
} else {
    Write-Host "      Found existing .env configuration." -ForegroundColor Green
}

# 3. Install NPM Dependencies
Write-Host "[3/4] Installing dependencies via npm install..." -ForegroundColor Green
npm install
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] npm install encountered an error." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    Exit $LASTEXITCODE
}

# 4. Build Production Distribution
Write-Host "[4/4] Building production assets (Vite)..." -ForegroundColor Green
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "[ERROR] Production build failed." -ForegroundColor Red
    Read-Host "Press Enter to exit..."
    Exit $LASTEXITCODE
}

Write-Host ""
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host "  MAISHAA WORKSPACE 2 setup completed successfully!" -ForegroundColor Green
Write-Host ""
Write-Host "  To launch production workspace:" -ForegroundColor Yellow
Write-Host "    Double-click start.bat   (or run: npm start)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  To launch development mode:" -ForegroundColor Yellow
Write-Host "    Double-click dev.bat     (or run: npm run dev)" -ForegroundColor Yellow
Write-Host ""
Write-Host "  Open your browser at: http://localhost:3000" -ForegroundColor Cyan
Write-Host "===============================================================" -ForegroundColor Cyan
Write-Host ""
Read-Host "Press Enter to finish..."
