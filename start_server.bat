@echo off
REM Start the FastAPI backend for RasaRight
REM This script assumes you are in the project root.

cd /d %~dp0
python -m uvicorn backend.app:app --host 0.0.0.0 --port 8082

pause
