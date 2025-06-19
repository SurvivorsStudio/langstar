@echo off
setlocal enabledelayedexpansion
 
echo [INFO] Starting LangStar development server...
 
:: concurrently로 서비스 실행
call npx concurrently --names "FRONTEND,BACKEND" --prefix-colors "bgBlue.bold,bgGreen.bold" --success "first" "npm run dev --prefix ui" "uvicorn server.app:app --reload --log-level info --timeout-keep-alive 5" 