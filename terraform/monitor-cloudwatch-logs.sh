#!/bin/bash

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to check AWS CLI version
check_aws_cli_version() {
    local version=$(aws --version 2>&1 | grep -o 'aws-cli/[0-9]\+' | cut -d'/' -f2)
    echo "$version"
}

# Function to get log groups
get_log_groups() {
    local project_name=$(terraform output -raw project_name 2>/dev/null || echo "upscpro-stage2")
    aws logs describe-log-groups --log-group-name-prefix "/aws/ec2/$project_name" --query 'logGroups[*].logGroupName' --output text 2>/dev/null || echo ""
}

# Function to get log streams for a log group
get_log_streams() {
    local log_group="$1"
    aws logs describe-log-streams --log-group-name "$log_group" --order-by LastEventTime --descending --max-items 5 --query 'logStreams[*].logStreamName' --output text 2>/dev/null || echo ""
}

# Function to get recent logs from a log group
get_recent_logs() {
    local log_group="$1"
    local minutes="${2:-10}"
    local start_time=$(date -d "$minutes minutes ago" +%s)000
    
    aws logs filter-log-events \
        --log-group-name "$log_group" \
        --start-time "$start_time" \
        --query 'events[*].[timestamp,logStreamName,message]' \
        --output text 2>/dev/null || echo ""
}

# Function to tail logs (AWS CLI v2 only)
tail_logs() {
    local log_group="$1"
    local log_stream="$2"
    
    if [ -n "$log_stream" ]; then
        aws logs tail "$log_group" --follow --log-stream-names "$log_stream" 2>/dev/null
    else
        aws logs tail "$log_group" --follow 2>/dev/null
    fi
}

# Function to monitor Docker build status
monitor_docker_build() {
    local log_group="/aws/ec2/$(terraform output -raw project_name 2>/dev/null || echo "upscpro-stage2")-docker"
    
    echo -e "${BLUE}🐳 Monitoring Docker Build Status${NC}"
    echo "=================================="
    echo "Log Group: $log_group"
    echo ""
    
    # Check if log group exists
    if ! aws logs describe-log-groups --log-group-name "$log_group" >/dev/null 2>&1; then
        echo -e "${RED}❌ Log group not found: $log_group${NC}"
        echo "This means the EC2 instance hasn't been created yet or CloudWatch logging isn't configured."
        echo ""
        echo "To fix this:"
        echo "1. Run: terraform apply"
        echo "2. Wait for EC2 instance to be created and configured"
        echo "3. Try this command again"
        return 1
    fi
    
    # Get recent logs
    echo -e "${YELLOW}📋 Recent logs (last 10 minutes):${NC}"
    local recent_logs=$(get_recent_logs "$log_group" 10)
    
    if [ -n "$recent_logs" ]; then
        echo "$recent_logs" | while IFS=$'\t' read -r timestamp stream message; do
            local time_str=$(date -d "@$((timestamp/1000))" "+%H:%M:%S")
            echo -e "${GREEN}[$time_str]${NC} ${BLUE}[$stream]${NC} $message"
        done
    else
        echo -e "${YELLOW}No recent logs found${NC}"
    fi
    
    echo ""
    echo -e "${YELLOW}📊 Log Streams:${NC}"
    local streams=$(get_log_streams "$log_group")
    if [ -n "$streams" ]; then
        echo "$streams" | while read -r stream; do
            echo "  - $stream"
        done
    else
        echo "  No log streams found"
    fi
}

# Function to show all available log groups
show_log_groups() {
    echo -e "${BLUE}📋 Available Log Groups${NC}"
    echo "========================"
    
    local log_groups=$(get_log_groups)
    if [ -n "$log_groups" ]; then
        echo "$log_groups" | while read -r group; do
            echo "  - $group"
        done
    else
        echo -e "${YELLOW}No EC2 log groups found${NC}"
        echo ""
        echo "Available log groups:"
        aws logs describe-log-groups --query 'logGroups[*].logGroupName' --output table
    fi
}

# Function to follow logs in real-time
follow_logs() {
    local log_group="/aws/ec2/$(terraform output -raw project_name 2>/dev/null || echo "upscpro-stage2")-docker"
    local log_stream="$1"
    
    echo -e "${BLUE}👀 Following logs in real-time${NC}"
    echo "Log Group: $log_group"
    if [ -n "$log_stream" ]; then
        echo "Log Stream: $log_stream"
    fi
    echo "Press Ctrl+C to stop"
    echo ""
    
    # Check AWS CLI version
    local aws_version=$(check_aws_cli_version)
    if [ "$aws_version" -ge 2 ]; then
        echo -e "${GREEN}Using AWS CLI v2 (aws logs tail)${NC}"
        tail_logs "$log_group" "$log_stream"
    else
        echo -e "${YELLOW}Using AWS CLI v1 (polling)${NC}"
        echo "Note: Real-time following requires AWS CLI v2"
        echo "Showing recent logs every 5 seconds..."
        
        while true; do
            clear
            echo -e "${BLUE}👀 Following logs (polling every 5s)${NC}"
            echo "Log Group: $log_group"
            echo "Time: $(date)"
            echo ""
            
            get_recent_logs "$log_group" 1 | while IFS=$'\t' read -r timestamp stream message; do
                local time_str=$(date -d "@$((timestamp/1000))" "+%H:%M:%S")
                echo -e "${GREEN}[$time_str]${NC} ${BLUE}[$stream]${NC} $message"
            done
            
            sleep 5
        done
    fi
}

# Main function
main() {
    local action="${1:-status}"
    
    case "$action" in
        "status"|"build")
            monitor_docker_build
            ;;
        "groups")
            show_log_groups
            ;;
        "follow"|"tail")
            follow_logs "$2"
            ;;
        "recent")
            local minutes="${2:-10}"
            local log_group="/aws/ec2/$(terraform output -raw project_name 2>/dev/null || echo "upscpro-stage2")-docker"
            echo -e "${BLUE}📋 Recent logs (last $minutes minutes):${NC}"
            get_recent_logs "$log_group" "$minutes" | while IFS=$'\t' read -r timestamp stream message; do
                local time_str=$(date -d "@$((timestamp/1000))" "+%H:%M:%S")
                echo -e "${GREEN}[$time_str]${NC} ${BLUE}[$stream]${NC} $message"
            done
            ;;
        *)
            echo -e "${BLUE}CloudWatch Logs Monitor${NC}"
            echo "========================"
            echo ""
            echo "Usage: $0 [command] [options]"
            echo ""
            echo "Commands:"
            echo "  status, build    - Show Docker build status and recent logs"
            echo "  groups           - List all available log groups"
            echo "  follow, tail     - Follow logs in real-time"
            echo "  recent [minutes] - Show recent logs (default: 10 minutes)"
            echo ""
            echo "Examples:"
            echo "  $0 status"
            echo "  $0 follow"
            echo "  $0 recent 30"
            echo "  $0 groups"
            ;;
    esac
}

# Run main function
main "$@"
