#!/bin/bash
set -e

# Enhanced error handling and logging
exec > >(tee -a /var/log/user-data.log) 2>&1
echo "=== Starting simple fixed user data script at $(date) ==="

# Function to log with timestamp
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1"
}

# Function to handle errors gracefully
handle_error() {
    log "ERROR: $1"
    echo "ERROR: $1" > /var/log/user-data-error.log
    # Don't exit, continue with other operations
}

log "Starting system update..."
yum update -y || handle_error "System update failed"

log "Installing CloudWatch agent..."
yum install -y amazon-cloudwatch-agent || handle_error "CloudWatch agent installation failed"

log "Installing Docker..."
yum install -y docker || handle_error "Docker installation failed"
systemctl start docker || handle_error "Docker service start failed"
systemctl enable docker || handle_error "Docker service enable failed"
usermod -a -G docker ec2-user || handle_error "Adding ec2-user to docker group failed"
log "Docker installed and started."

log "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || handle_error "Docker Compose download failed"
chmod +x /usr/local/bin/docker-compose || handle_error "Docker Compose permissions failed"
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose || handle_error "Docker Compose symlink failed"
log "Docker Compose installed."

log "Installing Git..."
yum install -y git || handle_error "Git installation failed"
log "Git installed."

log "Installing Python 3..."
yum install -y python3 python3-pip || handle_error "Python 3 installation failed"
log "Python 3 installed."

log "Installing Node.js 22..."
curl -fsSL https://rpm.nodesource.com/setup_22.x | bash - || handle_error "Node.js repository setup failed"
yum install -y nodejs || handle_error "Node.js installation failed"
log "Node.js 22 installed."

log "Installing pnpm globally..."
npm install -g pnpm || handle_error "pnpm installation failed"
log "pnpm installed."

log "Creating application directory /opt/upscpro..."
mkdir -p /opt/upscpro || handle_error "Failed to create /opt/upscpro"
cd /opt/upscpro || handle_error "Failed to change directory to /opt/upscpro"
log "Application directory created."

log "Creating .env file..."
cat > /opt/upscpro/.env << EOF
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
GITHUB_TOKEN=${github_token}
GITHUB_REPOSITORY_URL=${github_repository_url}
GITHUB_BRANCH=${github_branch}
WEBHOOK_SECRET=${webhook_secret}
ENABLE_AUTO_DEPLOY=${enable_auto_deploy}
EOF
log ".env file created."

log "Cloning repository from git..."
if [ ! -z "${github_token}" ] && [ ! -z "${github_repository_url}" ]; then
    REPO_NAME=$(basename "${github_repository_url}" .git)
    git clone "https://${github_token}@$(echo "${github_repository_url}" | sed 's/https:\/\///')" . || handle_error "Git clone failed"
    if [ ! -z "${github_branch}" ]; then
        git checkout ${github_branch} || handle_error "Git checkout failed for branch ${github_branch}"
    fi
    log "Repository cloned successfully."
    
    # Make deploy script executable if it exists
    if [ -f "/opt/upscpro/deploy.sh" ]; then
        chmod +x /opt/upscpro/deploy.sh || handle_error "Failed to make deploy.sh executable"
        log "Deploy script made executable."
    else
        log "WARNING: deploy.sh not found in repository."
    fi
else
    log "WARNING: GitHub token or repository URL not provided. Manual setup required."
fi

log "Docker Compose file will be available from cloned repository."

log "Deployment script will be available from cloned repository."

log "Creating welcome message..."
cat > /home/ec2-user/welcome.txt << EOF
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
- Deploy: /opt/upscpro/deploy.sh
- Status: docker-compose -f docker-compose.prod.yml ps
- Logs: docker-compose -f docker-compose.prod.yml logs -f
- Restart: docker-compose -f docker-compose.prod.yml restart

Database: ${rds_endpoint}:${rds_port}
Strapi: http://${strapi_ip}:1337
Environment: ${environment}
EOF
chown ec2-user:ec2-user /home/ec2-user/welcome.txt || handle_error "Failed to set permissions on welcome.txt"
log "Welcome message created."

log "Simple fixed Docker server setup completed!"
log "Check /home/ec2-user/welcome.txt and /var/log/user-data.log for more information."
