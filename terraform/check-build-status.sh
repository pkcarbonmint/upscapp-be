#!/bin/bash

# Docker Build Status Monitor for Stage2
# Usage: ./check-build-status.sh

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

echo -e "${BLUE}🐳 Docker Build Status Check${NC}"
echo "=================================="

# Function to get EC2 instance info
get_ec2_info() {
    local instance_ip=$(terraform output -raw docker_instance_public_ip 2>/dev/null || echo "")
    
    if [ -z "$instance_ip" ]; then
        echo -e "${RED}❌ EC2 instance not found. Run 'terraform apply' first.${NC}"
        exit 1
    fi
    
    echo "$instance_ip"
}

# Function to check if instance is reachable
check_instance_reachability() {
    local instance_ip=$1
    
    echo -e "${BLUE}📡 Checking EC2 instance connectivity...${NC}"
    
    if ping -c 1 -W 5 "$instance_ip" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Instance is reachable${NC}"
        return 0
    else
        echo -e "${RED}❌ Instance is not reachable${NC}"
        return 1
    fi
}

# Function to check SSH connectivity
check_ssh_connectivity() {
    local instance_ip=$1
    
    echo -e "${BLUE}🔐 Checking SSH connectivity...${NC}"
    
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "echo 'SSH OK'" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
        return 0
    else
        echo -e "${RED}❌ SSH connection failed${NC}"
        return 1
    fi
}

# Function to check Docker installation
check_docker_installation() {
    local instance_ip=$1
    
    echo -e "${BLUE}🐳 Checking Docker installation...${NC}"
    
    local docker_status=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "docker --version 2>/dev/null || echo 'NOT_INSTALLED'")
    
    if [[ "$docker_status" == *"NOT_INSTALLED"* ]]; then
        echo -e "${RED}❌ Docker not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Docker installed: $docker_status${NC}"
        return 0
    fi
}

# Function to check Docker Compose installation
check_docker_compose_installation() {
    local instance_ip=$1
    
    echo -e "${BLUE}🐙 Checking Docker Compose installation...${NC}"
    
    local compose_status=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "docker-compose --version 2>/dev/null || echo 'NOT_INSTALLED'")
    
    if [[ "$compose_status" == *"NOT_INSTALLED"* ]]; then
        echo -e "${RED}❌ Docker Compose not installed${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Docker Compose installed: $compose_status${NC}"
        return 0
    fi
}

# Function to check if repository was cloned
check_repository_clone() {
    local instance_ip=$1
    
    echo -e "${BLUE}📁 Checking repository clone...${NC}"
    
    local repo_status=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && ls -la 2>/dev/null | grep -E '(Dockerfile|docker-compose)' || echo 'NOT_FOUND'")
    
    if [[ "$repo_status" == *"NOT_FOUND"* ]]; then
        echo -e "${RED}❌ Repository not cloned or missing files${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Repository cloned successfully${NC}"
        echo "Found files:"
        echo "$repo_status" | grep -E "(Dockerfile|docker-compose)" | while read -r line; do
            echo "  $line"
        done
        return 0
    fi
}

# Function to check Docker images
check_docker_images() {
    local instance_ip=$1
    
    echo -e "${BLUE}🖼️  Checking Docker images...${NC}"
    
    local images=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && docker images 2>/dev/null | grep -E '(upscpro|stage2)' || echo 'NO_IMAGES'")
    
    if [[ "$images" == *"NO_IMAGES"* ]]; then
        echo -e "${RED}❌ No Docker images found${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Docker images found:${NC}"
        echo "$images" | while read -r line; do
            echo "  $line"
        done
        return 0
    fi
}

# Function to check Docker Compose services
check_docker_compose_services() {
    local instance_ip=$1
    
    echo -e "${BLUE}🚀 Checking Docker Compose services...${NC}"
    
    local services=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && docker-compose -f docker-compose.prod.yml ps 2>/dev/null || echo 'SERVICES_ERROR'")
    
    if [[ "$services" == *"SERVICES_ERROR"* ]]; then
        echo -e "${RED}❌ Docker Compose services not running${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Docker Compose services status:${NC}"
        echo "$services"
        
        # Check if any services are not running
        local failed_services=$(echo "$services" | grep -E "(Exit|Restarting)" || echo "")
        if [ -n "$failed_services" ]; then
            echo -e "${YELLOW}⚠️  Some services are not running properly:${NC}"
            echo "$failed_services"
            return 1
        fi
        
        return 0
    fi
}

# Function to show recent build logs
show_build_logs() {
    local instance_ip=$1
    
    echo -e "${BLUE}📝 Recent build logs (last 20 lines)...${NC}"
    
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && docker-compose -f docker-compose.prod.yml logs --tail=20 2>/dev/null || echo 'No logs available'"
}

# Function to show service health
check_service_health() {
    local instance_ip=$1
    
    echo -e "${BLUE}🏥 Checking service health...${NC}"
    
    # Check if services are responding
    local app_health=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8000/healthcheck 2>/dev/null || echo '000'")
    local helios_health=$(ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "curl -s -o /dev/null -w '%{http_code}' http://localhost:8080/health 2>/dev/null || echo '000'")
    
    if [ "$app_health" = "200" ]; then
        echo -e "${GREEN}✅ App API health check: $app_health${NC}"
    else
        echo -e "${RED}❌ App API health check: $app_health${NC}"
    fi
    
    if [ "$helios_health" = "200" ]; then
        echo -e "${GREEN}✅ Helios health check: $helios_health${NC}"
    else
        echo -e "${RED}❌ Helios health check: $helios_health${NC}"
    fi
}

# Main execution
main() {
    local instance_ip=$(get_ec2_info)
    
    echo "Instance IP: $instance_ip"
    echo ""
    
    # Check connectivity
    if ! check_instance_reachability "$instance_ip"; then
        exit 1
    fi
    
    if ! check_ssh_connectivity "$instance_ip"; then
        exit 1
    fi
    
    echo ""
    
    # Check Docker installation
    if ! check_docker_installation "$instance_ip"; then
        echo -e "${YELLOW}💡 Docker installation may still be in progress. Wait a few minutes and try again.${NC}"
        exit 1
    fi
    
    if ! check_docker_compose_installation "$instance_ip"; then
        echo -e "${YELLOW}💡 Docker Compose installation may still be in progress. Wait a few minutes and try again.${NC}"
        exit 1
    fi
    
    echo ""
    
    # Check repository and build status
    if ! check_repository_clone "$instance_ip"; then
        echo -e "${YELLOW}💡 Repository clone may still be in progress. Check GitHub token configuration.${NC}"
        exit 1
    fi
    
    echo ""
    
    if ! check_docker_images "$instance_ip"; then
        echo -e "${YELLOW}💡 Docker build may still be in progress. Wait a few minutes and try again.${NC}"
        echo ""
        echo -e "${BLUE}To monitor build progress:${NC}"
        echo "  ./monitor-ec2-stage2.sh logs"
        exit 1
    fi
    
    echo ""
    
    if ! check_docker_compose_services "$instance_ip"; then
        echo -e "${YELLOW}💡 Services may still be starting. Wait a few minutes and try again.${NC}"
        echo ""
        echo -e "${BLUE}To monitor service startup:${NC}"
        echo "  ./monitor-ec2-stage2.sh logs"
        exit 1
    fi
    
    echo ""
    
    # Check service health
    check_service_health "$instance_ip"
    
    echo ""
    echo -e "${GREEN}🎉 Docker build and deployment successful!${NC}"
    echo ""
    echo -e "${BLUE}Next steps:${NC}"
    echo "  View logs: ./monitor-ec2-stage2.sh logs"
    echo "  Check status: ./monitor-ec2-stage2.sh status"
    echo "  Show URLs: ./monitor-ec2-stage2.sh urls"
    echo "  SSH access: ./monitor-ec2-stage2.sh ssh"
}

main "$@"
