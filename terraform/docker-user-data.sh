#!/bin/bash
yum update -y

# Install Docker
yum install -y docker
systemctl start docker
systemctl enable docker
usermod -a -G docker ec2-user

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/latest/download/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose

# Install Git and other utilities
yum install -y git curl jq

# Install Node.js (for webhook server)
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Create application directory
mkdir -p /opt/app
cd /opt/app

# Clone the repository if GitHub details are provided
if [ -n "${github_repository_url}" ] && [ -n "${github_token}" ]; then
    echo "Cloning repository from ${github_repository_url}..."
    
    # Configure git with token for HTTPS authentication
    git config --global credential.helper store
    echo "https://${github_token}:@github.com" > ~/.git-credentials
    
    # Clone the repository
    git clone -b ${github_branch} ${github_repository_url} .
    
    # Set up git configuration
    git config --global user.email "ec2-user@aws.com"
    git config --global user.name "EC2 Auto Deploy"
    
    echo "Repository cloned successfully"
else
    echo "GitHub repository URL or token not provided, skipping clone"
    # Create placeholder structure for manual setup
    mkdir -p /opt/app
fi

# Create docker-compose.yml for the application
cat > docker-compose.yml << 'EOF'
services:
  # PostgreSQL Database (using RDS)
  app_db:
    container_name: app_db
    hostname: app_db
    image: library/postgres:14.1
    environment:
      - POSTGRES_USER=${rds_username}
      - POSTGRES_PASSWORD=${rds_password}
      - POSTGRES_DB=${rds_database}
    volumes:
      - app_pg_data:/var/lib/postgresql/data
    ports:
      - "5432:5432"
    networks:
      - upscpro-be
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${rds_username}"]
      interval: 10s
      timeout: 5s
      retries: 5

  # TypeScript Helios Server
  helios:
    container_name: helios
    build:
      context: .
      dockerfile: study-planner/Dockerfile
    restart: always
    ports:
      - "8080:8080"
    networks:
      - upscpro-be
    healthcheck:
      test: ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 60s

  # Python FastAPI Backend
  app:
    container_name: app
    env_file:
      - docker.env
    build:
      context: .
      dockerfile: Dockerfile
    restart: always
    volumes:
      - ./:/code
      - ./resources:/code/resources
    ports:
      - "8000:8000"
    networks:
      - upscpro-be
    depends_on:
      app_db:
        condition: service_healthy
      helios:
        condition: service_healthy
    environment:
      - HELIOS_SERVER_URL=http://helios:8080
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - ENVIRONMENT=PRODUCTION
      - CORS_ORIGINS=["https://your-domain.com"]
      - CMS_BASE_URL=http://${strapi_ip}:1337
    command: sh -c "alembic upgrade head && uvicorn src.main:app --host 0.0.0.0 --port 8000"

  # Unified Frontend Web Server (nginx serving both onboarding and faculty UIs)
  frontend:
    container_name: frontend
    build:
      context: .
      dockerfile: Dockerfile.frontend
    ports:
      - "3000:80"
    depends_on:
      - app
    networks:
      - upscpro-be

  # Redis using PostgreSQL (replacing Redis with RDS)
  app_redis:
    container_name: app_redis
    image: postgres:14.1
    hostname: redis
    environment:
      - POSTGRES_USER=${rds_username}
      - POSTGRES_PASSWORD=${rds_password}
      - POSTGRES_DB=${rds_database}
    restart: always
    ports:
      - 6379:5432
    networks:
      - upscpro-be

  celery_worker:
    container_name: celery_worker
    env_file:
      - docker.env
    build:
      context: .
    restart: always
    command: celery -A src.tasks.celery_tasks worker -l INFO -E
    volumes:
      - ./:/code
      - ./resources:/code/resources
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
      - REDIS_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
    networks:
      - upscpro-be
    depends_on:
      - app
      - app_redis

  celery_flower:
    container_name: celery_flower
    env_file:
      - docker.env
    build:
      context: .
    command: celery -A src.tasks.celery_tasks flower
    ports:
      - 5555:5555
    volumes:
      - ./:/code
      - ./resources:/code/resources
    environment:
      - ENVIRONMENT=production
      - DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
    networks:
      - upscpro-be
    depends_on:
      - app
      - app_redis
      - celery_worker

volumes:
  app_pg_data:
    driver: "local"

networks:
  upscpro-be:
    driver: bridge
EOF

# Create environment file
cat > docker.env << EOF
RDS_ENDPOINT=${rds_endpoint}
RDS_PORT=${rds_port}
RDS_USERNAME=${rds_username}
RDS_PASSWORD=${rds_password}
RDS_DATABASE=${rds_database}
STRAPI_IP=${strapi_ip}
ENVIRONMENT=production
DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
CMS_BASE_URL=http://${strapi_ip}:1337
EOF

# Create a systemd service for the application
cat > /etc/systemd/system/docker-app.service << 'EOF'
[Unit]
Description=Docker Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/app
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable docker-app.service

# Create a script to run docker-build.sh
cat > /opt/app/start-app.sh << 'EOF'
#!/bin/bash
cd /opt/app

# Wait for Docker to be ready
while ! docker info > /dev/null 2>&1; do
    echo "Waiting for Docker to be ready..."
    sleep 5
done

echo "Starting application build and deployment..."

# Run the docker build script if it exists
if [ -f "./docker-build.sh" ]; then
    echo "Found docker-build.sh, running custom build script..."
    chmod +x ./docker-build.sh
    ./docker-build.sh
else
    echo "docker-build.sh not found, starting with docker-compose..."
    docker-compose up -d
fi

echo "Application started successfully"
EOF

chmod +x /opt/app/start-app.sh

# Create deployment script for updates
cat > /opt/app/deploy.sh << 'EOF'
#!/bin/bash
cd /opt/app

echo "Starting deployment..."

# Pull latest changes if git repository is available
if [ -d ".git" ]; then
    echo "Pulling latest changes from repository..."
    git fetch origin
    git reset --hard origin/${github_branch}
    echo "Repository updated to latest ${github_branch}"
fi

# Stop existing containers
echo "Stopping existing containers..."
docker-compose down

# Run build script if available
if [ -f "./docker-build.sh" ]; then
    echo "Running docker-build.sh..."
    chmod +x ./docker-build.sh
    ./docker-build.sh
else
    echo "Running docker-compose build and up..."
    docker-compose build --no-cache
    docker-compose up -d
fi

echo "Deployment completed successfully"
EOF

chmod +x /opt/app/deploy.sh

# Create webhook server for GitHub integration (if enabled)
if [ "${enable_auto_deploy}" = "true" ] && [ -n "${webhook_secret}" ]; then
    echo "Setting up GitHub webhook server..."
    
    # Create webhook server
    cat > /opt/app/webhook-server.js << 'EOF'
const http = require('http');
const crypto = require('crypto');
const { exec } = require('child_process');

const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET;
const PORT = process.env.PORT || 9000;

function verifySignature(payload, signature) {
    if (!WEBHOOK_SECRET) return true; // Skip verification if no secret
    
    const expectedSignature = 'sha256=' + crypto
        .createHmac('sha256', WEBHOOK_SECRET)
        .update(payload)
        .digest('hex');
    
    return crypto.timingSafeEqual(
        Buffer.from(signature),
        Buffer.from(expectedSignature)
    );
}

const server = http.createServer((req, res) => {
    if (req.method === 'POST' && req.url === '/webhook') {
        let body = '';
        
        req.on('data', chunk => {
            body += chunk.toString();
        });
        
        req.on('end', () => {
            try {
                const signature = req.headers['x-hub-signature-256'];
                
                if (!verifySignature(body, signature)) {
                    console.log('Invalid signature');
                    res.statusCode = 401;
                    res.end('Unauthorized');
                    return;
                }
                
                const payload = JSON.parse(body);
                
                // Check if this is a push event to the correct branch
                if (payload.ref === 'refs/heads/${github_branch}') {
                    console.log('Received push event for ${github_branch} branch, triggering deployment...');
                    
                    // Execute deployment script
                    exec('/opt/app/deploy.sh', (error, stdout, stderr) => {
                        if (error) {
                            console.error('Deployment error:', error);
                        } else {
                            console.log('Deployment output:', stdout);
                        }
                        if (stderr) {
                            console.error('Deployment stderr:', stderr);
                        }
                    });
                    
                    res.statusCode = 200;
                    res.end('Deployment triggered');
                } else {
                    console.log('Ignoring push to branch:', payload.ref);
                    res.statusCode = 200;
                    res.end('Ignored');
                }
            } catch (error) {
                console.error('Webhook error:', error);
                res.statusCode = 400;
                res.end('Bad Request');
            }
        });
    } else if (req.method === 'GET' && req.url === '/health') {
        res.statusCode = 200;
        res.end('OK');
    } else {
        res.statusCode = 404;
        res.end('Not Found');
    }
});

server.listen(PORT, () => {
    console.log(`Webhook server listening on port 9000`);
});
EOF
    
    # Create systemd service for webhook server
    cat > /etc/systemd/system/webhook-server.service << EOF
[Unit]
Description=GitHub Webhook Server
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/app
ExecStart=/usr/bin/node /opt/app/webhook-server.js
Environment=WEBHOOK_SECRET=${webhook_secret}
Environment=PORT=9000
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF
    
    systemctl enable webhook-server.service
    systemctl start webhook-server.service
    
    echo "Webhook server setup completed"
fi

# Run initial deployment
echo "Running initial deployment..."
/opt/app/start-app.sh

# Log the completion
echo "Docker setup completed" >> /var/log/user-data.log
