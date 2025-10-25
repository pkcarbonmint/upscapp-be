#!/bin/bash

# Docker Compose Build Script for Stage2 (Local Only)
# Usage: ./build-and-push.sh [build|run|clean]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ACTION=${1:-"build"}

echo -e "${BLUE}🐳 Docker Compose Build for Stage2 (Local)${NC}"
echo -e "${BLUE}Action: $ACTION${NC}"
echo ""

# Check if docker-compose file exists
if [ ! -f "docker-compose.build.yml" ]; then
    echo -e "${RED}❌ docker-compose.build.yml not found${NC}"
    exit 1
fi

# Function to build images
build_images() {
    echo -e "${YELLOW}🔨 Building Docker images locally...${NC}"
    docker-compose -f docker-compose.build.yml build
    echo -e "${GREEN}✅ All images built successfully${NC}"
}

# Function to run services locally
run_services() {
    echo -e "${YELLOW}🚀 Starting services locally...${NC}"
    docker-compose -f docker-compose.build.yml up -d
    echo -e "${GREEN}✅ All services started${NC}"
    echo ""
    echo -e "${BLUE}📊 Service Status:${NC}"
    docker-compose -f docker-compose.build.yml ps
}

# Function to stop services
stop_services() {
    echo -e "${YELLOW}🛑 Stopping services...${NC}"
    docker-compose -f docker-compose.build.yml down
    echo -e "${GREEN}✅ All services stopped${NC}"
}

# Function to show image sizes
show_image_info() {
    echo -e "${BLUE}📊 Local Image Information:${NC}"
    docker images | grep "upscpro-stage2" | while read -r line; do
        echo "  $line"
    done
}

# Function to clean up images
clean_images() {
    echo -e "${YELLOW}🧹 Cleaning up local images...${NC}"
    docker images | grep "upscpro-stage2" | awk '{print $3}' | xargs -r docker rmi -f
    echo -e "${GREEN}✅ Local images cleaned${NC}"
}

# Function to show service logs
show_logs() {
    local service=${1:-""}
    if [ -n "$service" ]; then
        echo -e "${YELLOW}📝 Showing logs for $service...${NC}"
        docker-compose -f docker-compose.build.yml logs -f "$service"
    else
        echo -e "${YELLOW}📝 Showing logs for all services...${NC}"
        docker-compose -f docker-compose.build.yml logs -f
    fi
}

# Main execution
case $ACTION in
    "build")
        build_images
        echo ""
        show_image_info
        ;;
    "run")
        build_images
        echo ""
        run_services
        ;;
    "stop")
        stop_services
        ;;
    "logs")
        show_logs "$2"
        ;;
    "clean")
        stop_services
        echo ""
        clean_images
        ;;
    "status")
        docker-compose -f docker-compose.build.yml ps
        ;;
    *)
        echo "Usage: $0 [build|run|stop|logs|clean|status]"
        echo ""
        echo "Commands:"
        echo "  build   - Build all Docker images locally"
        echo "  run     - Build and start all services locally"
        echo "  stop    - Stop all running services"
        echo "  logs    - Show logs for all services (or specific service)"
        echo "  clean   - Stop services and remove local images"
        echo "  status  - Show status of running services"
        echo ""
        echo "Examples:"
        echo "  $0 build"
        echo "  $0 run"
        echo "  $0 logs app"
        echo "  $0 stop"
        echo "  $0 clean"
        exit 1
        ;;
esac

echo ""
echo -e "${GREEN}🎉 Docker Compose operation completed!${NC}"
echo ""
echo -e "${BLUE}Local Development URLs:${NC}"
echo "  App API: http://localhost:8000"
echo "  Helios: http://localhost:8080"
echo "  Frontend: http://localhost:3000"
echo "  Onboarding UI: http://localhost:3001"
echo "  Faculty UI: http://localhost:3002"
echo ""
echo -e "${BLUE}Useful Commands:${NC}"
echo "  View logs: $0 logs [service]"
echo "  Check status: $0 status"
echo "  Stop services: $0 stop"
