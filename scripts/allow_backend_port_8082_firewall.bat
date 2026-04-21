@echo off
REM Prefer allow_rasaright_dev_firewall.bat (opens Metro 8081 + API 8082).
REM This file only adds the API port.
REM Allow inbound TCP 8082 so phones / other devices on the same Wi-Fi or hotspot can reach FastAPI.
REM If you see "Access is denied", right-click this file -> Run as administrator.

netsh advfirewall firewall show rule name="RasaRight Backend 8082" >nul 2>&1
if %errorlevel%==0 (
  echo Rule "RasaRight Backend 8082" already exists.
) else (
  netsh advfirewall firewall add rule name="RasaRight Backend 8082" dir=in action=allow protocol=TCP localport=8082 profile=any
  if errorlevel 1 (
    echo Failed to add rule. Try: Right-click this file -^> Run as administrator.
    pause
    exit /b 1
  )
  echo Added inbound rule for TCP port 8082.
)
pause
