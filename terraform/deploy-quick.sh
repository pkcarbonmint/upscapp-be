#!/bin/bash

# Quick Remote Docker Deployment Script
# Simple script to trigger Docker builds on the remote EC2 instance

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }

# Get instance IP from Terraform
INSTANCE_IP=$(terraform output -raw docker_instance_public_ip)
KEY_FILE="$HOME/.ssh/upscAppAwsKey"

log_info "Deploying to instance: $INSTANCE_IP"

# Deploy on remote instance
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
    cd /opt/upscpro/upscapp-be
    echo "Starting deployment..."
    ./deploy.sh
EOF

log_success "Deployment completed!"

# Show status
log_info "Checking deployment status..."
ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" "cd /opt/upscpro/upscapp-be && docker-compose ps"
