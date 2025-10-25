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

log "Creating docker-compose.prod.yml file..."
cat > /opt/upscpro/docker-compose.prod.yml << EOF
version: '3.8'

services:
  app:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - REDIS_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - STRAPI_URL=http://${strapi_ip}:1337
      - HELIOS_SERVER_URL=http://helios:8080
      - ENVIRONMENT=${environment}
    depends_on:
      - helios
    restart: unless-stopped
    command: ["python", "src/main.py"]

  helios:
    build:
      context: ./helios
      dockerfile: Dockerfile
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - ENVIRONMENT=${environment}
    restart: unless-stopped
    command: ["python", "main.py"]

  frontend:
    build:
      context: ./frontend
      dockerfile: Dockerfile
    ports:
      - "3000:80"
    environment:
      - REACT_APP_API_URL=http://${alb_dns_name}
      - REACT_APP_HELIOS_URL=http://${alb_dns_name}/helios
    restart: unless-stopped

  onboarding-ui:
    build:
      context: ./onboarding-ui
      dockerfile: Dockerfile
    ports:
      - "3001:80"
    environment:
      - REACT_APP_API_URL=http://${alb_dns_name}
      - REACT_APP_HELIOS_URL=http://${alb_dns_name}/helios
    restart: unless-stopped

  faculty-ui:
    build:
      context: ./faculty-ui
      dockerfile: Dockerfile
    ports:
      - "3002:80"
    environment:
      - REACT_APP_API_URL=http://${alb_dns_name}
      - REACT_APP_HELIOS_URL=http://${alb_dns_name}/helios
    restart: unless-stopped

  celery:
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - REDIS_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - ENVIRONMENT=${environment}
    restart: unless-stopped
    command: ["celery", "-A", "src.tasks.celery_tasks", "worker", "-l", "INFO", "-E", "--concurrency=2"]

  flower:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "5555:5555"
    environment:
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - REDIS_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - ENVIRONMENT=${environment}
    restart: unless-stopped
    command: ["celery", "-A", "src.tasks.celery_tasks", "flower", "--port=5555"]

  webhook:
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - "9000:9000"
    environment:
      - GITHUB_TOKEN=${github_token}
      - GITHUB_REPOSITORY_URL=${github_repository_url}
      - GITHUB_BRANCH=${github_branch}
      - WEBHOOK_SECRET=${webhook_secret}
      - ENABLE_AUTO_DEPLOY=${enable_auto_deploy}
    restart: unless-stopped
    command: ["python", "scripts/webhook_server.py"]
EOF
log "docker-compose.prod.yml created."

log "Creating deployment script /opt/upscpro/deploy.sh..."
cat > /opt/upscpro/deploy.sh << 'EOF'
#!/bin/bash
# Docker Compose Deployment script

# Log to both file and CloudWatch
exec > >(tee -a /opt/upscpro/deploy.log) 2>&1
echo "Starting Docker Compose deployment at $(date)..."

# Pull latest changes
if [ ! -z "${GITHUB_TOKEN}" ] && [ ! -z "${GITHUB_REPOSITORY_URL}" ]; then
    cd /opt/upscpro
    echo "Pulling latest changes from git..."
    git pull origin $${GITHUB_BRANCH:-main} || { echo "ERROR: Git pull failed"; exit 1; }
fi

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
EOF
chmod +x /opt/upscpro/deploy.sh || handle_error "Failed to set permissions on deploy.sh"
log "Deployment script created."

log "Creating welcome message..."
cat > /home/ec2-user/welcome.txt << EOF
Welcome to UPSC Pro Stage2 Docker Server!

Server Information:
- Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)
- Private IP: $(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
- Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
- Region: $(curl -s http://169.254.169.254/latest/meta-data/placement/region)

Services:
- App API: http://localhost:8000
- Helios Server: http://localhost:8080
- Frontend: http://localhost:3000
- Onboarding UI: http://localhost:3001
- Faculty UI: http://localhost:3002
- Celery Flower: http://localhost:5555
- GitHub Webhook: http://localhost:9000 (if enabled)

Health Checks:
- App: /opt/upscpro/health-check-app.sh
- Helios: /opt/upscpro/health-check-helios.sh

Logs:
- All services: docker-compose -f docker-compose.prod.yml logs -f
- Specific service: docker-compose -f docker-compose.prod.yml logs -f [service]
- User Data Log: /var/log/user-data.log
- Deployment Log: /opt/upscpro/deploy.log
- System: /var/log/messages

Useful Commands:
- Check all services: docker-compose -f docker-compose.prod.yml ps
- Restart all services: docker-compose -f docker-compose.prod.yml restart
- View logs: docker-compose -f docker-compose.prod.yml logs -f
- Monitor system: /opt/upscpro/monitor.sh
- Deploy: /opt/upscpro/deploy.sh
- Stop services: docker-compose -f docker-compose.prod.yml down
- Start services: docker-compose -f docker-compose.prod.yml up -d

Environment Variables:
- Database: ${rds_endpoint}:${rds_port}:${rds_database}
- Strapi: http://${strapi_ip}:1337
- Environment: ${environment}
EOF
chown ec2-user:ec2-user /home/ec2-user/welcome.txt || handle_error "Failed to set permissions on welcome.txt"
log "Welcome message created."

log "Simple fixed Docker server setup completed!"
log "Check /home/ec2-user/welcome.txt and /var/log/user-data.log for more information."
