@echo off
echo ======================================================================
echo Executing Backend Audit and End-to-End Verification Test Suites
echo Database: MongoDB (with PyMongo and mongomock)
echo ======================================================================

cd backend
set PYTHONPATH=.

echo.
echo [1/2] Running Pytest Audit Suite (Scenarios T1 to T17 with MongoDB)...
.\venv\Scripts\pytest -v tests/test_audit_scenarios.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Pytest suite failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/2] Running Live Database End-to-End Lifecycle Verification...
.\venv\Scripts\python.exe verify_e2e.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] E2E verification failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo ALL TESTS AND MONGODB DATABASE AUDIT VERIFICATIONS PASSED SUCCESSFULLY!
echo ======================================================================
pause
