#!/bin/bash
# Docker Compose Deployment script for UPSC Pro Stage2
set -e

# Log to both file and CloudWatch
exec > >(tee -a /opt/upscpro/upscapp-be/deploy.log) 2>&1
echo "Starting Docker Compose deployment at $(date)..."

# Change to application directory
cd /opt/upscpro/upscapp-be || { echo "ERROR: Failed to change to /opt/upscpro/upscapp-be directory"; exit 1; }

# Pull latest changes from git
if [ ! -z "${GITHUB_TOKEN}" ] && [ ! -z "${GITHUB_REPOSITORY_URL}" ]; then
    echo "Pulling latest changes from git..."
    # Validate GitHub token format (should start with ghp_)
    if [[ "${GITHUB_TOKEN}" =~ ^ghp_ ]]; then
        git pull origin ${GITHUB_BRANCH:-main} || { echo "ERROR: Git pull failed"; exit 1; }
        echo "Git pull completed successfully."
    else
        echo "WARNING: GitHub token format appears invalid (should start with 'ghp_'). Skipping git pull."
    fi
else
    echo "WARNING: GitHub token or repository URL not provided. Skipping git pull."
fi

# Check if docker-compose file exists
if [ ! -f "docker-compose.yml" ]; then
    echo "ERROR: docker-compose.yml not found. Please ensure the repository is cloned and contains this file."
    exit 1
fi

echo "Found docker-compose.yml file."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker service."
    exit 1
fi

echo "Docker is running."

echo "Building Docker images..."
./docker-build.sh

echo "Starting services..."
docker-compose -f docker-compose.yml up -d

echo "Docker Compose deployment completed at $(date)!"
echo "Services status:"
docker-compose -f docker-compose.yml ps

echo ""
echo "=== Deployment Summary ==="
echo "✅ Deployment completed successfully"
echo "📁 Application directory: /opt/upscpro/upscapp-be"
echo "📋 Deployment log: /opt/upscpro/upscapp-be/deploy.log"
echo ""
echo "🔧 Useful commands:"
echo "   View logs: docker-compose -f docker-compose.yml logs -f"
echo "   Check status: docker-compose -f docker-compose.yml ps"
echo "   Restart services: docker-compose -f docker-compose.yml restart"
echo "   Stop services: docker-compose -f docker-compose.yml down"
