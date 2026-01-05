@echo off
REM ============================================================================
REM        ZAMAR MOBILE APP - AUTOMATED SUBMISSION SCRIPT
REM      Submits your built apps to Google Play and App Store!
REM ============================================================================

setlocal enabledelayedexpansion

echo.
echo ===============================================
echo    ZAMAR MOBILE APP - AUTOMATED SUBMISSION
echo ===============================================
echo.

REM ============================================================================
REM STEP 1: Check if build exists
REM ============================================================================

echo [1/3] Checking for available builds...
echo.

eas build:list --limit 1 >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: No builds found
    echo.
    echo First, run: eas build --platform all
    pause
    exit /b 1
)

echo OK - Builds found
echo.
eas build:list --limit 2
echo.

REM ============================================================================
REM STEP 2: Verify Expo login
REM ============================================================================

echo [2/3] Verifying Expo login...
echo.

expo whoami >nul 2>nul
if %errorlevel% neq 0 (
    echo Error: Not logged in
    echo Run: expo login
    pause
    exit /b 1
)

for /f "tokens=*" %%i in ('expo whoami') do set EXPO_USER=%%i
echo OK - Logged in as: %EXPO_USER%
echo.

REM ============================================================================
REM STEP 3: Submit to App Stores
REM ============================================================================

echo [3/3] Submitting to app stores...
echo.

set /p CONFIRM="Submit to Google Play and App Store? (y/n): "

if /i not "%CONFIRM%"=="y" (
    echo Submission cancelled
    pause
    exit /b 0
)

echo.
echo Submitting to stores...
echo.

call eas submit --platform all

if %errorlevel% neq 0 (
    echo.
    echo Error: Submission failed
    pause
    exit /b 1
)

echo.
echo ===============================================
echo OK - SUBMISSION COMPLETE!
echo ===============================================
echo.
echo Your apps are now under review:
echo   - Google Play: 24-48 hours
echo   - App Store: 1-5 days
echo.
echo Check status:
echo   Google Play Console: https://play.google.com/apps/publish
echo   App Store Connect: https://appstoreconnect.apple.com
echo.
pause
exit /b 0
