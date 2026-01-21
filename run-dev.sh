#!/bin/bash
# Run backend and frontend in separate terminal windows/tabs

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "Starting Backend..."
osascript -e 'tell application "Terminal" to do script "cd '"$SCRIPT_DIR"' && source venv/bin/activate && uvicorn app.main:app --reload"' &

echo "Starting Frontend..."
osascript -e 'tell application "Terminal" to do script "cd '"$SCRIPT_DIR"'/my-app && npm run dev"' &

echo "Launched both processes in new terminal windows."
