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

# Install Git
yum install -y git

# Create application directory
mkdir -p /opt/app
cd /opt/app

# Clone the repository (you'll need to provide the actual repository URL)
# git clone <your-repository-url> .

# For now, we'll create a placeholder structure
mkdir -p /opt/app
cd /opt/app

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

# Run the docker build script if it exists
if [ -f "./docker-build.sh" ]; then
    chmod +x ./docker-build.sh
    ./docker-build.sh
else
    echo "docker-build.sh not found, starting with docker-compose"
    docker-compose up -d
fi
EOF

chmod +x /opt/app/start-app.sh

# Log the completion
echo "Docker setup completed" >> /var/log/user-data.log
