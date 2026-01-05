#!/bin/bash

################################################################################
#                    ZAMAR - COMPLETE SETUP & DEPLOYMENT
################################################################################

echo "=========================================="
echo "ZAMAR DEPLOYMENT SETUP"
echo "=========================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

################################################################################
# STEP 1: Check Node.js and npm
################################################################################

echo -e "${YELLOW}[1/5] Checking Node.js and npm installation...${NC}"
echo ""

if ! command -v node &> /dev/null; then
    echo -e "${RED}❌ Node.js is not installed${NC}"
    echo "Installing Node.js..."
    curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
    sudo apt-get install -y nodejs
else
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓ Node.js installed: $NODE_VERSION${NC}"
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}❌ npm is not installed${NC}"
    sudo apt-get install -y npm
else
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓ npm installed: $NPM_VERSION${NC}"
fi

echo ""

################################################################################
# STEP 2: Install Global Tools
################################################################################

echo -e "${YELLOW}[2/5] Installing global development tools...${NC}"
echo ""

echo "Installing Expo CLI globally..."
npm install -g expo-cli@latest

echo "Installing EAS CLI globally..."
npm install -g eas-cli@latest

echo ""

################################################################################
# STEP 3: Setup Mobile App
################################################################################

echo -e "${YELLOW}[3/5] Setting up mobile app...${NC}"
echo ""

if [ -d "mobile" ]; then
    echo "Found mobile directory"
    cd mobile
    echo "Installing mobile app dependencies..."
    npm install
    echo -e "${GREEN}✓ Mobile app dependencies installed${NC}"
    cd ..
else
    echo -e "${RED}❌ mobile directory not found${NC}"
fi

echo ""

################################################################################
# STEP 4: Setup Server
################################################################################

echo -e "${YELLOW}[4/5] Setting up backend server...${NC}"
echo ""

if [ -d "server" ]; then
    echo "Found server directory"
    cd server
    echo "Installing server dependencies..."
    npm install
    echo -e "${GREEN}✓ Server dependencies installed${NC}"
    cd ..
else
    echo -e "${RED}❌ server directory not found${NC}"
fi

echo ""

################################################################################
# STEP 5: Setup Website
################################################################################

echo -e "${YELLOW}[5/5] Setting up website...${NC}"
echo ""

if [ -d "website" ]; then
    echo "Found website directory"
    cd website
    echo "Installing website dependencies..."
    npm install
    echo -e "${GREEN}✓ Website dependencies installed${NC}"
    cd ..
else
    echo -e "${RED}❌ website directory not found${NC}"
fi

echo ""
echo "=========================================="
echo -e "${GREEN}✓ SETUP COMPLETE!${NC}"
echo "=========================================="
echo ""
echo "Next steps:"
echo ""
echo "1. TEST MOBILE APP LOCALLY:"
echo "   cd mobile"
echo "   expo start"
echo "   (Scan QR code with Expo Go app)"
echo ""
echo "2. BUILD FOR APP STORES:"
echo "   cd mobile"
echo "   eas build --platform all"
echo ""
echo "3. SUBMIT TO APP STORES:"
echo "   cd mobile"
echo "   eas submit --platform all"
echo ""
echo "4. START BACKEND SERVER:"
echo "   cd server"
echo "   npm start"
echo ""
echo "5. START WEBSITE:"
echo "   cd website"
echo "   npm run dev"
echo ""
