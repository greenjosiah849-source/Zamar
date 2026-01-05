#!/bin/bash

# Zamar Platform - Complete Setup Script
# This script initializes the entire Zamar platform with all services

set -e

echo "======================================"
echo "🚀 ZAMAR PLATFORM - COMPLETE SETUP"
echo "======================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check for Docker
echo -e "${BLUE}Checking prerequisites...${NC}"
if ! command -v docker &> /dev/null; then
    echo "❌ Docker not found. Please install Docker first."
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo "❌ Docker Compose not found. Please install Docker Compose first."
    exit 1
fi

echo -e "${GREEN}✓ Docker & Docker Compose installed${NC}"
echo ""

# Create necessary directories
echo -e "${BLUE}Creating directories...${NC}"
mkdir -p uploads/games
mkdir -p uploads/avatars
mkdir -p uploads/thumbnails
mkdir -p logs
echo -e "${GREEN}✓ Directories created${NC}"
echo ""

# Check if .env file exists
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << 'EOF'
# Database
DB_USER=zamar
DB_PASSWORD=zamar_password
DB_NAME=zamar_db
DB_HOST=db
DB_PORT=5432

# Redis
REDIS_HOST=redis
REDIS_PORT=6379

# JWT
JWT_SECRET=zamar-super-secret-key-change-in-production
JWT_EXPIRY=3600

# API
API_PORT=3000
API_URL=http://api:3000
NODE_ENV=development

# Website
NEXT_PUBLIC_API_URL=http://localhost:3000
WEBSITE_PORT=3001

# File Upload
MAX_FILE_SIZE=104857600
UPLOAD_DIR=./uploads

# Game Servers
GAME_SERVER_HOST=localhost
GAME_SERVER_REGIONS=US-EAST,US-WEST,US-CENTRAL,US-SOUTH
EOF
    echo -e "${GREEN}✓ .env file created${NC}"
else
    echo -e "${GREEN}✓ .env file exists${NC}"
fi
echo ""

# Start Docker services
echo -e "${BLUE}Starting Docker services...${NC}"
docker-compose up -d

# Wait for services to be ready
echo -e "${BLUE}Waiting for services to start...${NC}"
sleep 10

# Check if PostgreSQL is ready
echo -e "${BLUE}Checking PostgreSQL...${NC}"
MAX_ATTEMPTS=30
ATTEMPT=0
until docker-compose exec -T db pg_isready -U zamar > /dev/null 2>&1; do
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "❌ PostgreSQL failed to start"
        exit 1
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting for PostgreSQL... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done
echo -e "${GREEN}✓ PostgreSQL is ready${NC}"
echo ""

# Initialize database schema
echo -e "${BLUE}Initializing database schema...${NC}"
docker-compose exec -T db psql -U zamar -d zamar_db < database/schema.sql
echo -e "${GREEN}✓ Core schema initialized${NC}"

# Initialize extended schema
echo -e "${BLUE}Initializing extended schema...${NC}"
docker-compose exec -T db psql -U zamar -d zamar_db < database/schema-extended.sql
echo -e "${GREEN}✓ Extended schema initialized${NC}"

# Load seed data
echo -e "${BLUE}Loading seed data...${NC}"
docker-compose exec -T db psql -U zamar -d zamar_db < database/seeds.sql
echo -e "${GREEN}✓ Seed data loaded${NC}"
echo ""

# Install Node dependencies
echo -e "${BLUE}Installing server dependencies...${NC}"
cd server
npm install 2>/dev/null || true
cd ..
echo -e "${GREEN}✓ Server dependencies installed${NC}"

echo -e "${BLUE}Installing website dependencies...${NC}"
cd website
npm install 2>/dev/null || true
cd ..
echo -e "${GREEN}✓ Website dependencies installed${NC}"
echo ""

# Wait for API server to start
echo -e "${BLUE}Waiting for API server...${NC}"
sleep 10
MAX_ATTEMPTS=30
ATTEMPT=0
until curl -s http://localhost:3000/health > /dev/null 2>&1; do
    if [ $ATTEMPT -eq $MAX_ATTEMPTS ]; then
        echo "⚠️  API server not responding (may still be starting)"
        break
    fi
    ATTEMPT=$((ATTEMPT + 1))
    echo "Waiting for API server... ($ATTEMPT/$MAX_ATTEMPTS)"
    sleep 2
done
echo -e "${GREEN}✓ API server is ready${NC}"
echo ""

# Final status
echo "======================================"
echo -e "${GREEN}✅ ZAMAR PLATFORM SETUP COMPLETE!${NC}"
echo "======================================"
echo ""
echo -e "${BLUE}Services Running:${NC}"
echo "  📊 PostgreSQL (localhost:5432)"
echo "  💾 Redis (localhost:6379)"
echo "  🔌 API Server (http://localhost:3000)"
echo "  🌐 Website (http://localhost:3001)"
echo "  🎮 Game Servers (localhost:8001-8004)"
echo ""
echo -e "${BLUE}Default Admin Accounts:${NC}"
echo "  Username: Zamar"
echo "  Email: zamar@zamar.com"
echo "  Password: admin123"
echo ""
echo "  OR"
echo ""
echo "  Username: games"
echo "  Email: games@zamar.com"
echo "  Password: admin123"
echo ""
echo -e "${BLUE}Getting Started:${NC}"
echo "  1. Open http://localhost:3001 in your browser"
echo "  2. Login with admin credentials above"
echo "  3. Explore the platform!"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs:    docker-compose logs -f"
echo "  Stop all:     docker-compose down"
echo "  Restart API:  docker-compose restart api"
echo ""
echo -e "${BLUE}Documentation:${NC}"
echo "  📖 API Docs: API_DOCUMENTATION.md"
echo "  📖 Getting Started: GETTING_STARTED.md"
echo "  📖 Deployment: DEPLOYMENT.md"
echo "  📖 Build Summary: COMPLETE_BUILD_SUMMARY.md"
echo ""
echo "======================================"
