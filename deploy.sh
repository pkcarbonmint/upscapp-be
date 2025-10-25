#!/bin/bash
# Docker Compose Deployment script for UPSC Pro Stage2

# Log to both file and CloudWatch
exec > >(tee -a /opt/upscpro/upscapp-be/deploy.log) 2>&1
echo "Starting Docker Compose deployment at $(date)..."

# Change to application directory
cd /opt/upscpro/upscapp-be || { echo "ERROR: Failed to change to /opt/upscpro/upscapp-be directory"; exit 1; }

# Pull latest changes from git
if [ ! -z "${GITHUB_TOKEN}" ] && [ ! -z "${GITHUB_REPOSITORY_URL}" ]; then
    echo "Pulling latest changes from git..."
    git pull origin ${GITHUB_BRANCH:-main} || { echo "ERROR: Git pull failed"; exit 1; }
    echo "Git pull completed successfully."
else
    echo "WARNING: GitHub token or repository URL not provided. Skipping git pull."
fi

# Check if docker-compose file exists
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "ERROR: docker-compose.prod.yml not found. Please ensure the repository is cloned and contains this file."
    exit 1
fi

echo "Found docker-compose.prod.yml file."

# Check if Docker is running
if ! docker info > /dev/null 2>&1; then
    echo "ERROR: Docker is not running. Please start Docker service."
    exit 1
fi

echo "Docker is running."

# Build and restart services with docker-compose
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down || { echo "ERROR: Docker Compose down failed"; exit 1; }

echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache || { echo "ERROR: Docker Compose build failed"; exit 1; }

echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d || { echo "ERROR: Docker Compose up failed"; exit 1; }

echo "Docker Compose deployment completed at $(date)!"
echo "Services status:"
docker-compose -f docker-compose.prod.yml ps

echo "Deployment log saved to: /opt/upscpro/upscapp-be/deploy.log"
echo "To view logs: docker-compose -f docker-compose.prod.yml logs -f"
echo "To check status: docker-compose -f docker-compose.prod.yml ps"
