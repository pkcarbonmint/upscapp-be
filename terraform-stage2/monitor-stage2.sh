#!/bin/bash

# UPSC Pro Stage2 Monitoring Script
# Usage: ./monitor-stage2.sh [service]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    local status=$1
    local message=$2
    if [ "$status" = "OK" ]; then
        echo -e "${GREEN}✅ $message${NC}"
    elif [ "$status" = "WARNING" ]; then
        echo -e "${YELLOW}⚠️  $message${NC}"
    elif [ "$status" = "ERROR" ]; then
        echo -e "${RED}❌ $message${NC}"
    else
        echo -e "${BLUE}ℹ️  $message${NC}"
    fi
}

# Function to check if terraform is initialized
check_terraform() {
    if [ ! -d ".terraform" ]; then
        print_status "ERROR" "Terraform not initialized. Run 'terraform init' first."
        exit 1
    fi
}

# Function to get terraform outputs
get_output() {
    terraform output -raw "$1" 2>/dev/null || echo ""
}

# Function to check ECS service status
check_ecs_status() {
    local cluster_name=$(get_output "project_name")
    cluster_name="${cluster_name}-cluster"
    
    print_status "INFO" "Checking ECS Service Status..."
    
    # Get service status
    local services=$(aws ecs list-services --cluster "$cluster_name" --query 'serviceArns[]' --output text)
    
    if [ -z "$services" ]; then
        print_status "WARNING" "No ECS services found in cluster: $cluster_name"
        return
    fi
    
    for service_arn in $services; do
        local service_name=$(basename "$service_arn")
        local service_status=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_arn" --query 'services[0].status' --output text)
        local running_count=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_arn" --query 'services[0].runningCount' --output text)
        local desired_count=$(aws ecs describe-services --cluster "$cluster_name" --services "$service_arn" --query 'services[0].desiredCount' --output text)
        
        if [ "$service_status" = "ACTIVE" ] && [ "$running_count" = "$desired_count" ]; then
            print_status "OK" "$service_name: $running_count/$desired_count tasks running"
        else
            print_status "ERROR" "$service_name: $running_count/$desired_count tasks running (Status: $service_status)"
        fi
    done
}

# Function to check ALB target health
check_alb_health() {
    print_status "INFO" "Checking ALB Target Health..."
    
    local target_group_arn=$(get_output "target_group_frontend_arn")
    if [ -z "$target_group_arn" ]; then
        print_status "WARNING" "No target group ARN found"
        return
    fi
    
    local health=$(aws elbv2 describe-target-health --target-group-arn "$target_group_arn" --query 'TargetHealthDescriptions[0].TargetHealth.State' --output text 2>/dev/null || echo "No targets")
    
    if [ "$health" = "healthy" ]; then
        print_status "OK" "ALB targets are healthy"
    else
        print_status "ERROR" "ALB targets are not healthy: $health"
    fi
}

# Function to tail CloudWatch logs
tail_logs() {
    local service=${1:-"all"}
    local log_group="/ecs/$(get_output "project_name")"
    
    print_status "INFO" "Tailing CloudWatch logs for: $log_group"
    print_status "INFO" "Press Ctrl+C to stop"
    
    # Check AWS CLI version
    local aws_version=$(aws --version 2>&1 | grep -o 'aws-cli/[0-9]\+\.[0-9]\+' | cut -d'/' -f2)
    local major_version=$(echo "$aws_version" | cut -d'.' -f1)
    
    if [ "$major_version" -ge 2 ]; then
        # AWS CLI v2 - use tail command
        if [ "$service" = "all" ]; then
            aws logs tail "$log_group" --follow
        else
            aws logs tail "$log_group" --follow --filter-pattern "$service"
        fi
    else
        # AWS CLI v1 - use get-log-events with polling
        print_status "INFO" "Using AWS CLI v1 compatible method..."
        tail_logs_v1 "$log_group" "$service"
    fi
}

# Function to tail logs using AWS CLI v1 method
tail_logs_v1() {
    local log_group=$1
    local service=$2
    local start_time=$(date -d '1 hour ago' +%s)000
    
    while true; do
        # Get log streams
        local streams=$(aws logs describe-log-streams \
            --log-group-name "$log_group" \
            --order-by LastEventTime \
            --descending \
            --max-items 10 \
            --query 'logStreams[].logStreamName' \
            --output text 2>/dev/null)
        
        if [ -n "$streams" ]; then
            for stream in $streams; do
                # Get recent events from each stream
                aws logs get-log-events \
                    --log-group-name "$log_group" \
                    --log-stream-name "$stream" \
                    --start-time "$start_time" \
                    --query 'events[].message' \
                    --output text 2>/dev/null | while read -r line; do
                    if [ -n "$line" ]; then
                        if [ "$service" = "all" ] || echo "$line" | grep -q "$service"; then
                            echo "$line"
                        fi
                    fi
                done
            done
        fi
        
        # Update start time for next iteration
        start_time=$(date +%s)000
        sleep 5
    done
}

# Function to show recent logs
show_recent_logs() {
    local service=${1:-"all"}
    local log_group="/ecs/$(get_output "project_name")"
    local hours=${2:-1}
    
    print_status "INFO" "Showing recent logs (last $hours hour(s)) for: $log_group"
    
    # Check AWS CLI version
    local aws_version=$(aws --version 2>&1 | grep -o 'aws-cli/[0-9]\+\.[0-9]\+' | cut -d'/' -f2)
    local major_version=$(echo "$aws_version" | cut -d'.' -f1)
    
    if [ "$major_version" -ge 2 ]; then
        # AWS CLI v2 - use tail command
        if [ "$service" = "all" ]; then
            aws logs tail "$log_group" --since "${hours}h"
        else
            aws logs tail "$log_group" --since "${hours}h" --filter-pattern "$service"
        fi
    else
        # AWS CLI v1 - use get-log-events
        show_recent_logs_v1 "$log_group" "$service" "$hours"
    fi
}

# Function to show recent logs using AWS CLI v1 method
show_recent_logs_v1() {
    local log_group=$1
    local service=$2
    local hours=$3
    local start_time=$(date -d "$hours hours ago" +%s)000
    
    # Get log streams
    local streams=$(aws logs describe-log-streams \
        --log-group-name "$log_group" \
        --order-by LastEventTime \
        --descending \
        --max-items 10 \
        --query 'logStreams[].logStreamName' \
        --output text 2>/dev/null)
    
    if [ -n "$streams" ]; then
        for stream in $streams; do
            echo "=== Log Stream: $stream ==="
            aws logs get-log-events \
                --log-group-name "$log_group" \
                --log-stream-name "$stream" \
                --start-time "$start_time" \
                --query 'events[].message' \
                --output text 2>/dev/null | while read -r line; do
                if [ -n "$line" ]; then
                    if [ "$service" = "all" ] || echo "$line" | grep -q "$service"; then
                        echo "$line"
                    fi
                fi
            done
            echo ""
        done
    else
        print_status "WARNING" "No log streams found in $log_group"
    fi
}

# Function to check application health endpoints
check_health_endpoints() {
    local alb_url=$(get_output "alb_url")
    
    if [ -z "$alb_url" ]; then
        print_status "WARNING" "No ALB URL found"
        return
    fi
    
    print_status "INFO" "Checking application health endpoints..."
    
    # Check main app health
    local app_health=$(curl -s -o /dev/null -w "%{http_code}" "$alb_url/healthcheck" 2>/dev/null || echo "000")
    if [ "$app_health" = "200" ]; then
        print_status "OK" "Main app health check: $app_health"
    else
        print_status "ERROR" "Main app health check: $app_health"
    fi
    
    # Check Helios health
    local helios_health=$(curl -s -o /dev/null -w "%{http_code}" "$alb_url/helios/health" 2>/dev/null || echo "000")
    if [ "$helios_health" = "200" ]; then
        print_status "OK" "Helios health check: $helios_health"
    else
        print_status "ERROR" "Helios health check: $helios_health"
    fi
}

# Function to show service URLs
show_urls() {
    print_status "INFO" "Service URLs:"
    echo "  Frontend: $(get_output "frontend_url")"
    echo "  Onboarding UI: $(get_output "onboarding_ui_url")"
    echo "  Faculty UI: $(get_output "faculty_ui_url")"
    echo "  ALB URL: $(get_output "alb_url")"
    echo "  CloudFront: $(get_output "cloudfront_url")"
}

# Function to show EC2 instance info (if enabled)
show_ec2_info() {
    local strapi_ip=$(get_output "strapi_instance_private_ip")
    local docker_ip=$(get_output "docker_instance_private_ip")
    
    if [ -n "$strapi_ip" ]; then
        print_status "INFO" "EC2 Instances:"
        echo "  Strapi CMS: http://$strapi_ip:1337 (private)"
        echo "  Docker Services: http://$docker_ip:8000 (private)"
        echo "  Celery Flower: http://$docker_ip:5555 (private)"
    fi
}

# Main function
main() {
    local command=${1:-"status"}
    
    check_terraform
    
    case $command in
        "status")
            print_status "INFO" "=== UPSC Pro Stage2 Status ==="
            check_ecs_status
            echo ""
            check_alb_health
            echo ""
            check_health_endpoints
            echo ""
            show_urls
            echo ""
            show_ec2_info
            ;;
        "logs")
            tail_logs "$2"
            ;;
        "recent")
            show_recent_logs "$2" "$3"
            ;;
        "health")
            check_health_endpoints
            ;;
        "urls")
            show_urls
            ;;
        "ecs")
            check_ecs_status
            ;;
        "alb")
            check_alb_health
            ;;
        *)
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  status          - Show overall status (default)"
            echo "  logs [service]  - Tail CloudWatch logs (service: app, helios, frontend, etc.)"
            echo "  recent [service] [hours] - Show recent logs (default: 1 hour)"
            echo "  health          - Check health endpoints"
            echo "  urls            - Show service URLs"
            echo "  ecs             - Check ECS service status"
            echo "  alb             - Check ALB target health"
            echo ""
            echo "Examples:"
            echo "  $0 status"
            echo "  $0 logs app"
            echo "  $0 recent helios 2"
            echo "  $0 health"
            ;;
    esac
}

main "$@"
