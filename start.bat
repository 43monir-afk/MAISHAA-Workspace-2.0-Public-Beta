@echo off
setlocal

:: 0. Always switch to the script's own directory
cd /d "%~dp0"

echo ===============================================================
echo   Launching MAISHAA WORKSPACE 2 (Production Mode)
echo ===============================================================
echo.

:: 1. Check Node.js existence
where node >nul 2>nul
if %errorlevel% neq 0 (
    echo [ERROR] Node.js is not found in system PATH.
    echo Please install Node.js: https://nodejs.org/
    echo Dependencies require Node.js ^20.19.0 or ^>=22.12.0.
    pause
    exit /b 1
)

:: 2. Enforce dependency-compatible Node version
node scripts\check-node-version.cjs
if %errorlevel% neq 0 (
    echo [ERROR] Node.js version is incompatible with project dependencies.
    echo Please upgrade Node.js from: https://nodejs.org/
    pause
    exit /b 1
)

:: 3. Ensure node_modules exists before attempting any build (prevents 'vite not recognized')
if not exist "node_modules\" (
    echo [NOTICE] Dependencies not installed. Running automated setup first...
    call setup.bat
    if %errorlevel% neq 0 (
        echo [ERROR] Automated setup failed. Cannot start application.
        pause
        exit /b %errorlevel%
    )
)

:: 4. Check if production build exists
if not exist "dist\index.html" (
    echo [WARNING] Production build (dist\index.html) not found.
    echo Running production build now...
    call npm run build
    if %errorlevel% neq 0 (
        echo [ERROR] Build failed. Please run setup.bat first.
        pause
        exit /b 1
    )
)

echo Starting production server on port 3000...
echo Serving static files from dist\ (No Vite dev server needed)
echo Running server.ts via tsx runner...
echo Server-side AI proxy enabled via .env
echo.
echo Open your web browser at:
echo   http://localhost:3000
echo.
echo Press Ctrl+C in this console window to stop the server.
echo.

set NODE_ENV=production
call npx tsx server.ts
if %errorlevel% neq 0 (
    echo.
    echo [ERROR] Production server terminated with error code %errorlevel%.
    pause
    exit /b %errorlevel%
)
pause
