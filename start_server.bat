@echo off
REM Start the FastAPI backend for RasaRight
REM This script assumes you are in the project root.
REM If Expo Go or the API cannot connect from your phone, run scripts\allow_rasaright_dev_firewall.bat as Administrator once (opens Metro + API ports).

cd /d %~dp0
echo API: http://0.0.0.0:8082  (phone: use this PC's IPv4, e.g. http://172.20.10.3:8082/health )
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8082

pause
