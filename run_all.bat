@echo off
echo ======================================================================
echo Starting Smart Campus Service Management System (FastAPI + React Vite)
echo ======================================================================

start "Smart Campus Backend (FastAPI)" cmd /k "cd backend && .\venv\Scripts\uvicorn app.main:app --reload --port 8000"
start "Smart Campus Frontend (React)" cmd /k "cd frontend && npm run dev"

echo.
echo Servers started successfully!
echo Backend API Docs: http://localhost:8000/docs
echo Frontend Portal:  http://localhost:5173
echo.
pause