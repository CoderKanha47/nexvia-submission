@echo off
rem =============================================================
rem   Nexvia Workspace - START (quick local testing)
rem
rem   Usage:
rem     start.bat          start web (:3000) + sync (:1234)
rem                         + postgres + redis (docker)
rem     start.bat /full    also start docker sync1 + sync2 + nginx
rem                         (load balancer on :4000, for smoke/load tests)
rem
rem   Safe to re-run: anything already running is detected and skipped.
rem   Non-interactive use:  set NEXVIA_NO_PAUSE=1
rem =============================================================
cd /d "%~dp0"
setlocal

echo ===================================================
echo   Nexvia Workspace - START
echo ===================================================

rem ---- sanity checks ----
where docker >nul 2>nul
if errorlevel 1 (echo [FAIL] Docker not found. Install Docker Desktop. & goto :fail)
docker info >nul 2>nul
if errorlevel 1 (echo [FAIL] Docker is not running. Start Docker Desktop, then retry. & goto :fail)
where node >nul 2>nul
if errorlevel 1 (echo [FAIL] Node.js not found - need Node 20 or newer. & goto :fail)

rem ---- env file ----
if not exist ".env" (
  echo [setup] .env missing - copying .env.example
  copy /y ".env.example" ".env" >nul
)

rem ---- dependencies (first run only) ----
if not exist "node_modules" (
  echo [setup] Installing dependencies - first run only, takes a while...
  call npm install
  if errorlevel 1 goto :fail
)

rem ---- build shared packages ----
echo [build] packages/shared + packages/db ...
call npm run build -w packages/shared
if errorlevel 1 goto :fail
call npm run build -w packages/db
if errorlevel 1 goto :fail

rem ---- infrastructure ----
echo [docker] starting postgres + redis ...
docker compose up -d postgres redis
if errorlevel 1 goto :fail

echo [wait] postgres becoming healthy ...
set "PGID="
for /f %%i in ('docker compose ps -q postgres') do set "PGID=%%i"
if not defined PGID (echo [FAIL] postgres container not found. & goto :fail)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$id = '%PGID%'; for ($i = 0; $i -lt 60; $i++) { $s = docker inspect --format '{{.State.Health.Status}}' $id; if ($s -eq 'healthy') { Write-Host '[ok]    postgres healthy'; exit 0 }; Start-Sleep -Seconds 1 }; Write-Host '[FAIL] postgres not healthy after 60 seconds'; exit 1"
if errorlevel 1 goto :fail

rem ---- migrations + seed (seed is idempotent: upserts + page guard) ----
echo [db] applying migrations ...
call npm run db:deploy
if errorlevel 1 goto :fail
echo [db] seeding demo data - idempotent, safe to re-run ...
call npm run db:seed
if errorlevel 1 goto :fail

rem ---- optional full docker stack ----
if /i "%~1"=="/full" (
  echo [docker] /full: starting sync1 + sync2 + nginx LB on :4000
  docker compose up -d sync1 sync2 nginx
  if errorlevel 1 goto :fail
)

rem ---- dev servers (skipped if port already listening) ----
call :start_dev 1234 apps/sync sync
call :start_dev 3000 apps/web web

rem ---- health checks ----
echo [wait] sync server on :1234 ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = $false; $r = $null; for ($i = 0; $i -lt 20; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:1234/healthz' -UseBasicParsing -TimeoutSec 2; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if ($ok) { Write-Host ('[ok]    sync  ' + $r.Content) } else { Write-Host '[warn]  sync not answering yet - check its console window' }"

echo [wait] web on :3000 - first compile can take a minute ...
powershell -NoProfile -ExecutionPolicy Bypass -Command "$ok = $false; for ($i = 0; $i -lt 60; $i++) { try { $r = Invoke-WebRequest -Uri 'http://localhost:3000' -UseBasicParsing -TimeoutSec 3; if ($r.StatusCode -eq 200) { $ok = $true; break } } catch {}; Start-Sleep -Seconds 1 }; if ($ok) { Write-Host '[ok]    web ready on http://localhost:3000' } else { Write-Host '[warn]  web not responding - check its console. If stuck: stop.bat, delete apps\web\.next, start.bat' }"

echo.
echo ===================================================
echo   Nexvia is UP
echo     Web app      http://localhost:3000
echo     Sync server  ws://localhost:1234
echo     Postgres     localhost:5432
echo     Redis        localhost:6379
echo     Login        alice@demo.dev / password123
if /i "%~1"=="/full" echo     Load balancer http://localhost:4000
echo.
echo   Stop everything with:  stop.bat
echo ===================================================
if not defined NEXVIA_NO_PAUSE pause
exit /b 0

rem ===== %1=port  %2=workspace  %3=name =====
:start_dev
powershell -NoProfile -ExecutionPolicy Bypass -Command "$l = Get-NetTCPConnection -LocalPort %1 -State Listen -ErrorAction SilentlyContinue | Select-Object -First 1; if ($l) { Write-Host ('[ok]    %3 already listening on %1 - PID ' + $l.OwningProcess) } else { $p = Start-Process -FilePath 'cmd.exe' -ArgumentList '/k', 'npm run dev -w %2' -PassThru; Set-Content -Path '.dev-%3.pid' -Value $p.Id; Write-Host ('[start] %3 dev server - console PID ' + $p.Id) }"
exit /b 0

:fail
echo.
echo [FAIL] Start aborted - see messages above.
if not defined NEXVIA_NO_PAUSE pause
exit /b 1
