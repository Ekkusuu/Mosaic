@echo off
REM Run backend and frontend in separate windows
echo Starting Backend...
start "Backend" cmd /k "uvicorn app.main:app --reload"
echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0my-app && npm run dev"
echo Launched both processes.