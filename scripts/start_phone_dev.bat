@echo off
setlocal EnableExtensions EnableDelayedExpansion

REM One-command mobile dev startup:
REM - Detect current laptop IPv4
REM - Set EXPO_PUBLIC_API_BASE_URL for this terminal session
REM - Start backend in a separate terminal window
REM - Start Expo in LAN mode with cleared cache

cd /d %~dp0\..

echo Detecting local IPv4 address...
set "LOCAL_IP="
for /f "usebackq delims=" %%I in (`powershell -NoProfile -Command "(Get-NetIPAddress -AddressFamily IPv4 | Where-Object { $_.IPAddress -notlike '127.*' -and $_.IPAddress -notlike '169.254.*' -and $_.PrefixOrigin -ne 'WellKnown' } | Sort-Object InterfaceMetric | Select-Object -ExpandProperty IPAddress -First 1)"`) do (
  set "LOCAL_IP=%%I"
)

if not defined LOCAL_IP (
  echo Could not detect local IPv4 automatically.
  echo Set EXPO_PUBLIC_API_BASE_URL in .env manually, then run npm run start:mobile.
  pause
  exit /b 1
)

set "EXPO_PUBLIC_API_BASE_URL=http://%LOCAL_IP%:8082"
set "REACT_NATIVE_PACKAGER_HOSTNAME=%LOCAL_IP%"
set "EXPO_PACKAGER_PROXY_URL=exp://%LOCAL_IP%:8081"
set "DOTENV_CONFIG_QUIET=true"
set "DOTENVX_CONFIG_QUIET=true"
echo Using API base URL: %EXPO_PUBLIC_API_BASE_URL%
echo Using Metro host: %REACT_NATIVE_PACKAGER_HOSTNAME%
echo.
echo Tip: On phone browser, this should open:
echo   http://%LOCAL_IP%:8082/health
echo.

set "API_PID="
for /f "tokens=5" %%P in ('netstat -ano ^| findstr /R /C:":8082 .*LISTENING"') do (
  set "API_PID=%%P"
  goto :api_check_done
)
:api_check_done

if defined API_PID (
  echo Backend already listening on port 8082 ^(PID: !API_PID!^). Reusing it.
) else (
  echo Starting backend in a new terminal...
  start "RasaRight Backend (8082)" cmd /k "cd /d %CD% && start_server.bat"
)

echo Starting Expo for mobile (LAN + clear cache)...
npx expo start --host lan --port 8081 --clear

endlocal
