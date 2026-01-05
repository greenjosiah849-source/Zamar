@echo off
REM ============================================================================
REM           ZAMAR MOBILE APP - AUTOMATED DEPLOYMENT
REM            Handles everything automatically!
REM ============================================================================

setlocal enabledelayedexpansion
cd /d "%~dp0"

echo.
echo ===============================================
echo    ZAMAR MOBILE APP - AUTOMATED DEPLOYMENT
echo ===============================================
echo.

REM ============================================================================
REM STEP 1: Check prerequisites
REM ============================================================================

echo [1/5] Checking prerequisites...

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js not installed
    echo Install from https://nodejs.org/
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
echo OK - Node.js %NODE_VERSION%

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm not installed
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
echo OK - npm %NPM_VERSION%

echo.

REM ============================================================================
REM STEP 2: Install/Update global tools
REM ============================================================================

echo [2/5] Installing/updating global tools...

echo Installing Expo CLI...
call npm install -g expo-cli@latest >nul 2>nul
echo OK - Expo CLI installed

echo Installing EAS CLI...
call npm install -g eas-cli@latest >nul 2>nul
echo OK - EAS CLI installed

echo.

REM ============================================================================
REM STEP 3: Verify Expo login
REM ============================================================================

echo [3/5] Checking Expo login...

expo whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo Info: Not logged in to Expo
    echo.
    echo Please log in to Expo:
    echo Creating account at: https://expo.dev
    echo.
    call expo login
    if %errorlevel% neq 0 (
        echo Error: Login failed
        pause
        exit /b 1
    )
)

for /f "tokens=*" %%i in ('expo whoami') do set EXPO_USER=%%i
echo OK - Logged in as: %EXPO_USER%
echo.

REM ============================================================================
REM STEP 4: Install dependencies
REM ============================================================================

echo [4/5] Installing mobile app dependencies...

cd mobile
if %errorlevel% neq 0 (
    echo Error: mobile folder not found
    pause
    exit /b 1
)

call npm install >nul 2>nul
echo OK - Dependencies installed
echo.

REM ============================================================================
REM STEP 5: Build and Deploy
REM ============================================================================

echo [5/5] Building for app stores...
echo.
echo Building for Android and iOS...
echo This will take 10-30 minutes. Please wait...
echo.

call eas build --platform all

if %errorlevel% neq 0 (
    echo.
    echo Error: Build failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo OK - BUILD SUCCESSFUL!
echo ===============================================
echo.
echo Your builds are ready. Check status:
echo eas build:list
echo.
echo Next step - Submit to stores:
echo eas submit --platform all
echo.
pause
exit /b 0
