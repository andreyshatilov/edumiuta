@echo off
title EduMinuta Startup Manager
echo ====================================================
echo   EduMinuta - Uber for Tutors - Startup
echo ====================================================
echo.

cd /d "%~dp0"

REM 1. Check frontend env
if not exist .env (
    echo [Frontend] Creating .env from .env.example...
    copy .env.example .env >nul
)

REM 2. Check server env
if not exist server\.env (
    echo [Backend] Creating server\.env from server\.env.example...
    copy server\.env.example server\.env >nul
)

echo.
echo [1/3] Installing frontend dependencies...
call npm.cmd install --legacy-peer-deps

echo.
echo [2/3] Installing backend dependencies...
cd server
call npm.cmd install
cd ..

echo.
echo [3/3] Starting servers...

REM Start Backend in a separate window
start "EduMinuta BACKEND" cmd /c "title EduMinuta BACKEND & cd server & npm run start"

REM Start Frontend in a separate window
start "EduMinuta FRONTEND" cmd /c "title EduMinuta FRONTEND & npm run dev"

echo.
echo ====================================================
echo   SERVERS STARTED SUCCESSFULY!
echo   Opening browser in 5 seconds...
echo ====================================================
echo.

timeout /t 5 >nul
start http://localhost:5173

echo.
echo Press any key to close this window.
echo Keep the other command prompt windows open to run the site!
echo.
pause
