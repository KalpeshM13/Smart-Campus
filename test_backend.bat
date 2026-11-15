@echo off
echo ======================================================================
echo Executing Backend Audit and End-to-End Verification Test Suites
echo Platform: Salesforce Service Cloud + MongoDB
echo ======================================================================

cd backend
set PYTHONPATH=.

echo.
echo [1/3] Running Salesforce Service Cloud Integration Suite (9 Tests)...
.\venv\Scripts\pytest -v tests/test_salesforce_integration.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Salesforce integration suite failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [2/3] Running Pytest Audit Suite (Scenarios T1 to T17 with MongoDB)...
.\venv\Scripts\pytest -v tests/test_audit_scenarios.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] Pytest audit suite failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo [3/3] Running Live Database & Salesforce End-to-End Lifecycle Verification...
.\venv\Scripts\python.exe verify_e2e.py
if %ERRORLEVEL% NEQ 0 (
    echo [ERROR] E2E verification failed!
    pause
    exit /b %ERRORLEVEL%
)

echo.
echo ======================================================================
echo ALL TESTS AND VERIFICATIONS PASSED SUCCESSFULLY! (25 Tests Verified)
echo ======================================================================
pause
