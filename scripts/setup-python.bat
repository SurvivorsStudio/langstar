@echo off
setlocal enabledelayedexpansion

echo [INFO] Setting up Python virtual environment...

:: Python 버전 확인
set PYTHON_CMD=

echo [DEBUG] Checking for Python installations...

:: Python 3.12 확인
python3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.12
    goto :found_python
)

:: Python 3.11 확인
python3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.11
    goto :found_python
)

:: Python 3 확인
python3 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3
    goto :found_python
)

:: Python 확인
python --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python
    goto :found_python
)

:: py 명령어 확인 (Python Launcher)
py --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=py
    goto :found_python
)

:: Python이 없으면 설치 안내 메시지 출력
echo [ERROR] No compatible Python version found (3.11+ required).
echo.
echo [INFO] Python installation required:
echo.
echo    1. Download Python 3.12: https://www.python.org/downloads/release/python-3120/
echo    2. Run the installer
echo    3. Check "Add Python to PATH" during installation
echo    4. Restart your terminal and run this script again
echo.
echo [INFO] Or install using the following command:
echo    winget install Python.Python.3.12
echo.
exit /b 1

:found_python
if "%PYTHON_CMD%"=="" (
    echo [ERROR] PYTHON_CMD is not set
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