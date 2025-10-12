#!/bin/bash

# User data script for DigitalOcean droplets
# This script sets up Docker and runs the application containers

set -e

# Update system
apt-get update
apt-get upgrade -y

# Install Docker if not already installed
if ! command -v docker &> /dev/null; then
    curl -fsSL https://get.docker.com -o get-docker.sh
    sh get-docker.sh
    usermod -aG docker root
fi

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Create application directory
mkdir -p /opt/${project_name}
cd /opt/${project_name}

# Login to DigitalOcean Container Registry
doctl auth init --access-token $DIGITALOCEAN_ACCESS_TOKEN
doctl registry login

# Create docker-compose.yml
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  app:
    image: ${app_image}
    restart: always
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=${database_url}
      - REDIS_URL=${redis_url}
      - HELIOS_SERVER_URL=http://helios:8080
      - ENVIRONMENT=production
    depends_on:
      - helios
    command: sh -c "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"

  helios:
    image: ${helios_image}
    restart: always
    ports:
      - "8080:8080"
    environment:
      - PORT=8080
      - ENVIRONMENT=production

  celery:
    image: ${app_image}
    restart: always
    environment:
      - DATABASE_URL=${database_url}
      - REDIS_URL=${redis_url}
      - ENVIRONMENT=production
    depends_on:
      - app
    command: celery -A src.tasks.celery_tasks worker -l INFO -E --concurrency=2

  nginx:
    image: nginx:alpine
    restart: always
    ports:
      - "80:80"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf:ro
    depends_on:
      - app
      - helios

networks:
  default:
    name: ${project_name}-network
EOF

# Create nginx configuration
cat > nginx.conf << 'EOF'
events {
    worker_connections 1024;
}

http {
    upstream app {
        server app:8000;
    }
    
    upstream helios {
        server helios:8080;
    }

    server {
        listen 80;
        
        location /healthcheck {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /api/ {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /helios/ {
            proxy_pass http://helios/;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location /health {
            proxy_pass http://helios;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
        
        location / {
            proxy_pass http://app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
EOF

# Pull and start services
docker-compose pull
docker-compose up -d

# Setup log rotation
cat > /etc/logrotate.d/docker-${project_name} << 'EOF'
/var/lib/docker/containers/*/*-json.log {
    rotate 7
    daily
    compress
    missingok
    delaycompress
    copytruncate
}
EOF

# Create systemd service for auto-start
cat > /etc/systemd/system/${project_name}.service << EOF
[Unit]
Description=${project_name} Docker Compose Service
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/${project_name}
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable ${project_name}.service
systemctl start ${project_name}.service

echo "Deployment complete!"