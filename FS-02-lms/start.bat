@echo off
title LMS with Live Classes - Startup
echo ============================================
echo  LMS with Live Classes - Starting Services
echo ============================================
echo.

echo [1/4] Starting Docker infrastructure (MongoDB, Redis, LiveKit)...
docker compose up -d
if errorlevel 1 (
    echo ERROR: Docker compose failed. Make sure Docker Desktop is running.
    pause
    exit /b 1
)
echo Docker services started.
echo.

echo [2/4] Waiting for Docker services to be ready...
timeout /t 8 /nobreak >nul
echo.

echo [3/4] Starting Backend API server...
start "LMS Backend API" cmd /k "cd /d server && npm run dev"
echo Backend API starting on http://localhost:4000
echo.

echo [4/4] Starting Video Transcode Worker...
start "LMS Video Worker" cmd /k "cd /d server && npm run worker"
echo Video worker starting.
echo.

echo [5/5] Starting Frontend dev server...
start "LMS Frontend" cmd /k "cd /d client && npm run dev"
echo Frontend starting on http://localhost:5173
echo.

echo [6/6] Waiting for Backend API to be healthy...
:wait_for_api
timeout /t 2 /nobreak >nul
curl -s -o nul -w "%%{http_code}" http://localhost:4000/api/v1/health | findstr /r /c:"200" >nul
if errorlevel 1 (
    echo   ... waiting for API ...
    goto wait_for_api
)
echo Backend API is healthy!
echo.

echo ============================================
echo  All services started and verified!
echo ============================================
echo.
echo Backend API:     http://localhost:4000/api/v1
echo Health check:    http://localhost:4000/api/v1/health
echo Frontend:        http://localhost:5173
echo LiveKit:         ws://localhost:7880
echo.
echo To seed demo data, run in a new terminal:
echo   cd server && npx tsx ../scripts/seed.ts
echo.
echo Demo credentials (after seeding):
echo   Admin:     admin@example.com / password123
echo   Instructor: instructor1@example.com / password123
echo   Student:   student1@example.com / password123
echo.
echo Each service runs in its own window. Close them or run stop.bat to shut down.
echo.
pause >nul