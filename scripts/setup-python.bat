@echo off
setlocal enabledelayedexpansion

echo [INFO] Setting up Python virtual environment...

:: Python 버전 확인 (3.12/3.11 우선 - pydantic-core 휠 사용, 3.14는 소스 빌드로 Rust 필요)
set PYTHON_CMD=

echo [DEBUG] Checking for Python installations...

:: Python Launcher로 3.12 명시 (권장 - 미리 빌드된 휠 사용)
py -3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3.12"
    goto :found_python
)

:: Python Launcher로 3.11 명시
py -3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    set "PYTHON_CMD=py -3.11"
    goto :found_python
)

:: python3.12 / python3.11 직접 경로
python3.12 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.12
    goto :found_python
)
python3.11 --version >nul 2>&1
if %errorlevel% equ 0 (
    set PYTHON_CMD=python3.11
    goto :found_python
)

:: 3.12/3.11만 허용 (3.14 등은 pydantic-core 휠 없음 - Rust 필요)
echo [ERROR] Python 3.12 or 3.11 not found. This project requires 3.12 or 3.11.
echo.
echo [INFO] Install Python 3.12 (recommended):
echo    winget install Python.Python.3.12
echo.
echo [INFO] Or download: https://www.python.org/downloads/release/python-3120/
echo        Install with "Add Python to PATH" checked, then restart terminal.
echo.
exit /b 1

:found_python
if "%PYTHON_CMD%"=="" (
    echo [ERROR] PYTHON_CMD is not set
    exit /b 1
)

for /f "tokens=*" %%i in ('%PYTHON_CMD% --version 2^>nul') do set PYTHON_VERSION=%%i
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

:: Rust(Cargo)가 있으면 PATH에 추가 (일부 패키지 빌드 시 필요)
if exist "%USERPROFILE%\.cargo\bin\cargo.cmd" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"
if exist "%USERPROFILE%\.cargo\bin\cargo.exe" set "PATH=%USERPROFILE%\.cargo\bin;%PATH%"

:: 패키지 설치
echo [INFO] Installing Python packages...
pip install -r server\requirements.txt

if %errorlevel% neq 0 (
    echo [ERROR] Failed to install packages.
    exit /b 1
)

echo [SUCCESS] All packages installed successfully.
echo [SUCCESS] Python environment setup completed!