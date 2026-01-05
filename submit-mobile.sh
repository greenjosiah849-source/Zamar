#!/bin/bash

################################################################################
#             ZAMAR MOBILE APP - AUTOMATED SUBMISSION SCRIPT
#        Submits your built apps to Google Play and App Store!
################################################################################

set -e

echo ""
echo "==============================================="
echo "   ZAMAR MOBILE APP - AUTOMATED SUBMISSION"
echo "==============================================="
echo ""

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# STEP 1: Check if build exists
################################################################################

echo -e "${YELLOW}[1/3] Checking for available builds...${NC}"
echo ""

BUILD_COUNT=$(eas build:list --limit 1 | grep -c "android\|ios" || true)

if [ "$BUILD_COUNT" -eq 0 ]; then
    echo -e "${RED}✗ No builds found${NC}"
    echo ""
    echo "First, run: eas build --platform all"
    exit 1
fi

echo -e "${GREEN}✓ Builds found${NC}"
echo ""
eas build:list --limit 2
echo ""

################################################################################
# STEP 2: Verify Expo login
################################################################################

echo -e "${YELLOW}[2/3] Verifying Expo login...${NC}"

if ! expo whoami > /dev/null 2>&1; then
    echo -e "${RED}✗ Not logged in${NC}"
    echo "Run: expo login"
    exit 1
fi

EXPO_USER=$(expo whoami)
echo -e "${GREEN}✓ Logged in as: $EXPO_USER${NC}"
echo ""

################################################################################
# STEP 3: Submit to App Stores
################################################################################

echo -e "${YELLOW}[3/3] Submitting to app stores...${NC}"
echo ""

read -p "Submit to Google Play and App Store? (y/n) " -n 1 -r
echo ""

if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "Submission cancelled"
    exit 0
fi

echo ""
echo -e "${BLUE}Submitting to stores...${NC}"
echo ""

eas submit --platform all

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}✓ Submission successful!${NC}"
    echo ""
    echo "Your apps are now under review:"
    echo "  • Google Play: 24-48 hours"
    echo "  • App Store: 1-5 days"
    echo ""
    echo "Check status:"
    echo "  Google Play Console: https://play.google.com/apps/publish"
    echo "  App Store Connect: https://appstoreconnect.apple.com"
    echo ""
else
    echo -e "${RED}✗ Submission failed${NC}"
    exit 1
fi

echo ""
echo "==============================================="
echo -e "${GREEN}✓ SUBMISSION COMPLETE!${NC}"
echo "==============================================="
echo ""
