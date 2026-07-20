@echo off
set NODE_TLS_REJECT_UNAUTHORIZED=0
title Clover Web Service Starter
echo =======================================
echo    Starting Clover Web Services (Windows)
echo =======================================

REM 1. Clean existing ports
echo [1/4] Cleaning existing ports (3000, 3500, 5174)...
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3000" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":3500" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -aon ^| findstr ":5174" ^| findstr "LISTENING"') do (
    taskkill /F /PID %%a >nul 2>&1
)

REM 2. Prepare backend
echo [2/4] Preparing backend server...
cd /d %~dp0backend
if not exist "node_modules" (
    echo node_modules not found in backend. Installing packages...
    call npm install
)
if not exist "node_modules\.prisma" (
    echo Prisma client not found. Generating...
    call npx prisma generate
)

REM 3. Prepare frontend
echo [3/4] Preparing frontend server...
cd /d %~dp0frontend
if not exist "node_modules" (
    echo node_modules not found in frontend. Installing packages...
    call npm install
)

REM 4. Launch servers
echo [4/4] Launching servers in separate windows...
start "Clover Backend" cmd /k "cd /d %~dp0backend && set NODE_TLS_REJECT_UNAUTHORIZED=0 && npm run start:dev"
start "Clover Frontend" cmd /k "cd /d %~dp0frontend && set NODE_TLS_REJECT_UNAUTHORIZED=0 && npm run dev"

REM 5. Wait and open browser
echo Waiting for services to stabilize (5s)...
timeout /t 5 /nobreak >nul

echo Opening browser at http://localhost:5174
start http://localhost:5174

echo =======================================
echo Clover services launched successfully!
echo Close the respective console windows to stop the servers.
echo =======================================
timeout /t 3 >nul
