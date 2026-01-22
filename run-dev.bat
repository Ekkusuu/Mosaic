@echo off
REM Run backend and frontend in separate windows
echo Starting Backend...
start "Backend" cmd /k "venv\Scripts\python.exe -m uvicorn app.main:app --reload --port 8001"
echo Starting Frontend...
start "Frontend" cmd /k "cd /d %~dp0my-app && npm run dev"
echo Launched both processes.
echo.
echo Backend running on: http://localhost:8001
echo Frontend running on: http://localhost:5173 (check Frontend window for actual port)
echo.
echo Note: Backend uses port 8001 to avoid conflict with CompreFace (port 8000)