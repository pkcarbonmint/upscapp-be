#!/bin/bash
set -e

# Enhanced Docker User Data Script with Automatic Build
# This script sets up Docker environment and triggers automatic build

# Enhanced error handling and logging
exec > >(tee -a /var/log/user-data.log) 2>&1
echo "=== Starting enhanced Docker user data script at $(date) ==="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to handle errors with retry
handle_error() {
    log "ERROR: $1"
    echo "ERROR: $1" >> /var/log/user-data-error.log
    return 1
}

# Function to retry commands
retry_command() {
    local max_attempts=3
    local timeout=1
    local attempt=1
    local cmd="$@"
    
    until $cmd; do
        if [ $attempt -ge $max_attempts ]; then
            log "Command failed after $max_attempts attempts: $cmd"
            return 1
        fi
        log "Command failed (attempt $attempt/$max_attempts): $cmd. Retrying in $timeout seconds..."
        sleep $timeout
        attempt=$((attempt + 1))
        timeout=$((timeout * 2))
    done
    return 0
}

# Function to wait for service to be ready
wait_for_service() {
    local service_name=$1
    local max_wait=120
    local waited=0
    
    log "Waiting for $service_name to be ready..."
    
    while ! systemctl is-active --quiet $service_name; do
        if [ $waited -ge $max_wait ]; then
            log "Timeout waiting for $service_name"
            return 1
        fi
        sleep 2
        waited=$((waited + 2))
    done
    
    log "$service_name is ready"
    return 0
}

# Function to send logs to CloudWatch
setup_cloudwatch_logging() {
    log "Setting up CloudWatch logging..."
    
    # Install CloudWatch agent
    retry_command yum install -y amazon-cloudwatch-agent || handle_error "CloudWatch agent installation failed"
    
    # Configure CloudWatch agent for user-data logs
    cat > /opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json << 'EOF'
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/user-data",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/user-data-error.log",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/user-data-errors",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/upscpro/upscapp-be/deploy.log",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/deploy",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF
    
    # Start CloudWatch agent
    /opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
        -a fetch-config \
        -m ec2 \
        -s \
        -c file:/opt/aws/amazon-cloudwatch-agent/etc/cloudwatch-config.json || true
    
    log "CloudWatch logging configured"
}

# Step 1: System Update
log "Step 1/10: Updating system packages..."
retry_command yum update -y || handle_error "System update failed"

# Step 2: Install CloudWatch
log "Step 2/10: Setting up CloudWatch logging..."
setup_cloudwatch_logging

# Step 3: Install Docker
log "Step 3/10: Installing Docker..."
retry_command yum install -y docker || handle_error "Docker installation failed"

log "Starting Docker service..."
systemctl start docker || handle_error "Docker service start failed"
systemctl enable docker || handle_error "Docker service enable failed"

# Wait for Docker to be fully ready
log "Waiting for Docker daemon to be ready..."
wait_for_service docker || handle_error "Docker service did not become ready"

# Additional wait for Docker socket
sleep 5

# Verify Docker is working
if ! docker info > /dev/null 2>&1; then
    handle_error "Docker is not working properly"
fi

usermod -a -G docker ec2-user || handle_error "Adding ec2-user to docker group failed"
log "Docker installed and running"

# Step 4: Install Docker Compose
log "Step 4/10: Installing Docker Compose..."
retry_command curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || handle_error "Docker Compose download failed"
chmod +x /usr/local/bin/docker-compose || handle_error "Docker Compose permissions failed"
ln -sf /usr/local/bin/docker-compose /usr/bin/docker-compose || true

# Verify Docker Compose is working
if ! docker-compose --version > /dev/null 2>&1; then
    handle_error "Docker Compose is not working properly"
fi

log "Docker Compose installed"

# Step 5: Install Git
log "Step 5/10: Installing Git..."
retry_command yum install -y git || handle_error "Git installation failed"
log "Git installed"

# Step 6: Install Python 3
log "Step 6/10: Installing Python 3..."
retry_command yum install -y python3 python3-pip || handle_error "Python 3 installation failed"
log "Python 3 installed"

# Step 7: Install Node.js 22
log "Step 7/10: Installing Node.js 22..."
retry_command curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - || handle_error "Node.js repository setup failed"
retry_command yum install -y nodejs || handle_error "Node.js installation failed"
log "Node.js 22 installed"

# Step 8: Install pnpm
log "Step 8/10: Installing pnpm..."
retry_command npm install -g pnpm || handle_error "pnpm installation failed"
log "pnpm installed"

# Step 9: Setup Application Directory and Clone Repository
log "Step 9/10: Setting up application directory..."
mkdir -p /opt/upscpro || handle_error "Failed to create /opt/upscpro"
cd /opt/upscpro || handle_error "Failed to change to /opt/upscpro"

log "Creating environment file..."
cat > /opt/upscpro/.env << 'ENVEOF'
# Database Configuration
DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
REDIS_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}

# Application Configuration
ENVIRONMENT=${environment}
PROJECT_NAME=${project_name}

# Strapi Configuration
STRAPI_URL=http://${strapi_ip}:1337
CMS_BASE_URL=http://${strapi_ip}:1337

# Helios Configuration
HELIOS_SERVER_URL=http://helios:8080

# GitHub Configuration
GITHUB_TOKEN=${GITHUB_TOKEN}
GITHUB_REPOSITORY_URL=${GITHUB_REPOSITORY_URL}
GITHUB_BRANCH=${GITHUB_BRANCH}
WEBHOOK_SECRET=${webhook_secret}
ENABLE_AUTO_DEPLOY=${enable_auto_deploy}
ENVEOF

log "Cloning repository..."
if [ ! -z "${GITHUB_TOKEN}" ] && [ ! -z "${GITHUB_REPOSITORY_URL}" ]; then
    # Validate GitHub token format
    if [[ "${GITHUB_TOKEN}" =~ ^(ghp_|github_pat_) ]]; then
        # Extract repo URL without https://
        REPO_URL_CLEAN=$(echo "${GITHUB_REPOSITORY_URL}" | sed 's|https://||' | sed 's|http://||')
        
        # Clone with authentication
        if retry_command git clone "https://${GITHUB_TOKEN}@$${REPO_URL_CLEAN}" upscapp-be; then
            cd upscapp-be
            
            # Checkout specified branch with retry
            if [ ! -z "${GITHUB_BRANCH}" ]; then
                retry_command git checkout "${GITHUB_BRANCH}" || log "WARNING: Failed to checkout branch ${GITHUB_BRANCH}, using default"
            fi
            
            log "Repository cloned successfully"
        else
            handle_error "Git clone failed - check GitHub token and repository URL"
        fi
    else
        log "WARNING: GitHub token format invalid. Expected format: ghp_* or github_pat_*"
        log "Attempting clone without authentication..."
        if git clone "${GITHUB_REPOSITORY_URL}" upscapp-be 2>/dev/null; then
            cd upscapp-be
            log "Repository cloned without authentication"
        else
            handle_error "Repository clone failed"
        fi
    fi
else
    log "WARNING: GitHub token or repository URL not provided. Manual setup required."
    handle_error "Cannot proceed without repository"
fi

# Step 10: Build and Deploy
log "Step 10/10: Building Docker images and deploying services..."

# Ensure we're in the right directory
cd /opt/upscpro/upscapp-be || handle_error "Repository directory not found"

# Copy environment file
cp /opt/upscpro/.env .env || log "WARNING: Failed to copy .env file"

# Make scripts executable
chmod +x deploy.sh 2>/dev/null || log "WARNING: deploy.sh not found"
chmod +x docker-build.sh 2>/dev/null || log "WARNING: docker-build.sh not found"

# Fix ownership
chown -R ec2-user:ec2-user /opt/upscpro

# Verify docker-compose.yml exists
if [ ! -f "docker-compose.yml" ] && [ ! -f "docker-compose.prod.yml" ]; then
    handle_error "docker-compose file not found in repository"
fi

# Build Docker images
log "Building Docker images (this may take 10-20 minutes)..."
if [ -f "docker-build.sh" ]; then
    # Run as ec2-user to avoid permission issues
    sudo -u ec2-user bash -c "cd /opt/upscpro/upscapp-be && ./docker-build.sh" || handle_error "Docker build failed"
elif [ -f "Dockerfile.base" ]; then
    # Fallback: build base image manually
    log "Building base image..."
    docker build -f Dockerfile.base -t study-planner:base . || log "WARNING: Base image build failed"
    
    # Build with docker-compose
    log "Building services with docker-compose..."
    sudo -u ec2-user bash -c "cd /opt/upscpro/upscapp-be && docker-compose build" || handle_error "Docker compose build failed"
else
    log "WARNING: No docker-build.sh or Dockerfile.base found, attempting direct docker-compose build..."
    sudo -u ec2-user bash -c "cd /opt/upscpro/upscapp-be && docker-compose build" || handle_error "Docker compose build failed"
fi

# Start services
log "Starting Docker Compose services..."
COMPOSE_FILE="docker-compose.yml"
if [ -f "docker-compose.prod.yml" ]; then
    COMPOSE_FILE="docker-compose.prod.yml"
fi

sudo -u ec2-user bash -c "cd /opt/upscpro/upscapp-be && docker-compose -f $COMPOSE_FILE up -d" || handle_error "Failed to start services"

# Wait for services to start
log "Waiting for services to initialize..."
sleep 30

# Verify services are running
log "Verifying service status..."
sudo -u ec2-user bash -c "cd /opt/upscpro/upscapp-be && docker-compose -f $COMPOSE_FILE ps"

# Create welcome message
cat > /home/ec2-user/welcome.txt << 'WELCOMEEOF'
Welcome to UPSC Pro Stage2 Docker Server!

Instance: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)
Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)

Services:
- App: http://localhost:8000
- Helios: http://localhost:8080
- Frontend: http://localhost:3000
- Onboarding: http://localhost:3001
- Faculty: http://localhost:3002
- Flower: http://localhost:5555

Commands:
- Deploy: /opt/upscpro/upscapp-be/deploy.sh
- Status: cd /opt/upscpro/upscapp-be && docker-compose ps
- Logs: cd /opt/upscpro/upscapp-be && docker-compose logs -f
- Restart: cd /opt/upscpro/upscapp-be && docker-compose restart

Database: ${rds_endpoint}:${rds_port}
Strapi: http://${strapi_ip}:1337
Environment: ${environment}

Setup completed at: $(date)
WELCOMEEOF

chown ec2-user:ec2-user /home/ec2-user/welcome.txt || true

log "====================================================================="
log "Docker server setup completed successfully at $(date)!"
log "====================================================================="
log "Services are starting. Check status with: docker-compose ps"
log "View logs: docker-compose logs -f"
log "CloudWatch logs: /aws/ec2/${project_name}-docker"
log "====================================================================="

# Create systemd service for auto-recovery
cat > /etc/systemd/system/upscpro-monitor.service << 'SERVICEEOF'
[Unit]
Description=UPSC Pro Service Monitor
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
User=ec2-user
WorkingDirectory=/opt/upscpro/upscapp-be
ExecStart=/bin/bash -c 'docker-compose ps | grep -q "Up" || docker-compose up -d'

[Install]
WantedBy=multi-user.target
SERVICEEOF

# Create timer for periodic checks
cat > /etc/systemd/system/upscpro-monitor.timer << 'TIMEREOF'
[Unit]
Description=UPSC Pro Service Monitor Timer
Requires=upscpro-monitor.service

[Timer]
OnBootSec=5min
OnUnitActiveSec=10min

[Install]
WantedBy=timers.target
TIMEREOF

# Enable monitoring
systemctl daemon-reload
systemctl enable upscpro-monitor.timer
systemctl start upscpro-monitor.timer

log "Auto-recovery monitor enabled"
log "Setup complete!"
