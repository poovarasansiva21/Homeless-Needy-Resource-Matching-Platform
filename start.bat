@echo off
TITLE SAHAAYAA AI - System Launcher
COLOR 0A

echo ======================================================================
echo                 SAHAAYAA AI PLATFORM LAUNCHER
echo     AI-Powered Homeless & Needy Resource Matching Platform
echo ======================================================================
echo.

REM Move to project directory
cd /d "%~dp0"

echo [1/3] Checking Machine Learning Model...
if not exist "backend\ml\resource_classifier.keras" (
    echo [Notice] Pre-trained DNN model not found. Training model now...
    python backend\ml\generate_dataset.py
    python backend\ml\train.py
) else (
    echo [OK] Pre-trained TensorFlow DNN model verified.
)

echo.
echo [2/3] Starting Backend Server (Flask + Flask-SocketIO + SQLAlchemy)...
start "SAHAAYAA AI - Backend Server" cmd /k "cd /d ""%~dp0backend"" && python app.py"

echo [3/3] Starting Frontend Dev Server (React + Vite + TypeScript)...
start "SAHAAYAA AI - Frontend Web Client" cmd /k "cd /d ""%~dp0frontend"" && npm run dev"

echo.
echo ======================================================================
echo All services launched!
echo Backend API & WebSockets: http://127.0.0.1:5000
echo Frontend Application:     http://localhost:5173
echo.
echo Opening SAHAAYAA AI in your browser in 3 seconds...
echo ======================================================================
timeout /t 3 >nul
start http://localhost:5173

pause
