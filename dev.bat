@echo off
setlocal

:: 0. Always switch to the script's own directory
cd /d "%~dp0"

echo ===============================================================
echo   Launching MAISHAA WORKSPACE 2 (Development Mode)
echo ===============================================================
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in system PATH.
    echo Dependencies require Node.js LTS (^20.19.0 or ^>=22.12.0).
    echo Please install Node.js: https://nodejs.org/
    pause
    exit /b 1
)

:: Enforce dependency-compatible Node version
node scripts\check-node-version.cjs
if %errorlevel% neq 0 (
    echo [ERROR] Node.js version is incompatible with project dependencies.
    pause
    exit /b 1
)

if not exist "node_modules\" (
    echo [WARNING] node_modules not found. Running setup.bat first...
    call setup.bat
    if %errorlevel% neq 0 (
        echo [ERROR] Setup failed.
        pause
        exit /b %errorlevel%
    )
)

echo Starting development server on port 3000...
echo Open your browser at: http://localhost:3000
echo.

call npm run dev
if %errorlevel% neq 0 (
    echo [ERROR] Dev server terminated with error code %errorlevel%.
    pause
)
