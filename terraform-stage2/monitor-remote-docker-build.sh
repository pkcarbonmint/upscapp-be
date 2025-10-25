#!/bin/bash

# Monitor Docker build progress on remote EC2 instance every 30 seconds
IP=$(terraform output -raw docker_instance_public_ip)
echo "Monitoring Docker build on $IP every 30 seconds..."
echo "Press Ctrl+C to stop monitoring"
echo ""

while true; do
    # Clear screen and show timestamp
    clear
    echo "=== Docker Build Monitor - $(date) ==="
    echo "Instance: $IP"
    echo ""
    
    # Check if docker-build.sh is still running
    echo "=== Build Process Status ==="
    ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ubuntu $IP "ps aux | grep docker-build | grep -v grep"
    
    echo ""
    echo "=== Docker Images ==="
    ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ubuntu $IP "docker images"
    
    echo ""
    echo "=== Build Log (last 10 lines) ==="
    ssh -i ~/.ssh/upscAppAwsKey -o StrictHostKeyChecking=no -l ubuntu $IP "tail -10 /var/log/docker-build.log"
    
    echo ""
    echo "Next update in 30 seconds... (Press Ctrl+C to stop)"
    
    # Wait 30 seconds
    sleep 30
done
