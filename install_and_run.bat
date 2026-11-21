@echo off
setlocal EnableExtensions
cd /d "%~dp0"
title MAISHAA WORKSPACE 2 - Install and Run
set "LOG=%~dp0setup_log.txt"
echo ==== %date% %time% ==== > "%LOG%"

echo ===============================================================
echo   MAISHAA WORKSPACE 2 - Install and Run
echo   Double-click once. It installs what is missing, then starts.
echo   Keep this window open while you use the app.
echo ===============================================================
echo.

rem ---------------- 1. Node.js ----------------
where node >nul 2>nul
if not errorlevel 1 goto node_found

echo [1/5] Node.js is not installed. Trying to install it automatically...
echo node missing >> "%LOG%"
where winget >nul 2>nul
if errorlevel 1 goto node_manual
winget install -e --id OpenJS.NodeJS.LTS --accept-package-agreements --accept-source-agreements
if exist "%ProgramFiles%\nodejs\node.exe" set "PATH=%ProgramFiles%\nodejs;%PATH%"
where node >nul 2>nul
if not errorlevel 1 goto node_found

:node_manual
echo.
echo [ERROR] Node.js could not be installed automatically.
echo Please install the LTS version from https://nodejs.org/
echo then restart the computer and run this file again.
echo node install failed >> "%LOG%"
start "" https://nodejs.org/
goto finish

:node_found
node scripts\check-node-version.cjs
if errorlevel 1 goto node_manual
for /f "tokens=*" %%v in ('node -v') do set "NODEV=%%v"
echo [1/5] Node.js %NODEV% is OK
echo node %NODEV% >> "%LOG%"

rem ---------------- 2. .env ----------------
if exist ".env" goto env_done
if exist ".env.example" copy ".env.example" ".env" >nul
echo [2/5] Created .env
:env_done
echo [2/5] Settings file is ready

rem ---------------- 3. Packages ----------------
if exist "node_modules\.bin\vite.cmd" if exist "node_modules\.bin\tsx.cmd" goto deps_done
echo [3/5] Installing packages. First time only, internet needed, can take several minutes...
echo npm install start >> "%LOG%"
call npm install
if errorlevel 1 goto fail_install
:deps_done
echo [3/5] Packages are ready

rem ---------------- 4. Build ----------------
if exist "dist\index.html" goto build_done
echo [4/5] Building the app. First time only...
echo npm build start >> "%LOG%"
call npm run build
if errorlevel 1 goto fail_build
:build_done
echo [4/5] App is built

rem ---------------- 5. Start ----------------
netstat -ano | findstr /R /C:":3000 .*LISTENING" >nul
if not errorlevel 1 goto already_running

echo [5/5] Starting the app on http://localhost:3000
echo.
echo The browser will open by itself in a few seconds.
echo To stop the app press Ctrl+C in this window, or close it.
echo.
start "" /min cmd /c "timeout /t 8 /nobreak >nul & start http://localhost:3000"
set NODE_ENV=production
call npx tsx server.ts
echo server stopped with code %errorlevel% >> "%LOG%"
echo.
echo The app has stopped. Read any message above.
goto finish

:already_running
echo Something is already running on port 3000, probably this app.
echo Opening it in your browser...
start "" http://localhost:3000
goto finish

:fail_install
echo.
echo [ERROR] Package installation failed. Check the internet connection and run this file again.
echo If it keeps failing, take a screenshot of this window and send it.
echo npm install failed >> "%LOG%"
goto finish

:fail_build
echo.
echo [ERROR] Building the app failed. Take a screenshot of this window and send it.
echo npm build failed >> "%LOG%"
goto finish

:finish
echo.
pause
endlocal
