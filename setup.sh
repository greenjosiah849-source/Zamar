#!/bin/bash

# Zamar Platform Setup Script
set -e

echo "================================"
echo "Zamar Platform Setup"
echo "================================"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check prerequisites
echo -e "${YELLOW}Checking prerequisites...${NC}"

if ! command -v docker &> /dev/null; then
    echo -e "${RED}Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null; then
    echo -e "${RED}Docker Compose is not installed${NC}"
    exit 1
fi

if ! command -v git &> /dev/null; then
    echo -e "${RED}Git is not installed${NC}"
    exit 1
fi

if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Node.js not installed (optional for local dev)${NC}"
fi

echo -e "${GREEN}✓ Prerequisites check passed${NC}"

# Create .env files
echo -e "${YELLOW}Creating environment files...${NC}"

if [ ! -f "server/.env" ]; then
    cp server/.env.example server/.env
    echo -e "${GREEN}✓ Created server/.env${NC}"
fi

if [ ! -f "website/.env" ]; then
    cp website/.env.example website/.env
    echo -e "${GREEN}✓ Created website/.env${NC}"
fi

# Start Docker containers
echo -e "${YELLOW}Starting Docker containers...${NC}"

docker-compose down 2>/dev/null || true
docker-compose up -d

sleep 5

# Check if services are running
echo -e "${YELLOW}Verifying services...${NC}"

# Check API
if curl -s http://localhost:3000/health > /dev/null; then
    echo -e "${GREEN}✓ API Gateway running on :3000${NC}"
else
    echo -e "${RED}✗ API Gateway not responding${NC}"
fi

# Check Website
if curl -s http://localhost:3001 > /dev/null; then
    echo -e "${GREEN}✓ Website running on :3001${NC}"
else
    echo -e "${RED}✗ Website not responding${NC}"
fi

# Check Database
if docker exec zamar-postgres psql -U zamar -d zamar_db -c "SELECT 1" > /dev/null 2>&1; then
    echo -e "${GREEN}✓ PostgreSQL running on :5432${NC}"
else
    echo -e "${RED}✗ PostgreSQL not responding${NC}"
fi

# Check Redis
if docker exec zamar-redis redis-cli ping > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Redis running on :6379${NC}"
else
    echo -e "${RED}✗ Redis not responding${NC}"
fi

echo ""
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Zamar Platform Setup Complete!${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo "Access the platform at:"
echo "  Website:  http://localhost:3001"
echo "  API:      http://localhost:3000"
echo "  Database: localhost:5432"
echo "  Redis:    localhost:6379"
echo ""
echo "Default Admin Accounts:"
echo "  Username: Zamar    | Email: admin@zamar.com"
echo "  Username: games    | Email: games@zamar.com"
echo ""
echo "View logs with: docker-compose logs -f"
