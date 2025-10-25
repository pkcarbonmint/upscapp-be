#!/bin/bash
set -e

# Log everything
exec > >(tee /var/log/user-data.log) 2>&1
echo "Starting user data script at $(date)"

# Update system
yum update -y

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
yum install -y amazon-cloudwatch-agent

# Configure CloudWatch agent
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
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Git
yum install -y git

# Install Node.js 18
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install Python 3.9
yum install -y python3 python3-pip

# Install PostgreSQL client
yum install -y postgresql

# Install other utilities
yum install -y htop curl wget unzip jq

# Create application directory
mkdir -p /opt/upscpro
cd /opt/upscpro

# Clone the repository (if GitHub token is provided)
if [ ! -z "${github_token}" ] && [ ! -z "${github_repository_url}" ]; then
    # Extract repository name from URL
    REPO_NAME=$(basename "${github_repository_url}" .git)
    
    # Clone with authentication
    git clone https://${github_token}@github.com/$(echo "${github_repository_url}" | sed 's|https://github.com/||') .
    
    # Checkout specific branch if provided
    if [ ! -z "${github_branch}" ]; then
        git checkout ${github_branch}
    fi
else
    echo "GitHub token or repository URL not provided. Manual setup required."
fi

# Create environment file
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
EOF

# Create Docker Compose file for production
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
echo "Starting initial deployment..."
cd /opt/upscpro
if [ -f "docker-compose.prod.yml" ]; then
    docker-compose -f docker-compose.prod.yml build
    docker-compose -f docker-compose.prod.yml up -d
    echo "Docker Compose services started successfully!"
else
    echo "Warning: docker-compose.prod.yml not found. Manual setup required."
fi

# Create welcome message
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

Useful Commands:
- Check all services: docker-compose -f docker-compose.prod.yml ps
- View logs: docker-compose -f docker-compose.prod.yml logs -f
- Restart services: docker-compose -f docker-compose.prod.yml restart
- Deploy: ./deploy.sh
- Stop services: docker-compose -f docker-compose.prod.yml down
- Start services: docker-compose -f docker-compose.prod.yml up -d

Logs:
- All services: docker-compose -f docker-compose.prod.yml logs -f
- Specific service: docker-compose -f docker-compose.prod.yml logs -f [service]
- System: /var/log/messages
- Application: /var/log/upscpro/

Environment Variables:
- Database: ${rds_endpoint}:${rds_port}
- Strapi: http://${strapi_ip}:1337
- Environment: ${environment}
EOF

# Set proper permissions
chown ec2-user:ec2-user /home/ec2-user/welcome.txt

echo "Docker server setup completed!"
echo "Check /home/ec2-user/welcome.txt for more information"
