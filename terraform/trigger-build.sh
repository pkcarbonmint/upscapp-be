#!/bin/bash

# Script to trigger a build on the remote EC2 instance
# Usage: ./trigger-build.sh [instance-ip] [key-file]

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Check if terraform is available and get outputs
if command -v terraform >/dev/null 2>&1; then
    log_info "Getting instance information from Terraform..."
    
    INSTANCE_IP=$(terraform output -raw docker_instance_public_ip 2>/dev/null || echo "")
    WEBHOOK_URL=$(terraform output -raw webhook_url 2>/dev/null || echo "")
    
    if [ -z "$INSTANCE_IP" ]; then
        log_error "Could not get instance IP from Terraform outputs"
        log_info "Make sure you have deployed the infrastructure first"
        exit 1
    fi
else
    log_warning "Terraform not found, using command line arguments"
    INSTANCE_IP="$1"
    
    if [ -z "$INSTANCE_IP" ]; then
        log_error "Please provide instance IP as first argument"
        echo "Usage: $0 <instance-ip> [key-file]"
        exit 1
    fi
fi

KEY_FILE="$2"

echo "🚀 Remote Build Trigger"
echo "======================"
echo "Instance IP: $INSTANCE_IP"
echo "Webhook URL: $WEBHOOK_URL"
echo ""

# Method 1: Try webhook first (if available)
if [ -n "$WEBHOOK_URL" ]; then
    log_info "Attempting to trigger build via webhook..."
    
    if curl -f -X POST "$WEBHOOK_URL" \
        -H "Content-Type: application/json" \
        -d '{"ref":"refs/heads/main","repository":{"name":"manual-trigger"}}' \
        --connect-timeout 10 \
        --max-time 30; then
        log_success "Build triggered successfully via webhook!"
        echo ""
        log_info "You can monitor the build progress by checking the logs:"
        echo "  ssh -i $KEY_FILE ec2-user@$INSTANCE_IP 'sudo journalctl -u webhook-server -f'"
        exit 0
    else
        log_warning "Webhook trigger failed, trying SSH method..."
    fi
fi

# Method 2: SSH to instance and run deployment script
if [ -z "$KEY_FILE" ]; then
    log_error "SSH key file not provided and webhook failed"
    echo "Usage: $0 <instance-ip> <key-file>"
    echo ""
    echo "Example:"
    echo "  $0 $INSTANCE_IP ~/.ssh/my-key.pem"
    exit 1
fi

if [ ! -f "$KEY_FILE" ]; then
    log_error "SSH key file not found: $KEY_FILE"
    exit 1
fi

log_info "Connecting to instance via SSH to trigger build..."

# Check if instance is reachable
if ! ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@$INSTANCE_IP "echo 'Connection successful'"; then
    log_error "Could not connect to instance via SSH"
    log_info "Please check:"
    echo "  • Instance is running and accessible"
    echo "  • Security group allows SSH access (port 22)"
    echo "  • SSH key file is correct and has proper permissions (chmod 600)"
    exit 1
fi

# Run deployment script on remote instance
log_info "Running deployment script on remote instance..."

ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@$INSTANCE_IP << 'EOF'
    echo "🔄 Starting remote deployment..."
    
    cd /opt/app
    
    # Check if deployment script exists
    if [ -f "./deploy.sh" ]; then
        echo "Running deployment script..."
        sudo ./deploy.sh
    else
        echo "Deployment script not found, running manual deployment..."
        
        # Pull latest changes if git repo exists
        if [ -d ".git" ]; then
            echo "Pulling latest changes..."
            git pull origin main || git pull origin master
        fi
        
        # Stop and rebuild containers
        echo "Rebuilding containers..."
        sudo docker-compose down
        
        if [ -f "./docker-build.sh" ]; then
            chmod +x ./docker-build.sh
            sudo ./docker-build.sh
        else
            sudo docker-compose build --no-cache
            sudo docker-compose up -d
        fi
    fi
    
    echo "✅ Remote deployment completed!"
EOF

if [ $? -eq 0 ]; then
    log_success "Build triggered successfully via SSH!"
    echo ""
    log_info "Build has been initiated on the remote instance."
    log_info "You can monitor the progress by connecting to the instance:"
    echo "  ssh -i $KEY_FILE ec2-user@$INSTANCE_IP"
    echo "  sudo docker-compose logs -f"
else
    log_error "Build trigger failed"
    exit 1
fi