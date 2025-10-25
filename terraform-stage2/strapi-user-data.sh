#!/bin/bash

# Update system
yum update -y

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
yum install -y htop curl wget unzip

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

# Create systemd service for Strapi
cat > /etc/systemd/system/strapi.service << EOF
[Unit]
Description=Strapi CMS
After=network.target

[Service]
Type=simple
User=ec2-user
WorkingDirectory=/opt/upscpro
Environment=NODE_ENV=production
Environment=HOST=0.0.0.0
Environment=PORT=1337
ExecStart=/usr/bin/npm run start
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# Install Strapi dependencies and start
if [ -d "/opt/upscpro/cms" ]; then
    cd /opt/upscpro/cms
    npm install
    npm run build
    
    # Start Strapi service
    systemctl daemon-reload
    systemctl enable strapi
    systemctl start strapi
fi

# Create log directory
mkdir -p /var/log/upscpro
chown ec2-user:ec2-user /var/log/upscpro

# Set up log rotation
cat > /etc/logrotate.d/upscpro << EOF
/var/log/upscpro/*.log {
    daily
    missingok
    rotate 7
    compress
    notifempty
    create 644 ec2-user ec2-user
}
EOF

# Create a simple health check script
cat > /opt/upscpro/health-check.sh << 'EOF'
#!/bin/bash
# Health check script for Strapi

if curl -f http://localhost:1337/admin > /dev/null 2>&1; then
    echo "Strapi is healthy"
    exit 0
else
    echo "Strapi is not responding"
    exit 1
fi
EOF

chmod +x /opt/upscpro/health-check.sh

# Create monitoring script
cat > /opt/upscpro/monitor.sh << 'EOF'
#!/bin/bash
# Simple monitoring script

echo "=== System Status ==="
echo "Date: $(date)"
echo "Uptime: $(uptime)"
echo "Memory Usage:"
free -h
echo "Disk Usage:"
df -h
echo "Docker Status:"
systemctl status docker --no-pager
echo "Strapi Status:"
systemctl status strapi --no-pager
EOF

chmod +x /opt/upscpro/monitor.sh

# Set up cron job for monitoring
echo "*/5 * * * * /opt/upscpro/monitor.sh >> /var/log/upscpro/monitor.log 2>&1" | crontab -u ec2-user -

# Create welcome message
cat > /home/ec2-user/welcome.txt << EOF
Welcome to UPSC Pro Stage2 Strapi Server!

Server Information:
- Instance ID: $(curl -s http://169.254.169.254/latest/meta-data/instance-id)
- Private IP: $(curl -s http://169.254.169.254/latest/meta-data/local-ipv4)
- Public IP: $(curl -s http://169.254.169.254/latest/meta-data/public-ipv4)
- Region: $(curl -s http://169.254.169.254/latest/meta-data/placement/region)

Services:
- Strapi CMS: http://localhost:1337
- Health Check: /opt/upscpro/health-check.sh
- Monitoring: /opt/upscpro/monitor.sh

Logs:
- Strapi: journalctl -u strapi -f
- System: /var/log/messages
- Application: /var/log/upscpro/

Useful Commands:
- Check Strapi status: systemctl status strapi
- Restart Strapi: sudo systemctl restart strapi
- View logs: journalctl -u strapi -f
- Monitor system: /opt/upscpro/monitor.sh
EOF

# Set proper permissions
chown ec2-user:ec2-user /home/ec2-user/welcome.txt

echo "Strapi server setup completed!"
echo "Check /home/ec2-user/welcome.txt for more information"
