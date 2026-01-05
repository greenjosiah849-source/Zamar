@echo off
REM Zamar Platform Setup Script (Windows)

echo ================================
echo Zamar Platform Setup
echo ================================

REM Check prerequisites
echo Checking prerequisites...

docker --version >nul 2>&1
if errorlevel 1 (
    echo Docker is not installed. Please install Docker Desktop.
    pause
    exit /b 1
)

docker-compose --version >nul 2>&1
if errorlevel 1 (
    echo Docker Compose is not installed.
    pause
    exit /b 1
)

REM Create .env files
echo Creating environment files...

if not exist "server\.env" (
    copy server\.env.example server\.env
    echo Created server\.env
)

if not exist "website\.env" (
    copy website\.env.example website\.env
    echo Created website\.env
)

REM Start Docker containers
echo Starting Docker containers...
docker-compose up -d

timeout /t 5 /nobreak

REM Show status
echo.
echo Checking services...
curl http://localhost:3000/health >nul 2>&1 && echo OK: API Gateway running on :3000 || echo FAIL: API Gateway

echo.
echo ================================
echo Zamar Platform Starting...
echo ================================
echo.
echo Access the platform at:
echo   Website:  http://localhost:3001
echo   API:      http://localhost:3000
echo   Database: localhost:5432
echo   Redis:    localhost:6379
echo.
echo Default Admin Accounts:
echo   Username: Zamar    ^| Email: admin@zamar.com
echo   Username: games    ^| Email: games@zamar.com
echo.
pause
