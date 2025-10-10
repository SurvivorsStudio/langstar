@echo off
setlocal enabledelayedexpansion

echo [INFO] Setting up Python virtual environment with auto-install...

:: Python 설치 함수 (Windows)
:install_python_windows
echo [INFO] Installing Python 3.12 via winget...

:: winget 설치 확인
winget --version >nul 2>&1
if %errorlevel% neq 0 (
    echo [WARN] winget not found. Installing winget...
    :: winget 설치 (Windows 10/11)
    powershell -Command "Add-AppxPackage -RegisterByFamilyName -MainPackage Microsoft.DesktopAppInstaller_8wekyb3d8bbwe"
)

:: Python 3.12 설치
winget install Python.Python.3.12

if %errorlevel% equ 0 (
    echo [SUCCESS] Python 3.12 installed successfully via winget
    goto :python_installed
)

:: Chocolatey 설치 시도
echo [INFO] Trying Chocolatey...
choco --version >nul 2>&1
if %errorlevel% equ 0 (
    choco install python312 -y
    if %errorlevel% equ 0 (
        echo [SUCCESS] Python 3.12 installed successfully via Chocolatey
        goto :python_installed
    )
)

:: 수동 설치 안내
echo [ERROR] Failed to install Python 3.12 automatically.
echo [INFO] Please install Python 3.12 manually:
echo    Download from: https://www.python.org/downloads/
echo    Make sure to check "Add Python to PATH" during installation
exit /b 1

:python_installed
:: PATH 새로고침
call refreshenv
goto :eof

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
    if %minor_version% geq 12 (
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
    echo [WARN] No compatible Python version found (3.12+ required).
    echo [INFO] Attempting to install Python 3.12 automatically...
    call :install_python_windows
    
    :: 설치 후 다시 확인
    call :check_python_version python3.12
    call :check_python_version python3.11
    call :check_python_version python3
    call :check_python_version python
    
    if "%PYTHON_CMD%"=="" (
        echo [ERROR] Python installation failed. Please install manually.
        exit /b 1
    )
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