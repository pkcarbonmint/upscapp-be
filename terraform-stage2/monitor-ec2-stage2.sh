#!/bin/bash

# EC2 Docker Compose Monitoring Script for Stage2
# Usage: ./monitor-ec2-stage2.sh [status|logs|deploy|ssh]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

ACTION=${1:-"status"}

# Function to get EC2 instance info
get_ec2_info() {
    local instance_ip=$(terraform output -raw docker_instance_public_ip 2>/dev/null || echo "")
    
    if [ -z "$instance_ip" ]; then
        echo -e "${RED}❌ EC2 instance not found. Run 'terraform apply' first.${NC}"
        exit 1
    fi
    
    echo "$instance_ip"
}

# Function to check EC2 status
check_ec2_status() {
    local instance_ip=$(get_ec2_info)
    
    echo -e "${BLUE}📊 EC2 Instance Status${NC}"
    echo "Instance IP: $instance_ip"
    
    # Check if instance is reachable
    if ping -c 1 -W 5 "$instance_ip" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ Instance is reachable${NC}"
    else
        echo -e "${RED}❌ Instance is not reachable${NC}"
        return 1
    fi
    
    # Check SSH connectivity
    if ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "echo 'SSH OK'" > /dev/null 2>&1; then
        echo -e "${GREEN}✅ SSH connection successful${NC}"
    else
        echo -e "${YELLOW}⚠️  SSH connection failed (check key pair)${NC}"
    fi
}

# Function to show service status via SSH
show_service_status() {
    local instance_ip=$(get_ec2_info)
    
    echo -e "${BLUE}🐳 Docker Compose Services Status${NC}"
    
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" << 'EOF'
cd /opt/upscpro
if [ -f "docker-compose.prod.yml" ]; then
    echo "=== Docker Compose Services ==="
    docker-compose -f docker-compose.prod.yml ps
    echo ""
    echo "=== Docker Images ==="
    docker images | grep -E "(upscpro|stage2)" | head -10
else
    echo "❌ docker-compose.prod.yml not found"
fi
EOF
}

# Function to show logs via SSH
show_logs() {
    local service=${1:-""}
    local instance_ip=$(get_ec2_info)
    
    echo -e "${BLUE}📝 Docker Compose Logs${NC}"
    echo "Press Ctrl+C to stop"
    
    if [ -n "$service" ]; then
        ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && docker-compose -f docker-compose.prod.yml logs -f $service"
    else
        ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" "cd /opt/upscpro && docker-compose -f docker-compose.prod.yml logs -f"
    fi
}

# Function to deploy via SSH
deploy() {
    local instance_ip=$(get_ec2_info)
    
    echo -e "${YELLOW}🚀 Deploying to EC2 instance...${NC}"
    
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$instance_ip" << 'EOF'
cd /opt/upscpro
echo "Running deployment script..."
./deploy.sh
EOF
    
    echo -e "${GREEN}✅ Deployment completed${NC}"
}

# Function to SSH into instance
ssh_to_instance() {
    local instance_ip=$(get_ec2_info)
    
    echo -e "${BLUE}🔐 Connecting to EC2 instance...${NC}"
    echo "Instance IP: $instance_ip"
    echo ""
    echo "Useful commands once connected:"
    echo "  cd /opt/upscpro"
    echo "  docker-compose -f docker-compose.prod.yml ps"
    echo "  docker-compose -f docker-compose.prod.yml logs -f"
    echo "  ./deploy.sh"
    echo ""
    
    ssh -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@$instance_ip
}

# Function to show service URLs
show_urls() {
    local instance_ip=$(get_ec2_info)
    local alb_url=$(terraform output -raw alb_url 2>/dev/null || echo "")
    
    echo -e "${BLUE}🌐 Service URLs${NC}"
    echo "EC2 Instance: $instance_ip"
    echo ""
    echo "Direct Access (via SSH tunnel):"
    echo "  App API: http://localhost:8000 (tunnel to $instance_ip:8000)"
    echo "  Helios: http://localhost:8080 (tunnel to $instance_ip:8080)"
    echo "  Frontend: http://localhost:3000 (tunnel to $instance_ip:3000)"
    echo "  Onboarding UI: http://localhost:3001 (tunnel to $instance_ip:3001)"
    echo "  Faculty UI: http://localhost:3002 (tunnel to $instance_ip:3002)"
    echo "  Celery Flower: http://localhost:5555 (tunnel to $instance_ip:5555)"
    echo ""
    if [ -n "$alb_url" ]; then
        echo "Public Access (via ALB):"
        echo "  Frontend: $alb_url"
        echo "  Onboarding UI: $alb_url/onboarding"
        echo "  Faculty UI: $alb_url/faculty"
    fi
    echo ""
    echo "SSH Tunnel Commands:"
    echo "  ssh -L 8000:$instance_ip:8000 -L 8080:$instance_ip:8080 -L 3000:$instance_ip:3000 ec2-user@$instance_ip"
}

# Main execution
case $ACTION in
    "status")
        check_ec2_status
        echo ""
        show_service_status
        ;;
    "logs")
        show_logs "$2"
        ;;
    "deploy")
        deploy
        ;;
    "ssh")
        ssh_to_instance
        ;;
    "urls")
        show_urls
        ;;
    *)
        echo "Usage: $0 [status|logs|deploy|ssh|urls]"
        echo ""
        echo "Commands:"
        echo "  status     - Check EC2 and service status"
        echo "  logs [service] - Show logs (all services or specific service)"
        echo "  deploy     - Deploy latest code to EC2"
        echo "  ssh        - SSH into EC2 instance"
        echo "  urls       - Show service URLs and access methods"
        echo ""
        echo "Examples:"
        echo "  $0 status"
        echo "  $0 logs app"
        echo "  $0 deploy"
        echo "  $0 ssh"
        echo "  $0 urls"
        exit 1
        ;;
esac
