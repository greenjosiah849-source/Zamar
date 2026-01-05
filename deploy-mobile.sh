#!/bin/bash

################################################################################
#                  ZAMAR MOBILE APP - AUTOMATED DEPLOYMENT
#                   Handles everything automatically!
################################################################################

set -e  # Exit on any error

echo ""
echo "==============================================="
echo "   ZAMAR MOBILE APP - AUTOMATED DEPLOYMENT"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# STEP 1: Check prerequisites
################################################################################

echo -e "${YELLOW}[1/5] Checking prerequisites...${NC}"

if ! command -v node &> /dev/null; then
    echo -e "${RED}✗ Node.js not installed${NC}"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo -e "${RED}✗ npm not installed${NC}"
    exit 1
fi

echo -e "${GREEN}✓ Node.js $(node --version)${NC}"
echo -e "${GREEN}✓ npm $(npm --version)${NC}"
echo ""

################################################################################
# STEP 2: Install/Update global tools
################################################################################

echo -e "${YELLOW}[2/5] Installing/updating global tools...${NC}"

npm install -g expo-cli@latest > /dev/null 2>&1
echo -e "${GREEN}✓ Expo CLI installed${NC}"

npm install -g eas-cli@latest > /dev/null 2>&1
echo -e "${GREEN}✓ EAS CLI installed${NC}"

echo ""

################################################################################
# STEP 3: Verify Expo login
################################################################################

echo -e "${YELLOW}[3/5] Checking Expo login...${NC}"

if ! expo whoami > /dev/null 2>&1; then
    echo -e "${YELLOW}ℹ Not logged in to Expo${NC}"
    echo "Creating account at: https://expo.dev"
    echo ""
    echo -e "${BLUE}Please log in to Expo:${NC}"
    expo login
    if [ $? -ne 0 ]; then
        echo -e "${RED}✗ Login failed${NC}"
        exit 1
    fi
fi

EXPO_USER=$(expo whoami)
echo -e "${GREEN}✓ Logged in as: $EXPO_USER${NC}"
echo ""

################################################################################
# STEP 4: Install dependencies
################################################################################

echo -e "${YELLOW}[4/5] Installing mobile app dependencies...${NC}"

npm install > /dev/null 2>&1
echo -e "${GREEN}✓ Dependencies installed${NC}"

echo ""

################################################################################
# STEP 5: Build and Deploy
################################################################################

echo -e "${YELLOW}[5/5] Building for app stores...${NC}"
echo ""
echo -e "${BLUE}Building for Android and iOS...${NC}"
echo "This will take 10-30 minutes. Please wait..."
echo ""

# Build for all platforms
eas build --platform all

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Build successful!${NC}"
    echo ""
    echo "Your builds are ready:"
    echo ""
    eas build:list --limit 1
    echo ""
    echo -e "${BLUE}Next step:${NC}"
    echo "eas submit --platform all"
    echo ""
else
    echo -e "${RED}✗ Build failed${NC}"
    exit 1
fi

echo ""
echo "==============================================="
echo -e "${GREEN}✓ DEPLOYMENT READY!${NC}"
echo "==============================================="
echo ""
