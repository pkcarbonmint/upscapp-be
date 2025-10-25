#!/bin/bash
set -e

# Simple test script
exec > >(tee /var/log/user-data.log) 2>&1
echo "=== Simple user data script started at $(date) ==="

# Update system
echo "Updating system..."
yum update -y

# Install basic packages
echo "Installing basic packages..."
yum install -y curl wget git

# Create a test file
echo "Creating test file..."
echo "User data script executed successfully at $(date)" > /home/ec2-user/test.txt
chown ec2-user:ec2-user /home/ec2-user/test.txt

# Install CloudWatch agent
echo "Installing CloudWatch agent..."
yum install -y amazon-cloudwatch-agent

# Create simple CloudWatch config
mkdir -p /opt/aws/amazon-cloudwatch-agent/etc
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
          }
        ]
      }
    }
  }
}
EOF

# Start CloudWatch agent
echo "Starting CloudWatch agent..."
/opt/aws/amazon-cloudwatch-agent/bin/amazon-cloudwatch-agent-ctl \
  -a fetch-config \
  -m ec2 \
  -c file:/opt/aws/amazon-cloudwatch-agent/etc/amazon-cloudwatch-agent.json \
  -s

echo "=== Simple user data script completed at $(date) ==="
