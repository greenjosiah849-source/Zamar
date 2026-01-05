#!/bin/bash

echo "================================================"
echo "Zamar Platform - Complete Build Verification"
echo "================================================"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Track results
TOTAL=0
PASSED=0
FAILED=0

check_file() {
  local file=$1
  local name=$2
  TOTAL=$((TOTAL + 1))
  
  if [ -f "$file" ]; then
    echo -e "${GREEN}✓${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $name (missing: $file)"
    FAILED=$((FAILED + 1))
  fi
}

check_dir() {
  local dir=$1
  local name=$2
  TOTAL=$((TOTAL + 1))
  
  if [ -d "$dir" ]; then
    echo -e "${GREEN}✓${NC} $name"
    PASSED=$((PASSED + 1))
  else
    echo -e "${RED}✗${NC} $name (missing: $dir)"
    FAILED=$((FAILED + 1))
  fi
}

echo -e "${BLUE}=== LAUNCHER CLIENT ===${NC}"
check_file "client/Views/LauncherWindow.xaml" "Launcher UI (XAML)"
check_file "client/Views/LauncherWindow.xaml.cs" "Launcher Logic (C#)"
check_file "client/Views/GameWindow.xaml" "Game Window UI (XAML)"
check_file "client/Views/GameWindow.xaml.cs" "Game Window Logic (C#)"
check_dir "client/Controllers" "Controllers Directory"
check_file "client/Controllers/GameLauncherController.cs" "Game Launcher Controller"
check_file "client/Controllers/InputController.cs" "Input Controller"
check_dir "client/Services" "Services Directory"
check_file "client/Services/GameSessionService.cs" "Game Session Service"
check_file "client/Models/GameModels.cs" "Game Models"

echo ""
echo -e "${BLUE}=== SERVER BACKEND ===${NC}"
check_file "server/src/index.js" "Server Main Entry"
check_file "server/src/game-session-manager.js" "Game Session Manager"
check_file "server/src/routes/multiplayer.js" "Multiplayer Routes"
check_file "server/src/middleware/game-auth.js" "Game Authentication"
check_file "server/package.json" "Server Dependencies"

echo ""
echo -e "${BLUE}=== DATABASE ===${NC}"
check_file "database/schema.sql" "Database Schema"
check_file "database/schema-extended.sql" "Extended Schema"

echo ""
echo -e "${BLUE}=== CONFIGURATION ===${NC}"
check_file "docker-compose.yml" "Docker Compose"

echo ""
echo "================================================"
echo -e "${BLUE}SUMMARY${NC}"
echo "================================================"
echo -e "Total Checks: $TOTAL"
echo -e "${GREEN}Passed: $PASSED${NC}"
echo -e "${RED}Failed: $FAILED${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
  echo -e "${GREEN}✓ All components ready!${NC}"
  echo ""
  echo "Next steps:"
  echo "1. Backend: cd server && npm install && npm start"
  echo "2. Client: Open client/ZamarPlayer.csproj in Visual Studio"
  echo "3. Build: dotnet build client/"
  echo "4. Run launcher: dotnet run --project client/"
  exit 0
else
  echo -e "${RED}✗ Some components are missing${NC}"
  exit 1
fi
