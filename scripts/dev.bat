@echo off
setlocal enabledelayedexpansion
 
echo [INFO] Starting LangStar development server...
 
:: Check virtual environment
if not exist "server\venv\Scripts\activate.bat" (
    echo [ERROR] Virtual environment not found. Please run 'npm run setup-python:win32' first.
    exit /b 1
)

echo [INFO] Activating Python virtual environment...
call server\venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    exit /b 1
)

echo [SUCCESS] Virtual environment activated.

:: Start services with concurrently
echo [INFO] Starting frontend and backend services...
npx concurrently --names "FRONTEND,BACKEND" --prefix-colors "bgBlue.bold,bgGreen.bold" --success "first" "npm run dev --prefix ui" "uvicorn server.app:app --reload --log-level info --timeout-keep-alive 5" 