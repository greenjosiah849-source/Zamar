@echo off
REM Zamar Complete Startup Script for Windows
REM Starts all services and components

setlocal enabledelayedexpansion

echo.
echo =========================================
echo   ZAMAR PLATFORM - STARTUP SEQUENCE
echo =========================================
echo.

REM Check if required programs exist
where node >nul 2>nul
if errorlevel 1 (
    echo WARNING: Node.js not found in PATH
)

where dotnet >nul 2>nul
if errorlevel 1 (
    echo WARNING: .NET SDK not found in PATH
)

echo Available configurations:
echo 1. Start Backend Only (Server on port 3000)
echo 2. Start Zamar Player Client
echo 3. Start Zamar Studio Client
echo 4. Start Website (Next.js on port 3001)
echo 5. Start All Services
echo 6. Admin Login Demo
echo.

REM Function to show admin credentials
echo =========================================
echo   ADMIN ACCOUNTS
echo =========================================
echo.
echo Site Manager (Full Access):
echo   Username: zamar
echo   Password: zamar_secure_pass_123
echo   Role: Site Manager
echo   Access: All admin features
echo.
echo Intern Developer:
echo   Username: Ke_devy
echo   Password: intern_dev_pass_456
echo   Role: Intern
echo   Access: Users, Moderation, Analytics
echo.
echo Testing Account:
echo   Username: games
echo   Password: games_test_pass_789
echo   Role: Test Account
echo   Access: Game testing, party testing
echo.

echo =========================================
echo   QUICK START COMMANDS
echo =========================================
echo.
echo Backend Server:
echo   cd server ^&^ npm start
echo.
echo Zamar Player Client:
echo   cd client ^&^ dotnet run
echo.
echo Zamar Studio Client:
echo   cd studio ^&^ dotnet run
echo.
echo Website:
echo   cd website ^&^ npm run dev
echo.
echo =========================================
echo   RUNNING ALL SERVICES
echo =========================================
echo.
echo To run all services, open 4 separate Command Prompts and run:
echo   1. cd server ^&^ npm start
echo   2. cd client ^&^ dotnet run
echo   3. cd studio ^&^ dotnet run
echo   4. cd website ^&^ npm run dev
echo.
echo Backend: http://localhost:3000
echo Website: http://localhost:3001
echo Admin API: http://localhost:3000/api/admin/login
echo.
echo   API Gateway:   http://localhost:3000
echo   Website:       http://localhost:3001
echo   Database:      localhost:5432
echo   Redis:         localhost:6379
echo.
echo Admin Accounts:
echo   Username: Zamar  ^| Email: admin@zamar.com
echo   Username: games  ^| Email: games@zamar.com
echo.
echo To start individual services:
echo   cd server ^&^& npm install ^&^& npm run dev
echo   cd website ^&^& npm install ^&^& npm run dev
echo.
pause
