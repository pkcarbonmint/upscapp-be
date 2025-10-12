#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROVIDER=${PROVIDER:-"digitalocean"}
PROJECT_NAME=${PROJECT_NAME:-"upscpro"}
TERRAFORM_DIR=""

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to detect provider from terraform state
detect_provider() {
    if [ -d "terraform-digitalocean/.terraform" ] && [ -f "terraform-digitalocean/terraform.tfstate" ]; then
        PROVIDER="digitalocean"
        TERRAFORM_DIR="terraform-digitalocean"
    elif [ -d "terraform/.terraform" ] && [ -f "terraform/terraform.tfstate" ]; then
        PROVIDER="aws"
        TERRAFORM_DIR="terraform"
    else
        print_warning "No active deployment detected. Please specify provider."
        read -p "Which provider are you using? (1=DigitalOcean, 2=AWS): " choice
        case $choice in
            1) PROVIDER="digitalocean"; TERRAFORM_DIR="terraform-digitalocean" ;;
            2) PROVIDER="aws"; TERRAFORM_DIR="terraform" ;;
            *) print_error "Invalid choice"; exit 1 ;;
        esac
    fi
    
    print_status "Detected provider: $PROVIDER"
}

# DigitalOcean management functions
do_update_app_platform() {
    print_status "Updating DigitalOcean App Platform deployment..."
    
    cd $TERRAFORM_DIR
    local app_id=$(terraform output -raw app_platform_live_url 2>/dev/null | grep -o '[a-f0-9-]\{36\}' || echo "")
    
    if [ -z "$app_id" ]; then
        print_error "Could not find App Platform app ID"
        return 1
    fi
    
    # Trigger a new deployment
    doctl apps create-deployment $app_id
    
    print_success "App Platform deployment triggered"
}

do_check_app_status() {
    print_status "Checking DigitalOcean App Platform status..."
    
    cd $TERRAFORM_DIR
    local app_id=$(terraform output -raw app_platform_live_url 2>/dev/null | grep -o '[a-f0-9-]\{36\}' || echo "")
    
    if [ -z "$app_id" ]; then
        print_error "Could not find App Platform app ID"
        return 1
    fi
    
    doctl apps get $app_id --format ID,Spec.Name,LiveURL,UpdatedAt,ActiveDeployment.Phase
    
    # Check individual components
    print_status "Component status:"
    doctl apps get-deployment $app_id --format ID,Phase,Progress,CreatedAt
}

do_show_logs() {
    local component=${1:-"app"}
    
    print_status "Showing DigitalOcean App Platform logs for: $component"
    
    cd $TERRAFORM_DIR
    local app_id=$(terraform output -raw app_platform_live_url 2>/dev/null | grep -o '[a-f0-9-]\{36\}' || echo "")
    
    if [ -z "$app_id" ]; then
        print_error "Could not find App Platform app ID"
        return 1
    fi
    
    doctl apps logs $app_id --component $component --follow
}

do_check_droplet_status() {
    print_status "Checking DigitalOcean droplet status..."
    
    cd $TERRAFORM_DIR
    local droplet_ids=$(terraform output -json droplet_ids 2>/dev/null | jq -r '.[]' || echo "")
    
    if [ -z "$droplet_ids" ]; then
        print_warning "No droplets found or using App Platform"
        return 0
    fi
    
    for id in $droplet_ids; do
        echo "Droplet $id:"
        doctl compute droplet get $id --format ID,Name,PublicIPv4,Status,Region,Size
    done
}

# AWS management functions (reuse existing functions)
aws_update_ecs_service() {
    local service_name=$1
    local cluster_name="${PROJECT_NAME}-cluster"
    local region=$(cd $TERRAFORM_DIR && terraform output -raw aws_region 2>/dev/null || echo "us-west-2")
    
    print_status "Updating AWS ECS service: $service_name"
    
    aws ecs update-service \
        --region $region \
        --cluster $cluster_name \
        --service $service_name \
        --force-new-deployment \
        --query 'service.serviceName' \
        --output text > /dev/null
    
    print_success "ECS service $service_name update initiated"
}

aws_check_service_status() {
    local service_name=$1
    local cluster_name="${PROJECT_NAME}-cluster"
    local region=$(cd $TERRAFORM_DIR && terraform output -raw aws_region 2>/dev/null || echo "us-west-2")
    
    print_status "Checking AWS ECS service status: $service_name"
    
    local running_count=$(aws ecs describe-services \
        --region $region \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].runningCount' \
        --output text)
    
    local desired_count=$(aws ecs describe-services \
        --region $region \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].desiredCount' \
        --output text)
    
    echo "  $service_name: $running_count/$desired_count tasks running"
    
    if [ "$running_count" -eq "$desired_count" ]; then
        print_success "Service $service_name is healthy"
        return 0
    else
        print_warning "Service $service_name is not fully healthy"
        return 1
    fi
}

aws_show_logs() {
    local service_name=${1:-"app"}
    local lines=${2:-50}
    local region=$(cd $TERRAFORM_DIR && terraform output -raw aws_region 2>/dev/null || echo "us-west-2")
    
    print_status "Showing AWS CloudWatch logs for $service_name (last $lines lines):"
    
    local log_group="/ecs/$PROJECT_NAME"
    
    aws logs describe-log-streams \
        --region $region \
        --log-group-name $log_group \
        --order-by LastEventTime \
        --descending \
        --max-items 1 \
        --query "logStreams[?starts_with(logStreamName, '$service_name')].logStreamName" \
        --output text | head -1 | while read stream; do
        
        if [ -n "$stream" ]; then
            aws logs get-log-events \
                --region $region \
                --log-group-name $log_group \
                --log-stream-name "$stream" \
                --limit $lines \
                --query 'events[].message' \
                --output text
        fi
    done
}

# Generic functions that work with both providers
update_services() {
    case $PROVIDER in
        "digitalocean")
            cd $TERRAFORM_DIR
            local use_app_platform=$(terraform output -raw app_platform_live_url 2>/dev/null && echo "true" || echo "false")
            
            if [ "$use_app_platform" = "true" ]; then
                do_update_app_platform
            else
                print_status "Updating droplet services..."
                # For droplets, we could SSH and restart docker-compose
                print_warning "Droplet service updates require manual intervention or custom scripts"
            fi
            ;;
        "aws")
            local services=("${PROJECT_NAME}-app" "${PROJECT_NAME}-frontend" "${PROJECT_NAME}-celery")
            
            for service in "${services[@]}"; do
                aws_update_ecs_service $service
            done
            
            # Wait for services to stabilize
            for service in "${services[@]}"; do
                print_status "Waiting for $service to stabilize..."
                local region=$(cd $TERRAFORM_DIR && terraform output -raw aws_region 2>/dev/null || echo "us-west-2")
                aws ecs wait services-stable --region $region --cluster "${PROJECT_NAME}-cluster" --services $service
            done
            ;;
    esac
}

check_status() {
    case $PROVIDER in
        "digitalocean")
            cd $TERRAFORM_DIR
            local use_app_platform=$(terraform output -raw app_platform_live_url 2>/dev/null && echo "true" || echo "false")
            
            if [ "$use_app_platform" = "true" ]; then
                do_check_app_status
            else
                do_check_droplet_status
            fi
            
            # Check database and other services
            print_status "Infrastructure status:"
            terraform output
            ;;
        "aws")
            local services=("${PROJECT_NAME}-app" "${PROJECT_NAME}-frontend" "${PROJECT_NAME}-celery")
            
            print_status "Checking AWS ECS service status..."
            local all_healthy=true
            for service in "${services[@]}"; do
                if ! aws_check_service_status $service; then
                    all_healthy=false
                fi
            done
            
            if [ "$all_healthy" = true ]; then
                print_success "All AWS services are healthy!"
            else
                print_warning "Some AWS services are not fully healthy"
            fi
            ;;
    esac
}

show_logs() {
    local service_name=${1:-"app"}
    
    case $PROVIDER in
        "digitalocean")
            do_show_logs $service_name
            ;;
        "aws")
            aws_show_logs $service_name
            ;;
    esac
}

check_health() {
    print_status "Checking application health endpoints..."
    
    local app_url=""
    
    case $PROVIDER in
        "digitalocean")
            cd $TERRAFORM_DIR
            app_url=$(terraform output -raw app_platform_live_url 2>/dev/null || terraform output -raw application_url 2>/dev/null || echo "")
            ;;
        "aws")
            cd $TERRAFORM_DIR
            app_url=$(terraform output -raw alb_url 2>/dev/null || echo "")
            ;;
    esac
    
    if [ -z "$app_url" ]; then
        print_error "Could not determine application URL"
        return 1
    fi
    
    print_status "Testing application at: $app_url"
    
    # Test main endpoint
    if curl -s --max-time 10 "$app_url" > /dev/null; then
        print_success "Main application is responding"
    else
        print_warning "Main application is not responding"
    fi
    
    # Test health endpoint (adjust path based on your app)
    if curl -s --max-time 10 "$app_url/healthcheck" > /dev/null; then
        print_success "Health endpoint is responding"
    elif curl -s --max-time 10 "$app_url/api/healthcheck" > /dev/null; then
        print_success "API health endpoint is responding"
    else
        print_warning "Health endpoints are not responding"
    fi
}

show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  update [service]    Update services/deployments"
    echo "  status             Show status of all services"
    echo "  logs [service]     Show recent logs for a service"
    echo "  health             Check application health endpoints"
    echo "  help               Show this help message"
    echo ""
    echo "Services (AWS only):"
    echo "  app               Main application service"
    echo "  frontend          Frontend service"
    echo "  celery            Celery worker service"
    echo ""
    echo "For DigitalOcean App Platform, service names are: app, helios, celery"
    echo ""
    echo "Examples:"
    echo "  $0 update              # Update all services"
    echo "  $0 logs app            # Show app logs"
    echo "  $0 status              # Show status of all services"
}

# Main function
main() {
    local command=${1:-"status"}
    local target=${2:-}
    
    # Detect provider if not set
    if [ -z "$PROVIDER_OVERRIDE" ]; then
        detect_provider
    fi
    
    case $command in
        "update")
            update_services
            ;;
        "status")
            check_status
            ;;
        "logs")
            show_logs $target
            ;;
        "health")
            check_health
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Handle provider override from command line
case "${1:-}" in
    "digitalocean"|"do")
        PROVIDER="digitalocean"
        TERRAFORM_DIR="terraform-digitalocean"
        PROVIDER_OVERRIDE=true
        shift
        ;;
    "aws")
        PROVIDER="aws"
        TERRAFORM_DIR="terraform"
        PROVIDER_OVERRIDE=true
        shift
        ;;
esac

# Run main function
main "$@"