@echo off
REM Zamar Complete Installation Script
REM Installs Zamar Player Client, Zamar Studio, and Web Platform

setlocal enabledelayedexpansion

echo.
echo ========================================
echo  ZAMAR COMPLETE INSTALLATION
echo ========================================
echo.

REM Check if Node.js is installed
where node >nul 2>nul
if errorlevel 1 (
    echo ERROR: Node.js is not installed. Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
)

REM Check if .NET is installed
where dotnet >nul 2>nul
if errorlevel 1 (
    echo ERROR: .NET SDK is not installed. Please install from https://dotnet.microsoft.com/download
    pause
    exit /b 1
)

echo [1/5] Installing Node.js dependencies...
cd "%~dp0server"
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install server dependencies
    pause
    exit /b 1
)
echo [✓] Server dependencies installed

echo.
echo [2/5] Installing Website (Next.js) dependencies...
cd "%~dp0website"
call npm install
if errorlevel 1 (
    echo ERROR: Failed to install website dependencies
    pause
    exit /b 1
)
echo [✓] Website dependencies installed

echo.
echo [3/5] Building Zamar Player Client...
cd "%~dp0client"
call dotnet restore
if errorlevel 1 (
    echo ERROR: Failed to restore client dependencies
    pause
    exit /b 1
)
call dotnet build -c Release
if errorlevel 1 (
    echo ERROR: Failed to build client
    pause
    exit /b 1
)
echo [✓] Zamar Player Client built successfully

echo.
echo [4/5] Building Zamar Studio...
cd "%~dp0studio"
call dotnet restore
if errorlevel 1 (
    echo ERROR: Failed to restore studio dependencies
    pause
    exit /b 1
)
call dotnet build -c Release
if errorlevel 1 (
    echo ERROR: Failed to build studio
    pause
    exit /b 1
)
echo [✓] Zamar Studio built successfully

echo.
echo [5/5] Setting up database...
cd "%~dp0"

REM Create database tables (requires running server first)
echo To finish setup, please:
echo 1. Run the backend server: cd server ^&^& npm start
echo 2. Run database init script in another terminal

echo.
echo ========================================
echo  INSTALLATION COMPLETE!
echo ========================================
echo.
echo Quick Start:
echo   Backend Server:  cd server ^&^ npm start
echo   Zamar Player:    cd client ^&^ dotnet run
echo   Zamar Studio:    cd studio ^&^ dotnet run
echo   Website:         cd website ^&^ npm run dev
echo.
echo All components are ready to launch!
echo.
pause
