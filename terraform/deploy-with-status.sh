#!/bin/bash

# Comprehensive Remote Docker Deployment Script
# Handles build failures and provides better error reporting

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Get instance IP from Terraform
INSTANCE_IP=$(terraform output -raw docker_instance_public_ip)
KEY_FILE="$HOME/.ssh/upscAppAwsKey"

log_info "Deploying to instance: $INSTANCE_IP"

# Deploy with error handling
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
    cd /opt/upscpro/upscapp-be
    
    echo "=== Pre-deployment Status ==="
    echo "Docker version:"
    docker --version
    echo ""
    echo "Docker Compose version:"
    docker-compose --version
    echo ""
    echo "Current directory contents:"
    ls -la | head -10
    echo ""
    
    echo "=== Starting Deployment ==="
    
    # Check if deploy.sh exists and is executable
    if [ ! -f "deploy.sh" ]; then
        echo "ERROR: deploy.sh not found"
        exit 1
    fi
    
    if [ ! -x "deploy.sh" ]; then
        echo "Making deploy.sh executable..."
        chmod +x deploy.sh
    fi
    
    # Run deployment
    echo "Running deployment script..."
    ./deploy.sh || {
        echo "=== Deployment Failed ==="
        echo "Checking Docker status..."
        docker ps -a
        echo ""
        echo "Checking Docker Compose status..."
        docker-compose ps 2>/dev/null || echo "Docker Compose not available"
        echo ""
        echo "Checking recent logs..."
        if [ -f "deploy.log" ]; then
            tail -50 deploy.log
        fi
        exit 1
    }
EOF

if [ $? -eq 0 ]; then
    log_success "Deployment completed successfully!"
else
    log_error "Deployment failed. Checking status..."
fi

# Show final status
log_info "Checking final deployment status..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
    cd /opt/upscpro/upscapp-be
    
    echo "=== Final Status ==="
    echo "Docker containers:"
    docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
    echo ""
    
    echo "Docker Compose services:"
    docker-compose ps 2>/dev/null || echo "No services running"
    echo ""
    
    echo "Recent deployment logs:"
    if [ -f "deploy.log" ]; then
        tail -20 deploy.log
    else
        echo "No deployment log found"
    fi
EOF
