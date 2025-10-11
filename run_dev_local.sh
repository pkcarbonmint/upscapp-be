#!/bin/bash

# Development script to run Python backend and Helios server locally
# Keeps database and Redis in Docker for convenience

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting local development environment${NC}"

# Function to cleanup on exit
cleanup() {
    echo -e "\n${YELLOW}🧹 Cleaning up processes...${NC}"
    if [ ! -z "$PYTHON_PID" ]; then
        kill $PYTHON_PID 2>/dev/null || true
    fi
    if [ ! -z "$HELIOS_PID" ]; then
        kill $HELIOS_PID 2>/dev/null || true
    fi
    exit 0
}

trap cleanup SIGINT SIGTERM

# # Stop any running Docker containers first
# echo -e "${YELLOW}🛑 Stopping existing Docker containers...${NC}"
# docker-compose down || true

# Check if virtual environment exists
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}📦 Creating virtual environment...${NC}"
    python3 -m venv venv
fi

# Activate virtual environment
echo -e "${BLUE}🔧 Activating virtual environment...${NC}"
source venv/bin/activate

# # Install/update requirements
# echo -e "${BLUE}📋 Installing Python dependencies...${NC}"
# pip install -r requirements.txt
# pip install -r requirements/dev.txt

# Start database and Redis in Docker (only these services)
echo -e "${BLUE}🗄️  Starting database and Redis in Docker...${NC}"
docker-compose up -d app_db app_redis

# Wait for database to be ready
echo -e "${YELLOW}⏳ Waiting for database to be ready...${NC}"
sleep 8

# Load environment variables from dev.env
if [ -f "dev.env" ]; then
    echo -e "${BLUE}📋 Loading environment variables...${NC}"
    export $(grep -v '^#' dev.env | xargs)
else
    echo -e "${RED}❌ dev.env file not found${NC}"
    exit 1
fi

# Run database migrations
echo -e "${BLUE}🔄 Running database migrations...${NC}"
alembic upgrade head

# Find existing Helios binary or build if needed
echo -e "${BLUE}🏗️  Checking for Helios server binary...${NC}"
HELIOS_BINARY=$(find helios-hs -name "helios-hs" -type f | head -1)
if [ -z "$HELIOS_BINARY" ]; then
    echo -e "${YELLOW}Building Helios server...${NC}"
    cd helios-hs
    stack build
    HELIOS_BINARY=$(find . -name "helios-hs" -type f | head -1)
    cd ..
else
    echo -e "${GREEN}Found existing Helios binary: $HELIOS_BINARY${NC}"
fi

# Start Helios server in background
echo -e "${GREEN}🚀 Starting Helios server on port 8080...${NC}"
(cd helios-hs && stack run &)
HELIOS_PID=$!

# Wait for Helios to start
echo -e "${YELLOW}⏳ Waiting for Helios server to start...${NC}"
sleep 5

# Test Helios health
curl -f http://localhost:8080/health || echo -e "${RED}⚠️  Helios health check failed${NC}"

# Start Python backend
echo -e "${GREEN}🐍 Starting Python backend on port 8000...${NC}"
uvicorn src.main:app --host 0.0.0.0 --port 8000 --reload &
PYTHON_PID=$!

# Wait for Python backend to start
sleep 3

echo -e "${GREEN}✅ Development environment ready!${NC}"
echo -e "${BLUE}📍 Services running:${NC}"
echo -e "  • Python Backend: http://localhost:8000"
echo -e "  • Helios Engine: http://localhost:8080"
echo -e "  • Database: postgresql://localhost:5432/upscapp"
echo -e "  • Redis: redis://localhost:6379"
echo -e "\n${YELLOW}Press Ctrl+C to stop all services${NC}"

# Wait for processes
wait $PYTHON_PID $HELIOS_PID
