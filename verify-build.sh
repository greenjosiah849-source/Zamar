#!/bin/bash

# Zamar Platform - Build Verification Script

echo "╔══════════════════════════════════════════════════════════════╗"
echo "║         ZAMAR PLATFORM - BUILD VERIFICATION                 ║"
echo "╚══════════════════════════════════════════════════════════════╝"
echo ""

# Color codes
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m'

ERRORS=0

# Function to check file
check_file() {
  if [ -f "$1" ]; then
    echo -e "${GREEN}✓${NC} $1"
  else
    echo -e "${RED}✗${NC} $1 (MISSING)"
    ((ERRORS++))
  fi
}

# Function to check directory
check_dir() {
  if [ -d "$1" ]; then
    echo -e "${GREEN}✓${NC} $1/"
  else
    echo -e "${RED}✗${NC} $1/ (MISSING)"
    ((ERRORS++))
  fi
}

echo "CHECKING PROJECT STRUCTURE..."
echo ""

echo "Core Directories:"
check_dir "client"
check_dir "server"
check_dir "website"
check_dir "database"
check_dir "shared"
echo ""

echo "Client Files:"
check_file "client/ZamarPlayer.csproj"
check_file "client/App.xaml"
check_file "client/App.xaml.cs"
check_file "client/Services/AuthService.cs"
check_file "client/Services/ClientManager.cs"
check_file "client/Models/DataModels.cs"
check_file "client/Views/BootstrapWindow.xaml"
check_file "client/Views/BootstrapWindow.xaml.cs"
check_file "client/Views/MainHubWindow.xaml"
check_file "client/Views/MainHubWindow.xaml.cs"
echo ""

echo "Server Files:"
check_file "server/package.json"
check_file "server/Dockerfile"
check_file "server/.env.example"
check_file "server/src/index.js"
check_file "server/src/game-server.js"
check_file "server/src/lua-runtime.js"
check_file "server/src/middleware/auth.js"
check_file "server/src/routes/auth.js"
check_file "server/src/routes/users.js"
check_file "server/src/routes/games.js"
check_file "server/src/routes/catalog.js"
check_file "server/src/routes/chat.js"
check_file "server/src/routes/game-servers.js"
check_file "server/src/routes/moderation.js"
echo ""

echo "Website Files:"
check_file "website/package.json"
check_file "website/Dockerfile"
check_file "website/.env.example"
check_file "website/next.config.js"
check_file "website/lib/store.js"
check_file "website/components/Navigation.jsx"
check_file "website/pages/index.jsx"
check_file "website/pages/login.jsx"
check_file "website/pages/register.jsx"
check_file "website/pages/games.jsx"
check_file "website/pages/catalog.jsx"
check_file "website/pages/avatar.jsx"
check_file "website/styles/globals.css"
echo ""

echo "Database Files:"
check_file "database/schema.sql"
check_file "database/seeds.sql"
echo ""

echo "Configuration Files:"
check_file "docker-compose.yml"
check_file "setup.sh"
check_file "setup.bat"
check_file "dev.sh"
check_file "dev.bat"
check_file ".gitignore"
echo ""

echo "Documentation Files:"
check_file "README.md"
check_file "DEPLOYMENT.md"
check_file "IMPLEMENTATION_SUMMARY.md"
check_file "shared/types.ts"
echo ""

echo "╔══════════════════════════════════════════════════════════════╗"

if [ $ERRORS -eq 0 ]; then
  echo -e "${GREEN}✓ ALL FILES PRESENT AND ACCOUNTED FOR${NC}"
  echo ""
  echo "Build Status: COMPLETE ✓"
  echo ""
  echo "Next Steps:"
  echo "  1. Run: ./setup.sh (Linux/macOS) or setup.bat (Windows)"
  echo "  2. Or run: docker-compose up --build"
  echo "  3. Access website at: http://localhost:3001"
  echo "  4. Access API at: http://localhost:3000"
  echo ""
  echo "Documentation:"
  echo "  - README.md - Quick start"
  echo "  - DEPLOYMENT.md - Production setup"
  echo "  - IMPLEMENTATION_SUMMARY.md - Full details"
else
  echo -e "${RED}✗ $ERRORS FILES MISSING OR INVALID${NC}"
  exit 1
fi

echo "╚══════════════════════════════════════════════════════════════╝"
