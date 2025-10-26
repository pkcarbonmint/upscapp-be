#!/bin/bash
set -e

exec > >(tee -a /var/log/user-data.log) 2>&1
echo "=== Starting minimal user data script at $(date) ==="

# Update system
apt update -y

# Install Docker
apt install -y docker.io
systemctl start docker
systemctl enable docker
usermod -a -G docker ubuntu

# Install Docker Compose
curl -L "https://github.com/docker/compose/releases/download/v2.20.2/docker-compose-$(uname -s)-$(uname -m)" -o /usr/local/bin/docker-compose
chmod +x /usr/local/bin/docker-compose
ln -s /usr/local/bin/docker-compose /usr/bin/docker-compose

# Install Git and Python
apt install -y git python3 python3-pip

# Install Node.js 22 using NodeSource repository
curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
apt install -y nodejs

# Install pnpm globally
npm install -g pnpm

# Create app directory
mkdir -p /opt/upscpro
chown ubuntu:ubuntu /opt/upscpro
cd /opt/upscpro

# Clone repository using template variables
git clone "${github_repository_url}" upscapp-be
cd upscapp-be
git checkout ${github_branch}

# Fix ownership of all files to ubuntu
chown -R ubuntu:ubuntu /opt/upscpro/upscapp-be
chmod +x deploy.sh 2>/dev/null || true

# Install required Python packages for validation scripts
pip3 install jsonschema

# Create .env file
cat > .env << 'ENVEOF'
DATABASE_URL=postgresql://${rds_username}:${rds_password}@${rds_endpoint}:${rds_port}/${rds_database}
STRAPI_URL=http://${strapi_ip}:1337
ENVIRONMENT=${environment}
GITHUB_TOKEN=${github_token}
GITHUB_REPOSITORY_URL=${github_repository_url}
GITHUB_BRANCH=${github_branch}
ENVEOF
cp .env docker.env

# Start Docker build in background with proper detachment
echo "Starting Docker build in background..."
# Create a wrapper script to filter verbose Docker output
cat > /tmp/quiet-docker-build.sh << 'EOF'
#!/bin/bash
exec > >(grep -E "(Building|Successfully|Error|Failed|✅|❌|⚠️|ℹ️)" | tee -a /var/log/docker-build.log)
exec 2>&1
cd /opt/upscpro/upscapp-be
./docker-build.sh
docker-compose up -d
EOF
chmod +x /tmp/quiet-docker-build.sh

nohup /tmp/quiet-docker-build.sh &
disown

echo "Setup completed at $(date)"
echo "Docker build started in background - check /var/log/docker-build.log for progress"
