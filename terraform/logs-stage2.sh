#!/bin/bash

# Simple CloudWatch Logs Monitor for AWS CLI v1
# Usage: ./logs-stage2.sh [service] [hours]

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

LOG_GROUP="/ecs/upscpro-stage2"
SERVICE=${1:-"all"}
HOURS=${2:-1}

echo -e "${BLUE}📊 CloudWatch Logs Monitor${NC}"
echo -e "${BLUE}Log Group: $LOG_GROUP${NC}"
echo -e "${BLUE}Service: $SERVICE${NC}"
echo -e "${BLUE}Hours: $HOURS${NC}"
echo ""

# Calculate start time
START_TIME=$(date -d "$HOURS hours ago" +%s)000

echo -e "${YELLOW}🔍 Fetching log streams...${NC}"

# Get log streams
STREAMS=$(aws logs describe-log-streams \
    --log-group-name "$LOG_GROUP" \
    --order-by LastEventTime \
    --descending \
    --max-items 20 \
    --query 'logStreams[].logStreamName' \
    --output text 2>/dev/null)

if [ -z "$STREAMS" ]; then
    echo -e "${YELLOW}⚠️  No log streams found. The services might not be running yet.${NC}"
    echo ""
    echo "Try these commands to check service status:"
    echo "  ./monitor-stage2.sh status"
    echo "  ./monitor-stage2.sh ecs"
    exit 1
fi

echo -e "${GREEN}✅ Found $(echo $STREAMS | wc -w) log streams${NC}"
echo ""

# Function to get logs from a stream
get_stream_logs() {
    local stream=$1
    local service_name=$(echo "$stream" | cut -d'/' -f1)
    
    echo -e "${BLUE}📝 Stream: $stream${NC}"
    
    # Get events from this stream
    local events=$(aws logs get-log-events \
        --log-group-name "$LOG_GROUP" \
        --log-stream-name "$stream" \
        --start-time "$START_TIME" \
        --query 'events[].[timestamp,message]' \
        --output text 2>/dev/null)
    
    if [ -n "$events" ]; then
        echo "$events" | while IFS=$'\t' read -r timestamp message; do
            if [ -n "$message" ]; then
                # Filter by service if specified
                if [ "$SERVICE" = "all" ] || echo "$message" | grep -qi "$SERVICE"; then
                    # Format timestamp
                    local formatted_time=$(date -d "@$((timestamp/1000))" '+%Y-%m-%d %H:%M:%S')
                    echo -e "${GREEN}[$formatted_time]${NC} $message"
                fi
            fi
        done
    else
        echo -e "${YELLOW}  No recent events in this stream${NC}"
    fi
    echo ""
}

# Process each stream
for stream in $STREAMS; do
    get_stream_logs "$stream"
done

echo -e "${BLUE}📊 Log monitoring complete${NC}"
echo ""
echo "To monitor logs in real-time, use:"
echo "  watch -n 5 './logs-stage2.sh $SERVICE 0.1'"
echo ""
echo "To check service status:"
echo "  ./monitor-stage2.sh status"
