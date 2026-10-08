@echo off
cd /d "%~dp0"
py -3 -m venv backend\.venv
if errorlevel 1 exit /b 1
backend\.venv\Scripts\python.exe -m pip install -r backend\requirements.txt
if errorlevel 1 exit /b 1
call npm --prefix frontend ci
if errorlevel 1 exit /b 1
call npm --prefix frontend run build
if errorlevel 1 exit /b 1
echo Setup complete. Run start.bat and open http://localhost:3000
pause
