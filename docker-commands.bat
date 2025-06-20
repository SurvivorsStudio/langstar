@echo off
REM LangStar Docker Commands for Windows

if "%1"=="help" goto help
if "%1"=="dev" goto dev
if "%1"=="prod" goto prod
if "%1"=="build" goto build
if "%1"=="up" goto up
if "%1"=="down" goto down
if "%1"=="clean" goto clean
if "%1"=="logs" goto logs
if "%1"=="frontend" goto frontend
if "%1"=="backend" goto backend
if "%1"=="health" goto health
if "%1"=="install" goto install
if "%1"=="status" goto status

echo Usage: docker-commands.bat [command]
echo.
goto help

:help
echo LangStar Docker Commands for Windows:
echo   docker-commands.bat dev      - Start development environment
echo   docker-commands.bat prod     - Start production environment
echo   docker-commands.bat build    - Build all images
echo   docker-commands.bat up       - Start services
echo   docker-commands.bat down     - Stop services
echo   docker-commands.bat clean    - Clean up containers and images
echo   docker-commands.bat logs     - Show logs
echo   docker-commands.bat frontend - Build and run frontend only
echo   docker-commands.bat backend  - Build and run backend only
echo   docker-commands.bat health   - Health check
echo   docker-commands.bat install  - Install dependencies
echo   docker-commands.bat status   - Check Docker status
goto end

:dev
echo Starting development environment...
docker-compose up --build
goto end

:prod
echo Starting production environment...
docker-compose -f docker-compose.yml -f docker-compose.prod.yml up --build -d
goto end

:build
echo Building all images...
docker-compose build
goto end

:up
echo Starting services...
docker-compose up -d
goto end

:down
echo Stopping services...
docker-compose down
goto end

:clean
echo Cleaning up containers and images...
docker-compose down -v --rmi all
docker system prune -f
goto end

:logs
echo Showing logs...
docker-compose logs -f
goto end

:frontend
echo Building and running frontend only...
docker-compose up --build frontend
goto end

:backend
echo Building and running backend only...
docker-compose up --build backend
goto end

:health
echo Checking frontend health...
powershell -Command "try { Invoke-WebRequest -Uri http://localhost/health -UseBasicParsing | Out-Null; Write-Host 'Frontend is healthy' } catch { Write-Host 'Frontend is not healthy' }"
echo Checking backend health...
powershell -Command "try { Invoke-WebRequest -Uri http://localhost:8000/health -UseBasicParsing | Out-Null; Write-Host 'Backend is healthy' } catch { Write-Host 'Backend is not healthy' }"
goto end

:install
echo Installing frontend dependencies...
cd ui && npm install
echo Installing backend dependencies...
cd server && pip install -r requirements.txt
goto end

:status
echo Checking Docker status...
docker --version
docker-compose --version
echo Docker containers:
docker ps -a
goto end

:end 