#!/bin/bash

# Remote Docker Deployment Script for UPSC Pro Stage2
# This script triggers Docker builds and deployment on the remote EC2 instance

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

# Function to display usage
usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -i, --instance-id ID    EC2 instance ID (auto-detected if not provided)"
    echo "  -k, --key-file PATH     SSH key file path (default: ~/.ssh/upscAppAwsKey)"
    echo "  -f, --follow-logs       Follow deployment logs in real-time"
    echo "  -s, --status            Check deployment status only"
    echo "  -r, --restart           Restart all services"
    echo "  -c, --clean             Clean build (remove existing containers/images)"
    echo "  -b, --branch BRANCH     Git branch to deploy (default: algo_refactor)"
    echo ""
    echo "Examples:"
    echo "  $0                      # Deploy with default settings"
    echo "  $0 -f                   # Deploy and follow logs"
    echo "  $0 -s                   # Check status only"
    echo "  $0 -r                   # Restart services"
    echo "  $0 -c -f                # Clean build and follow logs"
    echo "  $0 -b main -f           # Deploy main branch and follow logs"
}

# Default values
INSTANCE_ID=""
KEY_FILE="$HOME/.ssh/upscAppAwsKey"
FOLLOW_LOGS=false
STATUS_ONLY=false
RESTART_ONLY=false
CLEAN_BUILD=false
BRANCH="algo_refactor"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -i|--instance-id)
            INSTANCE_ID="$2"
            shift 2
            ;;
        -k|--key-file)
            KEY_FILE="$2"
            shift 2
            ;;
        -f|--follow-logs)
            FOLLOW_LOGS=true
            shift
            ;;
        -s|--status)
            STATUS_ONLY=true
            shift
            ;;
        -r|--restart)
            RESTART_ONLY=true
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -b|--branch)
            BRANCH="$2"
            shift 2
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Get instance details from Terraform
get_instance_info() {
    log_info "Getting instance information from Terraform..."
    
    if [ -z "$INSTANCE_ID" ]; then
        INSTANCE_ID=$(terraform output -raw docker_instance_id 2>/dev/null || echo "")
        if [ -z "$INSTANCE_ID" ]; then
            log_error "Could not get instance ID from Terraform. Please provide it with -i option."
            exit 1
        fi
    fi
    
    INSTANCE_IP=$(terraform output -raw docker_instance_public_ip 2>/dev/null || echo "")
    if [ -z "$INSTANCE_IP" ]; then
        log_error "Could not get instance IP from Terraform."
        exit 1
    fi
    
    log_success "Instance ID: $INSTANCE_ID"
    log_success "Instance IP: $INSTANCE_IP"
}

# Check if SSH key exists
check_ssh_key() {
    if [ ! -f "$KEY_FILE" ]; then
        log_error "SSH key file not found: $KEY_FILE"
        log_info "Please ensure the SSH key exists or specify a different path with -k option."
        exit 1
    fi
    
    # Set proper permissions
    chmod 600 "$KEY_FILE" 2>/dev/null || true
}

# Test SSH connection
test_ssh_connection() {
    log_info "Testing SSH connection..."
    
    if ssh -i "$KEY_FILE" -o ConnectTimeout=10 -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" "echo 'SSH connection successful'" >/dev/null 2>&1; then
        log_success "SSH connection successful"
    else
        log_error "SSH connection failed. Please check:"
        log_error "  - Instance is running"
        log_error "  - Security group allows SSH (port 22)"
        log_error "  - SSH key is correct"
        exit 1
    fi
}

# Check deployment status
check_status() {
    log_info "Checking deployment status..."
    
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
        cd /opt/upscpro/upscapp-be
        
        echo "=== Docker Status ==="
        if command -v docker >/dev/null 2>&1; then
            docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"
        else
            echo "Docker not installed"
        fi
        
        echo ""
        echo "=== Docker Compose Status ==="
        if command -v docker-compose >/dev/null 2>&1; then
            docker-compose ps 2>/dev/null || echo "No docker-compose.yml found or services not running"
        else
            echo "Docker Compose not installed"
        fi
        
        echo ""
        echo "=== Recent Deployment Logs ==="
        if [ -f "deploy.log" ]; then
            tail -20 deploy.log
        else
            echo "No deployment log found"
        fi
EOF
}

# Restart services
restart_services() {
    log_info "Restarting services..."
    
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
        cd /opt/upscpro/upscapp-be
        
        echo "Stopping existing services..."
        docker-compose down 2>/dev/null || true
        
        echo "Starting services..."
        docker-compose up -d
        
        echo "Service status:"
        docker-compose ps
EOF
    
    log_success "Services restarted"
}

# Clean build
clean_build() {
    log_info "Performing clean build..."
    
    ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" << 'EOF'
        cd /opt/upscpro/upscapp-be
        
        echo "Stopping and removing containers..."
        docker-compose down 2>/dev/null || true
        
        echo "Removing unused images..."
        docker image prune -f
        
        echo "Removing unused volumes..."
        docker volume prune -f
        
        echo "Clean build completed"
EOF
    
    log_success "Clean build completed"
}

# Deploy application
deploy_application() {
    log_info "Starting deployment on remote instance..."
    log_info "Branch: $BRANCH"
    
    if [ "$CLEAN_BUILD" = true ]; then
        clean_build
    fi
    
    # Create deployment command
    DEPLOY_CMD="cd /opt/upscpro/upscapp-be"
    
    if [ "$BRANCH" != "algo_refactor" ]; then
        DEPLOY_CMD="$DEPLOY_CMD && git checkout $BRANCH"
    fi
    
    DEPLOY_CMD="$DEPLOY_CMD && ./deploy.sh"
    
    if [ "$FOLLOW_LOGS" = true ]; then
        log_info "Deploying and following logs..."
        ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" "$DEPLOY_CMD" &
        DEPLOY_PID=$!
        
        # Wait a moment for deployment to start
        sleep 5
        
        # Follow logs
        log_info "Following deployment logs..."
        ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" "cd /opt/upscpro/upscapp-be && tail -f deploy.log" &
        LOG_PID=$!
        
        # Wait for deployment to complete
        wait $DEPLOY_PID
        
        # Stop log following
        kill $LOG_PID 2>/dev/null || true
    else
        log_info "Deploying (this may take several minutes)..."
        ssh -i "$KEY_FILE" -o StrictHostKeyChecking=no ec2-user@"$INSTANCE_IP" "$DEPLOY_CMD"
    fi
    
    log_success "Deployment completed!"
}

# Main execution
main() {
    echo "🚀 UPSC Pro Stage2 Remote Deployment"
    echo "===================================="
    
    # Change to terraform directory
    cd "$(dirname "$0")"
    
    # Get instance information
    get_instance_info
    
    # Check prerequisites
    check_ssh_key
    test_ssh_connection
    
    # Execute based on options
    if [ "$STATUS_ONLY" = true ]; then
        check_status
    elif [ "$RESTART_ONLY" = true ]; then
        restart_services
    else
        deploy_application
    fi
    
    # Show final status
    if [ "$STATUS_ONLY" = false ] && [ "$RESTART_ONLY" = false ]; then
        echo ""
        log_info "Final deployment status:"
        check_status
    fi
    
    echo ""
    log_success "Remote deployment script completed!"
    echo ""
    echo "🔧 Useful commands:"
    echo "   Check status: $0 -s"
    echo "   Follow logs: $0 -f"
    echo "   Restart: $0 -r"
    echo "   Clean build: $0 -c"
}

# Run main function
main "$@"
