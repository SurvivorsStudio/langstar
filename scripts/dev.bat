@echo off
setlocal enabledelayedexpansion

echo 🚀 Starting LangStar development server...

:: 포트 확인 함수
:check_port
set port=%1
set service=%2
netstat -an | findstr ":%port%" | findstr "LISTENING" >nul
if %errorlevel% equ 0 (
    echo ⚠️  Port %port% is already in use. %service% service might be running.
    goto :eof
)
goto :eof

:: 포트 체크
call :check_port 5173 Frontend
call :check_port 8000 Backend

:: 에러 핸들러 함수
:cleanup
echo.
echo ❌ One of the services failed. All services will be terminated.
echo 🧹 Performing cleanup...

:: 프로세스 종료
taskkill /F /IM node.exe /T 2>nul
taskkill /F /IM python.exe /T 2>nul
taskkill /F /IM uvicorn.exe /T 2>nul

echo ✅ Cleanup completed.
exit /b 1

:: 포트 충돌 시 노티만 하고 종료하는 함수
:cleanup_port_conflict
echo.
echo ⚠️  Port conflict detected.
echo 📋 Currently running services:

:: 현재 실행 중인 프로세스 확인
echo Frontend (Port 5173):
netstat -ano | findstr ":5173" | findstr "LISTENING"

echo Backend (Port 8000):
netstat -ano | findstr ":8000" | findstr "LISTENING"

echo.
echo 💡 Solutions:
echo   1. Stop existing services manually: npm run stop-dev
echo   2. Clean ports manually: npm run clean-ports
echo   3. Try again: npm run dev

exit /b 1

:: concurrently로 서비스 실행
call npx concurrently --kill-others-on-fail --handle-input --names "FRONTEND,BACKEND" --prefix-colors "bgBlue.bold,bgGreen.bold" --success "first" "npm run dev --prefix ui" "uvicorn server.app:app --reload --log-level info --timeout-keep-alive 5"

:: concurrently가 실패한 경우
if %errorlevel% neq 0 (
    :: 포트 충돌인지 확인
    netstat -an | findstr ":5173" | findstr "LISTENING" >nul
    if %errorlevel% equ 0 (
        call :cleanup_port_conflict
    ) else (
        netstat -an | findstr ":8000" | findstr "LISTENING" >nul
        if %errorlevel% equ 0 (
            call :cleanup_port_conflict
        ) else (
            call :cleanup
        )
    )
) 