@echo off
REM ============================================================================
REM                    ZAMAR - COMPLETE SETUP & DEPLOYMENT
REM ============================================================================

echo.
echo ==========================================
echo ZAMAR DEPLOYMENT SETUP
echo ==========================================
echo.

REM ============================================================================
REM STEP 1: Check Node.js and npm
REM ============================================================================

echo [1/5] Checking Node.js and npm installation...
echo.

where node >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Node.js is not installed
    echo Please install Node.js from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('node --version') do set NODE_VERSION=%%i
    echo OK - Node.js installed: %NODE_VERSION%
)

where npm >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: npm is not installed
    echo Please install npm from https://nodejs.org/
    pause
    exit /b 1
) else (
    for /f "tokens=*" %%i in ('npm --version') do set NPM_VERSION=%%i
    echo OK - npm installed: %NPM_VERSION%
)

echo.

REM ============================================================================
REM STEP 2: Install Global Tools
REM ============================================================================

echo [2/5] Installing global development tools...
echo.

echo Installing Expo CLI globally...
call npm install -g expo-cli@latest
if %errorlevel% neq 0 goto error

echo Installing EAS CLI globally...
call npm install -g eas-cli@latest
if %errorlevel% neq 0 goto error

echo.

REM ============================================================================
REM STEP 3: Setup Mobile App
REM ============================================================================

echo [3/5] Setting up mobile app...
echo.

if exist mobile (
    echo Found mobile directory
    cd mobile
    echo Installing mobile app dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error installing mobile dependencies
        cd ..
        pause
        exit /b 1
    )
    echo OK - Mobile app dependencies installed
    cd ..
) else (
    echo Error: mobile directory not found
)

echo.

REM ============================================================================
REM STEP 4: Setup Server
REM ============================================================================

echo [4/5] Setting up backend server...
echo.

if exist server (
    echo Found server directory
    cd server
    echo Installing server dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error installing server dependencies
        cd ..
        pause
        exit /b 1
    )
    echo OK - Server dependencies installed
    cd ..
) else (
    echo Error: server directory not found
)

echo.

REM ============================================================================
REM STEP 5: Setup Website
REM ============================================================================

echo [5/5] Setting up website...
echo.

if exist website (
    echo Found website directory
    cd website
    echo Installing website dependencies...
    call npm install
    if %errorlevel% neq 0 (
        echo Error installing website dependencies
        cd ..
        pause
        exit /b 1
    )
    echo OK - Website dependencies installed
    cd ..
) else (
    echo Error: website directory not found
)

echo.
echo ==========================================
echo OK - SETUP COMPLETE!
echo ==========================================
echo.
echo Next steps:
echo.
echo 1. TEST MOBILE APP LOCALLY:
echo    cd mobile
echo    expo start
echo    (Scan QR code with Expo Go app)
echo.
echo 2. BUILD FOR APP STORES:
echo    cd mobile
echo    eas build --platform all
echo.
echo 3. SUBMIT TO APP STORES:
echo    cd mobile
echo    eas submit --platform all
echo.
echo 4. START BACKEND SERVER:
echo    cd server
echo    npm start
echo.
echo 5. START WEBSITE:
echo    cd website
echo    npm run dev
echo.
pause
exit /b 0

:error
echo.
echo Error occurred during setup
pause
exit /b 1
