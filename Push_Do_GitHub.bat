@echo off
title Push to GitHub
echo ====================================================
echo   EduMinuta - Push Code to GitHub
echo ====================================================
echo.

REM Force change directory to the folder containing this batch script
cd /d "%~dp0"

REM Check if Git is installed
git --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [ERROR] Git is not installed on this computer!
    echo Please download and install Git from: https://git-scm.com/download/win
    echo After installing, close this window and run the script again.
    echo.
    pause
    exit /b
)

REM Prompt for Repo URL
set /p repo_url="Paste your GitHub repository URL: "

if "%repo_url%"=="" (
    echo [ERROR] URL cannot be empty.
    pause
    exit /b
)

echo.
echo Initializing Git repository...
git init

echo.
echo Configuring git commit identity...
git config user.email "startup@eduminuta.pl"
git config user.name "Eduminuta Developer"
git config --global init.defaultBranch main

echo.
echo Adding files to git tracking...
git add .

echo.
echo Creating code commit snapshot...
git commit -m "EduMinuta production build"

echo.
echo Linking remote repository...
git remote remove origin >nul 2>&1
git remote add origin %repo_url%
git branch -M main

echo.
echo Pushing code to GitHub...
echo ====================================================
echo ATTENTION: A browser window or popup will open now.
echo Please sign in to your GitHub account to authorize the push.
echo ====================================================
echo.

git push -u origin main

echo.
echo ====================================================
echo   SUCCESS! Check your repository page on GitHub.
echo ====================================================
echo.
pause
