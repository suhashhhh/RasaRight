@echo off
REM Opens Windows Firewall for RasaRight dev on a hotspot / LAN:
REM   - Metro (Expo default port 8081)
REM   - FastAPI (8082)
REM Right-click -> Run as administrator if you see "Access is denied".

call :add_rule "RasaRight Metro 8081" 8081
call :add_rule "RasaRight Backend 8082" 8082
echo.
echo Done. Restart Metro and the Python server, then open a fresh Expo QR (not exp://127.0.0.1).
pause
exit /b 0

:add_rule
set "RULE_NAME=%~1"
set "PORT=%~2"
netsh advfirewall firewall show rule name="%RULE_NAME%" >nul 2>&1
if %errorlevel%==0 (
  echo Rule "%RULE_NAME%" already exists.
  goto :eof
)
netsh advfirewall firewall add rule name="%RULE_NAME%" dir=in action=allow protocol=TCP localport=%PORT% profile=any
if errorlevel 1 (
  echo Failed to add "%RULE_NAME%". Run this file as Administrator.
  goto :eof
)
echo Added inbound TCP %PORT% ^(%RULE_NAME%^).
goto :eof
