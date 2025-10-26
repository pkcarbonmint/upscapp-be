#!/bin/bash

# EC2 Instance Recreation Script for UPSC Pro Stage2
# This script safely destroys and recreates EC2 instances while preserving other infrastructure

set -e
set -a; source .env; set +a;
# Check that TF_TF_VAR_github_token and TF_VAR_github_repository_url
# are set
if [ -z "$TF_VAR_github_token" ] || [ -z "$TF_VAR_github_repository_url" ]; then
    echo "Error: TF_VAR_github_token and TF_VAR_github_repository_url must be set"
    exit 1
fi

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
    echo "  -a, --all                Recreate all EC2 instances (strapi + docker)"
    echo "  -s, --strapi-only       Recreate only Strapi instance"
    echo "  -d, --docker-only        Recreate only Docker instance"
    echo "  -f, --force              Skip confirmation prompts"
    echo "  -p, --plan-only          Show what will be destroyed/recreated (dry run)"
    echo ""
    echo "Examples:"
    echo "  $0 -a                    # Recreate all EC2 instances"
    echo "  $0 -s -f                 # Force recreate Strapi instance only"
    echo "  $0 -d -p                 # Plan recreation of Docker instance only"
}

# Default values
RECREATE_ALL=false
RECREATE_STRAPI=false
RECREATE_DOCKER=false
FORCE=false
PLAN_ONLY=false

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            usage
            exit 0
            ;;
        -a|--all)
            RECREATE_ALL=true
            shift
            ;;
        -s|--strapi-only)
            RECREATE_STRAPI=true
            shift
            ;;
        -d|--docker-only)
            RECREATE_DOCKER=true
            shift
            ;;
        -f|--force)
            FORCE=true
            shift
            ;;
        -p|--plan-only)
            PLAN_ONLY=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            usage
            exit 1
            ;;
    esac
done

# Validate arguments
if [[ "$RECREATE_ALL" == false && "$RECREATE_STRAPI" == false && "$RECREATE_DOCKER" == false ]]; then
    log_error "Please specify which instances to recreate. Use -a, -s, or -d"
    usage
    exit 1
fi

# Check if we're in the right directory
if [[ ! -f "main.tf" ]]; then
    log_error "Please run this script from the terraform-stage2 directory"
    exit 1
fi

# Check if Terraform is initialized
if [[ ! -d ".terraform" ]]; then
    log_error "Terraform not initialized. Please run 'terraform init' first"
    exit 1
fi

# Function to confirm action
confirm_action() {
    if [[ "$FORCE" == true ]]; then
        return 0
    fi
    
    local message="$1"
    echo -e "${YELLOW}$message${NC}"
    read -p "Do you want to continue? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        log_info "Operation cancelled"
        exit 0
    fi
}

# Function to show current state
show_current_state() {
    log_info "Current EC2 instances:"
    terraform show | grep -A 20 "aws_instance" || log_warning "No EC2 instances found"
}

# Function to plan destruction
plan_destruction() {
    local target="$1"
    log_info "Planning destruction of $target..."
    
    if [[ "$target" == "strapi" ]]; then
        terraform plan -destroy -target=aws_instance.strapi
    elif [[ "$target" == "docker" ]]; then
        terraform plan -destroy -target=aws_instance.docker
    elif [[ "$target" == "all" ]]; then
        terraform plan -destroy -target=aws_instance.strapi -target=aws_instance.docker
    fi
}

# Function to destroy instances
destroy_instances() {
    local target="$1"
    log_warning "Destroying $target instance(s)..."
    
    if [[ "$target" == "strapi" ]]; then
        terraform destroy -target=aws_instance.strapi -auto-approve
    elif [[ "$target" == "docker" ]]; then
        terraform destroy -target=aws_instance.docker -auto-approve
    elif [[ "$target" == "all" ]]; then
        terraform destroy -target=aws_instance.strapi -target=aws_instance.docker -auto-approve
    fi
    
    log_success "$target instance(s) destroyed"
}

# Function to recreate instances
recreate_instances() {
    local target="$1"
    log_info "Recreating $target instance(s)..."
    
    if [[ "$target" == "strapi" ]]; then
        terraform apply -target=aws_instance.strapi -auto-approve
    elif [[ "$target" == "docker" ]]; then
        terraform apply -target=aws_instance.docker -auto-approve
    elif [[ "$target" == "all" ]]; then
        terraform apply -target=aws_instance.strapi -target=aws_instance.docker -auto-approve
    fi
    
    log_success "$target instance(s) recreated"
}

# Function to show new instance details
show_instance_details() {
    log_info "New instance details:"
    
    if [[ "$RECREATE_ALL" == true || "$RECREATE_STRAPI" == true ]]; then
        echo "Strapi Instance:"
        terraform output strapi_instance_private_ip 2>/dev/null || log_warning "Strapi instance not found"
    fi
    
    if [[ "$RECREATE_ALL" == true || "$RECREATE_DOCKER" == true ]]; then
        echo "Docker Instance:"
        terraform output docker_instance_public_ip 2>/dev/null || log_warning "Docker instance not found"
        terraform output docker_instance_private_ip 2>/dev/null || log_warning "Docker instance not found"
    fi
}

# Main execution
main() {
    log_info "Starting EC2 instance recreation process..."
    
    # Show current state
    show_current_state
    
    # Determine target
    local target=""
    if [[ "$RECREATE_ALL" == true ]]; then
        target="all"
    elif [[ "$RECREATE_STRAPI" == true ]]; then
        target="strapi"
    elif [[ "$RECREATE_DOCKER" == true ]]; then
        target="docker"
    fi
    
    # Plan only mode
    if [[ "$PLAN_ONLY" == true ]]; then
        plan_destruction "$target"
        log_info "This was a dry run. No changes were made."
        exit 0
    fi
    
    # Confirm action
    confirm_action "This will destroy and recreate $target EC2 instance(s). This action cannot be undone!"
    
    # Plan destruction
    plan_destruction "$target"
    
    # Confirm destruction
    confirm_action "The above plan shows what will be destroyed. Continue with destruction?"
    
    # Destroy instances
    destroy_instances "$target"
    
    # Wait a moment
    log_info "Waiting 10 seconds before recreation..."
    sleep 10
    
    # Recreate instances
    recreate_instances "$target"
    
    # Show new instance details
    show_instance_details
    
    log_success "EC2 instance recreation completed!"
    log_info "Note: The new instances will take a few minutes to fully initialize with the updated user data scripts."
}

# Run main function
main "$@"


