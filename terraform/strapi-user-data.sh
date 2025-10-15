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

# Install Node.js and npm
curl -fsSL https://rpm.nodesource.com/setup_18.x | bash -
yum install -y nodejs

# Install pnpm
npm install -g pnpm

# Create Strapi application directory
mkdir -p /opt/strapi
cd /opt/strapi

# Create Strapi application
npx create-strapi-app@latest . --quickstart --no-run

# Create environment configuration
cat > .env << EOF
HOST=0.0.0.0
PORT=1337
APP_KEYS=toBeModified1,toBeModified2,toBeModified3,toBeModified4
API_TOKEN_SALT=toBeModified
ADMIN_JWT_SECRET=toBeModified
TRANSFER_TOKEN_SALT=toBeModified
JWT_SECRET=toBeModified
DATABASE_CLIENT=postgres
DATABASE_HOST=localhost
DATABASE_PORT=5432
DATABASE_NAME=strapi
DATABASE_USERNAME=strapi
DATABASE_PASSWORD=strapi_password
DATABASE_SSL=false
EOF

# Create docker-compose.yml for Strapi with PostgreSQL
cat > docker-compose.yml << 'EOF'
version: '3.8'

services:
  strapi:
    container_name: strapi
    restart: unless-stopped
    image: strapi/strapi:latest
    environment:
      DATABASE_CLIENT: postgres
      DATABASE_HOST: strapi-db
      DATABASE_PORT: 5432
      DATABASE_NAME: strapi
      DATABASE_USERNAME: strapi
      DATABASE_PASSWORD: strapi_password
      JWT_SECRET: aSecretKey
      ADMIN_JWT_SECRET: anotherSecretKey
      APP_KEYS: toBeModified1,toBeModified2,toBeModified3,toBeModified4
      NODE_ENV: production
    volumes:
      - ./config:/opt/app/config
      - ./src:/opt/app/src
      - ./package.json:/opt/package.json
      - ./yarn.lock:/opt/yarn.lock
      - ./.env:/opt/app/.env
      - ./public/uploads:/opt/app/public/uploads
    ports:
      - '1337:1337'
    networks:
      - strapi
    depends_on:
      - strapi-db

  strapi-db:
    container_name: strapi-db
    restart: unless-stopped
    image: postgres:14.1
    environment:
      POSTGRES_USER: strapi
      POSTGRES_PASSWORD: strapi_password
      POSTGRES_DB: strapi
    volumes:
      - strapi-data:/var/lib/postgresql/data/ #using a volume
    ports:
      - '5432:5432'
    networks:
      - strapi

volumes:
  strapi-data:

networks:
  strapi:
    name: Strapi
    driver: bridge
EOF

# Start Strapi
docker-compose up -d

# Create a systemd service for Strapi
cat > /etc/systemd/system/strapi.service << 'EOF'
[Unit]
Description=Strapi Application
After=docker.service
Requires=docker.service

[Service]
Type=oneshot
RemainAfterExit=yes
WorkingDirectory=/opt/strapi
ExecStart=/usr/local/bin/docker-compose up -d
ExecStop=/usr/local/bin/docker-compose down
TimeoutStartSec=0

[Install]
WantedBy=multi-user.target
EOF

systemctl enable strapi.service

# Log the completion
echo "Strapi setup completed" >> /var/log/user-data.log
