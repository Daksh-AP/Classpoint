@echo off
:: ==============================================================================
:: Genatis Board / ClassPoint - 80 OPS Smartboard Delayed Auto-Launch Installer
:: Configures a Windows Scheduled Task to launch the app 10s after logon.
:: This ensures network drivers (Wi-Fi 802.1x), DNS, and display scaling settle
:: before Electron starts, preventing cold-boot black screens and router storms.
:: ==============================================================================

net session >nul 2>&1
if %errorLevel% neq 0 (
    echo [ERROR] This script requires Administrator privileges.
    echo Right-click this file and select "Run as administrator".
    pause
    exit /b 1
)

echo [1/3] Detecting ClassPoint executable path...
set "APP_EXE="
if exist "%ProgramFiles%\Genatis Board\ClassPoint.exe" set "APP_EXE=%ProgramFiles%\Genatis Board\ClassPoint.exe"
if exist "%ProgramFiles%\Genatis Board\genatis-board.exe" set "APP_EXE=%ProgramFiles%\Genatis Board\genatis-board.exe"
if exist "%LOCALAPPDATA%\Programs\ClassPoint\ClassPoint.exe" set "APP_EXE=%LOCALAPPDATA%\Programs\ClassPoint\ClassPoint.exe"
if exist "%LOCALAPPDATA%\Programs\genatis-board\genatis-board.exe" set "APP_EXE=%LOCALAPPDATA%\Programs\genatis-board\genatis-board.exe"

if "%APP_EXE%"=="" (
    echo [WARNING] Default installation paths not found. Using custom or current directory executable.
    if exist "%~dp0..\dist\win-unpacked\ClassPoint.exe" set "APP_EXE=%~dp0..\dist\win-unpacked\ClassPoint.exe"
    if exist "%~dp0ClassPoint.exe" set "APP_EXE=%~dp0ClassPoint.exe"
)

if "%APP_EXE%"=="" (
    echo [ERROR] Could not find ClassPoint.exe. Please install the desktop application first.
    pause
    exit /b 1
)

echo   -> Executable found: %APP_EXE%

echo.
echo [2/3] Removing immediate registry startup entry...
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "genatis-board" /f >nul 2>&1
reg delete "HKCU\Software\Microsoft\Windows\CurrentVersion\Run" /v "ClassPoint" /f >nul 2>&1
echo   -> Registry Run key cleaned.

echo.
echo [3/3] Creating Windows Scheduled Task with 10-second post-logon delay...
schtasks /create /tn "ClassPointSmartboardDelayedLaunch" /tr "\"%APP_EXE%\"" /sc onlogon /delay 0000:10 /rl highest /f

if %errorLevel% equ 0 (
    echo.
    echo ==============================================================================
    echo [SUCCESS] ClassPoint scheduled with 10-second post-boot delay!
    echo Smartboard will now boot smoothly without 7:55 AM network contention.
    echo ==============================================================================
) else (
    echo.
    echo [ERROR] Failed to create scheduled task.
)

pause
