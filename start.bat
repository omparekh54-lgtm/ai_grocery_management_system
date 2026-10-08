@echo off
cd /d "%~dp0"
start "Kitchenly Backend" cmd /k "cd /d backend && .venv\Scripts\python.exe -m uvicorn app.main:app --host 127.0.0.1 --port 8000"
start "Kitchenly Frontend" cmd /k "cd /d frontend && npm run start"
echo Open http://localhost:3000 after both services start.
echo Close both server windows to stop the app.
