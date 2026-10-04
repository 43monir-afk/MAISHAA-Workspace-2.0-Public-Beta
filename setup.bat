@echo off
setlocal enabledelayedexpansion

:: 0. Always switch to the script's own directory
cd /d "%~dp0"

echo ===============================================================
echo   MAISHAA WORKSPACE 2 — Windows Automated Setup
echo   Browser-First Local and Private Office Productivity Suite
echo ===============================================================
echo.

:: 1. Check for Node.js
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not installed or not found in system PATH.
    echo Dependencies (including Vite 8) require Node.js ^20.19.0 or ^>=22.12.0.
    echo Please install Node.js LTS from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

:: Enforce dependency-compatible Node version
node scripts\check-node-version.cjs
if %errorlevel% neq 0 (
    echo [ERROR] Incompatible Node.js version detected.
    echo Please upgrade your Node.js installation from: https://nodejs.org/
    echo.
    pause
    exit /b 1
)

for /f "tokens=*" %%v in ('node -v') do set NODE_VERSION=%%v
echo [1/4] Verified compatible Node.js %NODE_VERSION%

:: 2. Check for .env file
echo [2/4] Verifying environment configuration...
if not exist ".env" (
    if exist ".env.example" (
        copy ".env.example" ".env" >nul
        echo       Created .env from .env.example.
        echo       NOTE: To enable optional Gemini AI features, edit .env and insert GEMINI_API_KEY.
        echo       Offline tools (DOCX, PDF, XLSX, PPTX, Forms) work 100%% without any API key.
    ) else (
        echo [WARNING] .env.example not found. Please create .env manually if needed.
    )
) else (
    echo       Found existing .env configuration.
)

:: 3. Install NPM Dependencies
echo [3/4] Installing dependencies via npm install...
call npm install
if %errorlevel% neq 0 (
    echo [ERROR] npm install encountered an error.
    pause
    exit /b %errorlevel%
)

:: 4. Build Production Distribution
echo [4/4] Building production assets (Vite)...
call npm run build
if %errorlevel% neq 0 (
    echo [ERROR] Production build failed.
    pause
    exit /b %errorlevel%
)

echo.
echo ===============================================================
echo   MAISHAA WORKSPACE 2 setup completed successfully!
echo.
echo   To launch production workspace:
echo     Double-click start.bat   (or run: npm start)
echo.
echo   To launch development mode:
echo     Double-click dev.bat     (or run: npm run dev)
echo.
echo   Open your browser at: http://localhost:3000
echo ===============================================================
echo.
pause
