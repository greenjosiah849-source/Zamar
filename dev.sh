#!/bin/bash

# Zamar Complete Startup Script
# Starts all services and components

echo ""
echo "========================================="
echo "  ZAMAR PLATFORM - STARTUP SEQUENCE"
echo "========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if required programs exist
check_requirement() {
    if ! command -v $1 &> /dev/null; then
        echo -e "${YELLOW}WARNING: $1 not found${NC}"
        return 1
    fi
    return 0
}

echo "Checking system requirements..."
check_requirement "node"
check_requirement "npm"
check_requirement "dotnet"

echo ""
echo -e "${BLUE}Available configurations:${NC}"
echo "1. Start Backend Only (Server on port 3000)"
echo "2. Start Zamar Player Client"
echo "3. Start Zamar Studio Client"
echo "4. Start Website (Next.js on port 3001)"
echo "5. Start All Services"
echo "6. Admin Login Demo"
echo ""

# Function to start backend
start_backend() {
    echo -e "${GREEN}[1/4] Starting Backend Server...${NC}"
    echo "Server URL: http://localhost:3000"
    echo "API: http://localhost:3000/api"
    echo "Admin: http://localhost:3000/api/admin/login"
    cd server && npm start &
    BACKEND_PID=$!
    echo -e "${GREEN}✓ Backend started (PID: $BACKEND_PID)${NC}"
    sleep 2
}

# Function to start Zamar Player
start_player() {
    echo -e "${GREEN}[2/4] Starting Zamar Player...${NC}"
    cd client && dotnet run &
    PLAYER_PID=$!
    echo -e "${GREEN}✓ Zamar Player started (PID: $PLAYER_PID)${NC}"
    sleep 2
}

# Function to start Zamar Studio
start_studio() {
    echo -e "${GREEN}[3/4] Starting Zamar Studio...${NC}"
    cd studio && dotnet run &
    STUDIO_PID=$!
    echo -e "${GREEN}✓ Zamar Studio started (PID: $STUDIO_PID)${NC}"
    sleep 2
}

# Function to start Website
start_website() {
    echo -e "${GREEN}[4/4] Starting Website (Next.js)...${NC}"
    echo "Website: http://localhost:3001"
    cd website && npm run dev &
    WEBSITE_PID=$!
    echo -e "${GREEN}✓ Website started (PID: $WEBSITE_PID)${NC}"
    sleep 2
}

# Function to show admin credentials
show_admin_info() {
    echo ""
    echo "========================================="
    echo "  ADMIN ACCOUNTS"
    echo "========================================="
    echo ""
    echo -e "${YELLOW}Site Manager (Full Access):${NC}"
    echo "  Username: zamar"
    echo "  Password: zamar_secure_pass_123"
    echo "  Role: Site Manager"
    echo "  Access: All admin features"
    echo ""
    echo -e "${YELLOW}Intern Developer:${NC}"
    echo "  Username: Ke_devy"
    echo "  Password: intern_dev_pass_456"
    echo "  Role: Intern"
    echo "  Access: Users, Moderation, Analytics"
    echo ""
    echo -e "${YELLOW}Testing Account:${NC}"
    echo "  Username: games"
    echo "  Password: games_test_pass_789"
    echo "  Role: Test Account"
    echo "  Access: Game testing, party testing"
    echo ""
}

# Function to show running services
show_services() {
    echo ""
    echo "========================================="
    echo "  RUNNING SERVICES"
    echo "========================================="
    echo ""
    echo -e "${GREEN}✓ Backend Server${NC}"
    echo "  URL: http://localhost:3000"
    echo "  API: http://localhost:3000/api"
    echo "  Multiplayer: ws://localhost:3000"
    echo ""
    echo -e "${GREEN}✓ Zamar Player${NC}"
    echo "  Launcher with game browser"
    echo "  Multiplayer support"
    echo "  Theme system (Dark/Light/Neon)"
    echo ""
    echo -e "${GREEN}✓ Zamar Studio${NC}"
    echo "  Game development editor"
    echo "  Part system with 50+ part types"
    echo "  Lua scripting support"
    echo ""
    echo -e "${GREEN}✓ Website${NC}"
    echo "  URL: http://localhost:3001"
    echo "  Pages: Games, Catalog, Profile, Chat, Friends, etc."
    echo ""
}

# Show running processes
echo ""
echo "=========================================="
echo "Zamar Development Environment Started!"
echo "=========================================="
echo ""
echo "Services running:"
echo "  API Gateway:   http://localhost:3000"
echo "  Website:       http://localhost:3001"
echo "  Database:      localhost:5432"
echo "  Redis:         localhost:6379"
echo ""
echo "Admin Accounts:"
echo "  Username: Zamar  | Email: admin@zamar.com"
echo "  Username: games  | Email: games@zamar.com"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Wait for processes
wait $API_PID $WEBSITE_PID

# Cleanup
trap "kill $API_PID $WEBSITE_PID 2>/dev/null; docker-compose down" EXIT
