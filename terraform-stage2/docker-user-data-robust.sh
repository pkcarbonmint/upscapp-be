#!/bin/bash
set -e

# Enhanced error handling and logging
exec > >(tee -a /var/log/user-data.log) 2>&1
echo "=== Starting robust user data script at $(date) ==="

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

# Wait for cloud-init to complete
log "Waiting for cloud-init to complete..."
while [ ! -f /var/lib/cloud/instance/boot-finished ]; do
    sleep 5
done
log "Cloud-init completed"

# Update system with retry logic
log "Updating system packages..."
for i in {1..3}; do
    if yum update -y; then
        log "System update successful"
        break
    else
        log "System update attempt $i failed, retrying..."
        sleep 10
    fi
done

# Install CloudWatch agent with retry logic
log "Installing CloudWatch agent..."
for i in {1..3}; do
    if yum install -y amazon-cloudwatch-agent; then
        log "CloudWatch agent installed successfully"
        break
    else
        log "CloudWatch agent installation attempt $i failed, retrying..."
        sleep 10
    fi
done

# Create CloudWatch agent configuration directory if it doesn't exist
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc

# Configure CloudWatch agent
log "Configuring CloudWatch agent..."
cat > /opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json << EOF
{
  "logs": {
    "logs_collected": {
      "files": {
        "collect_list": [
          {
            "file_path": "/var/log/user-data.log",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/user-data.log",
            "timezone": "UTC"
          },
          {
            "file_path": "/var/log/messages",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/messages",
            "timezone": "UTC"
          },
          {
            "file_path": "/opt/upscpro/deploy.log",
            "log_group_name": "/aws/ec2/${project_name}-docker",
            "log_stream_name": "{instance_id}/deploy.log",
            "timezone": "UTC"
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
log "Starting CloudWatch agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s || handle_error "Failed to start CloudWatch agent"

# Install Docker with retry logic
log "Installing Docker..."
for i in {1..3}; do
    if yum install -y docker; then
        log "Docker installed successfully"
        break
    else
        log "Docker installation attempt $i failed, retrying..."
        sleep 10
    fi
done

# Start and enable Docker
log "Starting Docker service..."
systemctl start docker || handle_error "Failed to start Docker"
systemctl enable docker || handle_error "Failed to enable Docker"
usermod -a -G docker ec2-user || handle_error "Failed to add ec2-user to docker group"

# Install Docker Compose
log "Installing Docker Compose..."
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose || handle_error "Failed to download Docker Compose"
chmod +x /usr/local/bin/docker-compose || handle_error "Failed to make Docker Compose executable"
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose || handle_error "Failed to create Docker Compose symlink"

# Install Git
log "Installing Git..."
yum install -y git || handle_error "Failed to install Git"

# Create application directory
log "Creating application directory..."
mkdir -p /opt/upscpro
cd /opt/upscpro

# Clone the repository (if GitHub token is provided)
if [ ! -z "${github_token}" ] && [ ! -z "${github_repository_url}" ]; then
    log "Cloning repository from GitHub..."
    REPO_NAME=$(basename "${github_repository_url}" .git)
    git clone "https://${github_token}@$(echo "${github_repository_url}" | sed 's/https:\/\///')" . || handle_error "Failed to clone repository"
    if [ ! -z "${github_branch}" ]; then
        log "Checking out branch: ${github_branch}"
        git checkout ${github_branch} || handle_error "Failed to checkout branch ${github_branch}"
    fi
    log "Repository cloned successfully"
else
    log "GitHub token or repository URL not provided. Manual setup required."
fi

# Create environment file
log "Creating environment file..."
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

# Create Docker Compose file for production deployment
log "Creating Docker Compose configuration..."
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

# Create deployment script
log "Creating deployment script..."
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
    git pull origin $${GITHUB_BRANCH:-main}
fi

# Build and restart services with docker-compose
echo "Stopping existing containers..."
docker-compose -f docker-compose.prod.yml down

echo "Building Docker images..."
docker-compose -f docker-compose.prod.yml build --no-cache

echo "Starting services..."
docker-compose -f docker-compose.prod.yml up -d

echo "Docker Compose deployment completed at $(date)!"
echo "Services status:"
docker-compose -f docker-compose.prod.yml ps
EOF

chmod +x /opt/upscpro/deploy.sh

# Initial deployment
log "Starting initial deployment..."
cd /opt/upscpro
if [ -f "docker-compose.prod.yml" ]; then
    log "Building Docker images..."
    docker-compose -f docker-compose.prod.yml build || handle_error "Failed to build Docker images"
    
    log "Starting Docker Compose services..."
    docker-compose -f docker-compose.prod.yml up -d || handle_error "Failed to start Docker Compose services"
    
    log "Docker Compose services started successfully!"
    docker-compose -f docker-compose.prod.yml ps
else
    log "Warning: docker-compose.prod.yml not found. Manual setup required."
fi

# Create welcome message
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
- System: /var/log/messages
- Application: /var/log/upscpro/

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

# Set proper permissions
chown ec2-user:ec2-user /home/ec2-user/welcome.txt

log "=== Docker server setup completed successfully! ==="
log "Check /home/ec2-user/welcome.txt for more information"
log "User data script finished at $(date)"
