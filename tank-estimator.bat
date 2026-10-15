@echo off
chcp 65001 >nul
title Tank Estimator App
REM =====================================
REM Tank Estimator App - Vercel Dev Mode
REM =====================================

echo Starting Tank Estimator...
echo.

REM Set Node.js path
set PATH=%PATH%;C:\Installer\node-v22.18.0-win-x64
set PATH=%PATH%;C:\Installer\node-v22.18.0-win-x64\node_modules\.bin
set PATH=%PATH%;C:\Users\marvin.gonda\AppData\Roaming\npm

REM Go to batch file directory
cd /d "%~dp0"

REM Set environment variables
set SUPABASE_URL=https://akyerfmefdnzxgqqxjwq.supabase.co
set SUPABASE_SERVICE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFreWVyZm1lZmRuenhncXF4andxIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjA0NDM5MSwiZXhwIjoyMDkxNjIwMzkxfQ.geU8hdNT7jyx0wbFLdWZzB4bADbmdEaviUJHjN0EhnM
set JWT_SECRET=tank_estimator_jwt_secret_2024_agp
set GMAIL_APP_PASSWORD=tmxd srrs eitz rnme
set GMAIL_USER=noreply.bytestack@gmail.com

REM Quick check
if not exist "vercel.json" (
    echo ERROR: vercel.json not found.
    pause
    exit /b 1
)

REM Clear any existing processes on port 3000
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)

REM Start vercel dev in a new window with all env vars and PATH passed in
echo Waiting for server to start...
start "Tank Estimator Server" cmd /k "set PATH=%PATH% && set SUPABASE_URL=%SUPABASE_URL% && set SUPABASE_SERVICE_KEY=%SUPABASE_SERVICE_KEY% && set JWT_SECRET=%JWT_SECRET% && cd /d %~dp0 && vercel dev"

REM Wait for server to be ready
:waitloop
timeout /t 2 /nobreak >nul
netstat -an | findstr ":3000.*LISTENING" >nul 2>&1
if errorlevel 1 goto waitloop

echo Server is running!
echo.

REM Launch browser
start "" http://localhost:3000

REM Show available commands
call :show_commands

:commandloop
set /p "cmd=Enter command: "

if /i "%cmd%"=="stop" goto stopserver
if /i "%cmd%"=="browser" (
    start "" http://localhost:3000
    goto commandloop
)
if /i "%cmd%"=="status" (
    netstat -an | findstr ":3000.*LISTENING" >nul 2>&1
    if errorlevel 1 (
        echo Server not running
    ) else (
        echo Server is running on port 3000
    )
    goto commandloop
)
if /i "%cmd%"=="command" (
    call :show_commands
    goto commandloop
)

echo Unknown command. Type COMMAND to see available commands.
goto commandloop

:show_commands
echo Available Commands:
echo   STOP      - Stop the server and exit
echo   BROWSER   - Open app in browser
echo   STATUS    - Check server status
echo   COMMAND   - Show this command list again
echo.
echo Local URL:  http://localhost:3000
echo Live URL:   https://tank-estimator-app.vercel.app
echo.
goto :eof

:stopserver
echo.
echo Stopping Tank Estimator server...
taskkill /FI "WindowTitle eq Tank Estimator Server*" /F >nul 2>&1
for /f "tokens=5" %%a in ('netstat -ano ^| findstr ":3000.*LISTENING" 2^>nul') do (
    taskkill /PID %%a /F >nul 2>&1
)
echo Tank Estimator stopped.
echo.
pause
exit