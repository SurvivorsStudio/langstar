@echo off
setlocal enabledelayedexpansion

echo [INFO] Setting up Python virtual environment...

:: Python 버전 확인 함수
:check_python_version
set python_cmd=%1
set major_version=
set minor_version=

%python_cmd% --version >nul 2>&1
if %errorlevel% neq 0 goto :eof

for /f "tokens=2" %%i in ('%python_cmd% --version 2^>^&1') do set version_output=%%i
for /f "tokens=1,2 delims=." %%a in ("%version_output%") do (
    set major_version=%%a
    set minor_version=%%b
)

if "%major_version%"=="3" (
    if %minor_version% geq 11 (
        set PYTHON_CMD=%python_cmd%
        goto :found_python
    )
)
goto :eof

:: 사용 가능한 Python 버전 찾기
set PYTHON_CMD=

call :check_python_version python3.12
call :check_python_version python3.11
call :check_python_version python3
call :check_python_version python

:found_python
if "%PYTHON_CMD%"=="" (
    echo [ERROR] No compatible Python version found (3.11+ required).
    echo [INFO] Please install Python 3.11 or higher:
    echo    Download from: https://www.python.org/downloads/
    exit /b 1
)

for /f "tokens=*" %%i in ('%PYTHON_CMD% --version') do set PYTHON_VERSION=%%i
echo [SUCCESS] Found compatible Python: %PYTHON_VERSION%

:: 기존 가상환경이 있다면 제거
if exist "server\venv" (
    echo [WARN] Removing existing virtual environment...
    rmdir /s /q server\venv
)

:: 가상환경 생성
echo [INFO] Creating virtual environment with %PYTHON_CMD%...
%PYTHON_CMD% -m venv server\venv

if %errorlevel% neq 0 (
    echo [ERROR] Failed to create virtual environment.
    exit /b 1
)

echo [SUCCESS] Virtual environment created successfully.

:: 가상환경 활성화
echo [INFO] Activating virtual environment...
call server\venv\Scripts\activate.bat

if %errorlevel% neq 0 (
    echo [ERROR] Failed to activate virtual environment.
    exit /b 1
)

echo [SUCCESS] Virtual environment activated.

:: pip 업그레이드
echo [INFO] Upgrading pip...
python -m ensurepip --upgrade
python -m pip install --upgrade pip

if %errorlevel% neq 0 (
    echo [ERROR] Failed to upgrade pip.
    exit /b 1
)

echo [SUCCESS] Pip upgraded successfully.

:: requirements.txt 확인
if not exist "server\requirements.txt" (
    echo [ERROR] server\requirements.txt not found.
    exit /b 1
)

:: 패키지 설치
echo [INFO] Installing Python packages...
pip install -r server\requirements.txt

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install packages.
    exit /b 1
)

echo [SUCCESS] All packages installed successfully.
echo [SUCCESS] Python environment setup completed! 