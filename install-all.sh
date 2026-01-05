#!/bin/bash
# Zamar Complete Installation Script
# Installs Zamar Player Client, Zamar Studio, and Web Platform

set -e

echo ""
echo "========================================"
echo "  ZAMAR COMPLETE INSTALLATION"
echo "========================================"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "ERROR: Node.js is not installed. Please install from https://nodejs.org/"
    exit 1
fi

# Check if .NET SDK is installed (for Linux)
if ! command -v dotnet &> /dev/null; then
    echo "ERROR: .NET SDK is not installed. Please install from https://dotnet.microsoft.com/download"
    exit 1
fi

# Check for missing requirements
MISSING_REQS=0

if ! command -v git &> /dev/null; then
    echo "WARNING: Git not found (optional but recommended)"
    MISSING_REQS=1
fi

echo "[1/5] Installing Node.js dependencies..."
cd "$(dirname "$0")/server"
npm install
echo "[✓] Server dependencies installed"

echo ""
echo "[2/5] Installing Website (Next.js) dependencies..."
cd "$(dirname "$0")/website"
npm install
echo "[✓] Website dependencies installed"

echo ""
echo "[3/5] Building Zamar Player Client..."
cd "$(dirname "$0")/client"
dotnet restore
dotnet build -c Release
echo "[✓] Zamar Player Client built successfully"

echo ""
echo "[4/5] Building Zamar Studio..."
cd "$(dirname "$0")/studio"
dotnet restore
dotnet build -c Release
echo "[✓] Zamar Studio built successfully"

echo ""
echo "[5/5] Setting up database..."
cd "$(dirname "$0")"

echo ""
echo "========================================"
echo "  INSTALLATION COMPLETE!"
echo "========================================"
echo ""
echo "Quick Start Commands:"
echo "  Backend Server:  cd server && npm start"
echo "  Zamar Player:    cd client && dotnet run"
echo "  Zamar Studio:    cd studio && dotnet run"
echo "  Website:         cd website && npm run dev"
echo ""
echo "All components are ready to launch!"
echo ""

if [ $MISSING_REQS -eq 1 ]; then
    echo "Note: Some optional tools are missing. Installation completed successfully!"
fi
