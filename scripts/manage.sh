#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME=${PROJECT_NAME:-"upscpro"}
AWS_REGION=${AWS_REGION:-"us-west-2"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

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

# Function to update ECS service
update_ecs_service() {
    local service_name=$1
    local cluster_name="${PROJECT_NAME}-cluster"
    
    print_status "Updating ECS service: $service_name"
    
    # Force new deployment
    aws ecs update-service \
        --region $AWS_REGION \
        --cluster $cluster_name \
        --service $service_name \
        --force-new-deployment \
        --query 'service.serviceName' \
        --output text
    
    print_success "Service $service_name update initiated"
}

# Function to wait for service to become stable
wait_for_service() {
    local service_name=$1
    local cluster_name="${PROJECT_NAME}-cluster"
    
    print_status "Waiting for service $service_name to become stable..."
    
    aws ecs wait services-stable \
        --region $AWS_REGION \
        --cluster $cluster_name \
        --services $service_name
    
    print_success "Service $service_name is now stable"
}

# Function to check service status
check_service_status() {
    local service_name=$1
    local cluster_name="${PROJECT_NAME}-cluster"
    
    print_status "Checking status of service: $service_name"
    
    local running_count=$(aws ecs describe-services \
        --region $AWS_REGION \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].runningCount' \
        --output text)
    
    local desired_count=$(aws ecs describe-services \
        --region $AWS_REGION \
        --cluster $cluster_name \
        --services $service_name \
        --query 'services[0].desiredCount' \
        --output text)
    
    echo "  Running: $running_count/$desired_count tasks"
    
    if [ "$running_count" -eq "$desired_count" ]; then
        print_success "Service $service_name is healthy"
        return 0
    else
        print_warning "Service $service_name is not fully healthy"
        return 1
    fi
}

# Function to show service logs
show_logs() {
    local service_name=$1
    local lines=${2:-50}
    
    print_status "Showing recent logs for $service_name (last $lines lines):"
    
    # Get log group name
    local log_group="/ecs/$PROJECT_NAME"
    
    # Get recent log streams
    local log_streams=$(aws logs describe-log-streams \
        --region $AWS_REGION \
        --log-group-name $log_group \
        --order-by LastEventTime \
        --descending \
        --max-items 5 \
        --query "logStreams[?starts_with(logStreamName, '$service_name')].logStreamName" \
        --output text)
    
    if [ -n "$log_streams" ]; then
        for stream in $log_streams; do
            echo "--- Log stream: $stream ---"
            aws logs get-log-events \
                --region $AWS_REGION \
                --log-group-name $log_group \
                --log-stream-name $stream \
                --limit $lines \
                --query 'events[].message' \
                --output text | tail -n $lines
            echo ""
            break  # Just show the most recent stream
        done
    else
        print_warning "No log streams found for $service_name"
    fi
}

# Function to check application health
check_health() {
    print_status "Checking application health..."
    
    # Get ALB DNS name from Terraform output
    cd terraform
    local alb_url=$(terraform output -raw alb_url 2>/dev/null || echo "")
    cd ..
    
    if [ -z "$alb_url" ]; then
        print_error "Could not get ALB URL from Terraform output"
        return 1
    fi
    
    print_status "Testing application endpoints..."
    
    # Test frontend
    if curl -s --max-time 10 "$alb_url" > /dev/null; then
        print_success "Frontend is responding"
    else
        print_warning "Frontend is not responding"
    fi
    
    # Test API health endpoint
    if curl -s --max-time 10 "$alb_url/api/healthcheck" > /dev/null; then
        print_success "API healthcheck is responding"
    else
        print_warning "API healthcheck is not responding"
    fi
    
    # Test Helios health endpoint
    if curl -s --max-time 10 "$alb_url/helios/health" > /dev/null; then
        print_success "Helios health endpoint is responding"
    else
        print_warning "Helios health endpoint is not responding"
    fi
}

# Function to update all services
update_all_services() {
    local services=("${PROJECT_NAME}-app" "${PROJECT_NAME}-frontend" "${PROJECT_NAME}-celery")
    
    print_status "Updating all ECS services..."
    
    for service in "${services[@]}"; do
        update_ecs_service $service
    done
    
    print_status "Waiting for all services to stabilize..."
    
    for service in "${services[@]}"; do
        wait_for_service $service
    done
    
    print_success "All services updated successfully!"
}

# Function to show service status
status() {
    local services=("${PROJECT_NAME}-app" "${PROJECT_NAME}-frontend" "${PROJECT_NAME}-celery")
    
    print_status "Checking status of all services..."
    
    local all_healthy=true
    for service in "${services[@]}"; do
        if ! check_service_status $service; then
            all_healthy=false
        fi
    done
    
    if [ "$all_healthy" = true ]; then
        print_success "All services are healthy!"
    else
        print_warning "Some services are not fully healthy"
    fi
    
    # Check application health
    check_health
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND] [OPTIONS]"
    echo ""
    echo "Commands:"
    echo "  update [service]    Update ECS service(s) - force new deployment"
    echo "  status             Show status of all services"
    echo "  logs [service]     Show recent logs for a service"
    echo "  health             Check application health endpoints"
    echo "  help               Show this help message"
    echo ""
    echo "Services:"
    echo "  app               Main application service"
    echo "  frontend          Frontend service"
    echo "  celery            Celery worker service"
    echo "  all               All services (default for update)"
    echo ""
    echo "Examples:"
    echo "  $0 update app             # Update only the app service"
    echo "  $0 update                 # Update all services"
    echo "  $0 logs app               # Show app logs"
    echo "  $0 status                 # Show status of all services"
}

# Main function
main() {
    local command=${1:-"status"}
    local target=${2:-"all"}
    
    case $command in
        "update")
            case $target in
                "app")
                    update_ecs_service "${PROJECT_NAME}-app"
                    wait_for_service "${PROJECT_NAME}-app"
                    ;;
                "frontend")
                    update_ecs_service "${PROJECT_NAME}-frontend"
                    wait_for_service "${PROJECT_NAME}-frontend"
                    ;;
                "celery")
                    update_ecs_service "${PROJECT_NAME}-celery"
                    wait_for_service "${PROJECT_NAME}-celery"
                    ;;
                "all")
                    update_all_services
                    ;;
                *)
                    print_error "Unknown service: $target"
                    show_help
                    exit 1
                    ;;
            esac
            ;;
        "status")
            status
            ;;
        "logs")
            if [ "$target" = "all" ]; then
                show_logs "app"
                echo ""
                show_logs "frontend"
                echo ""
                show_logs "celery"
            else
                show_logs "$target"
            fi
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

# Run main function
main "$@"