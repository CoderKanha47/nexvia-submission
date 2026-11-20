@echo off
rem =============================================================
rem   Nexvia Workspace - STOP (counterpart of start.bat)
rem
rem   Stops:
rem     - dev server consoles started by start.bat (PID files)
rem     - anything still listening on :3000 / :1234 (node/cmd only)
rem     - all docker compose services (data volumes are KEPT)
rem
rem   Non-interactive use:  set NEXVIA_NO_PAUSE=1
rem =============================================================
cd /d "%~dp0"
setlocal

echo ===================================================
echo   Nexvia Workspace - STOP
echo ===================================================

call :stop_pid_file ".dev-sync.pid"
call :stop_pid_file ".dev-web.pid"

rem ---- port listeners: kill the whole ancestor tree ----
rem (e.g. "tsx watch" survives killing its child and respawns it,
rem  so walk up while parents are node/cmd and kill from the top;
rem  two sweeps in case of a respawn in between)
echo [check] leftover listeners on :3000 / :1234 ...
call :kill_ports
ping -n 2 127.0.0.1 >nul
call :kill_ports

echo [docker] stopping compose services - data volumes kept ...
docker compose stop >nul 2>nul
if errorlevel 1 echo [warn]  docker not running or nothing to stop

del ".dev-sync.pid" >nul 2>nul
del ".dev-web.pid" >nul 2>nul

echo.
echo [done]  Dev servers stopped, containers stopped, volumes preserved.
echo         Start again with:  start.bat   - or  start.bat /full
echo ===================================================
if not defined NEXVIA_NO_PAUSE pause
exit /b 0

rem ===== %1 = pid file written by start.bat =====
:stop_pid_file
if not exist "%~1" exit /b 0
set "PID="
set /p PID=<"%~1"
if "%PID%"=="" (del "%~1" & exit /b 0)
powershell -NoProfile -ExecutionPolicy Bypass -Command "$p = Get-CimInstance Win32_Process -Filter 'ProcessId=%PID%'; if ($null -eq $p) { Write-Host ('[ok]    %~1: process %PID% already gone') } elseif ($p.CommandLine -like '*npm run dev*') { Write-Host ('[stop]  %~1: killing console tree PID %PID%'); taskkill /f /t /pid %PID% | Out-Null } else { Write-Host ('[skip]  %~1: PID %PID% is not a dev server - left alone') }"
del "%~1"
exit /b 0

rem ===== one sweep: kill ancestor trees of :3000/:1234 listeners =====
:kill_ports
powershell -NoProfile -ExecutionPolicy Bypass -Command "$pids = Get-NetTCPConnection -LocalPort 3000,1234 -State Listen -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess -Unique; foreach ($p in $pids) { $n = (Get-Process -Id $p -ErrorAction SilentlyContinue).ProcessName; if ($n -ne 'node' -and $n -ne 'cmd') { continue }; $top = $p; $cur = $p; for ($i = 0; $i -lt 12; $i++) { $pp = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $cur); if ($null -eq $pp) { break }; $pa = $pp.ParentProcessId; if ($pa -le 4) { break }; $pn = Get-CimInstance Win32_Process -Filter ('ProcessId=' + $pa); if ($null -eq $pn) { break }; if ($pn.Name -eq 'node.exe' -or $pn.Name -eq 'cmd.exe') { $top = $pa; $cur = $pa } else { break } }; if ($top -eq $p) { Write-Host ('[stop]  listener PID ' + $p) } else { Write-Host ('[stop]  listener PID ' + $p + ' - killing tree from ancestor PID ' + $top) }; taskkill /f /t /pid $top 2>$null | Out-Null }"
exit /b 0
