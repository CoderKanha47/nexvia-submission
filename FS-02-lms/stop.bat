@echo off
title LMS with Live Classes - Shutdown
echo ============================================
echo  LMS with Live Classes - Stopping Services
echo ============================================
echo.

echo [1/4] Stopping Node.js processes (Backend API, Worker, Frontend)...
taskkill /F /FI "WINDOWTITLE eq LMS Backend API" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq LMS Video Worker" >nul 2>&1
taskkill /F /FI "WINDOWTITLE eq LMS Frontend" >nul 2>&1
echo Node.js processes stopped.
echo.

echo [2/4] Stopping Docker infrastructure...
docker compose down
if errorlevel 1 (
    echo WARNING: Docker compose down had issues.
) else (
    echo Docker services stopped.
)
echo.

echo [3/4] Cleaning up any remaining node processes on ports 4000, 5173...
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :4000') do (
    taskkill /F /PID %%a >nul 2>&1
)
for /f "tokens=5" %%a in ('netstat -ano ^| findstr :5173') do (
    taskkill /F /PID %%a >nul 2>&1
)
echo Port cleanup done.
echo.

echo ============================================
echo  All services stopped!
echo ============================================
echo.
pause