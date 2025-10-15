# Deployment Guide

This guide covers deploying the infrastructure with RDS separation and GitHub integration capabilities.

## Overview

The Terraform configuration now supports:

1. **Separate RDS Deployment** - Deploy RDS independently from other infrastructure
2. **GitHub Integration** - Automatic code checkout and builds on EC2 instances
3. **Webhook-based Auto-deployment** - Trigger builds when code changes
4. **Manual Build Triggers** - Scripts to manually trigger builds on remote instances

## Prerequisites

1. **AWS CLI configured** with appropriate permissions
2. **Terraform >= 1.0** installed
3. **GitHub Personal Access Token** (for private repositories)
4. **SSH Key Pair** created in AWS (for EC2 access)

## Configuration

### 1. Copy and Configure Variables

```bash
cp terraform.tfvars.example terraform.tfvars
```

Edit `terraform.tfvars` with your values:

```hcl
# Basic Configuration
aws_region   = "us-west-2"
project_name = "myapp"

# Database Configuration (REQUIRED)
rds_password = "your-secure-database-password"

# GitHub Integration (REQUIRED for auto-deployment)
github_token          = "ghp_your_github_token_here"
github_repository_url = "https://github.com/username/repository.git"
github_branch         = "main"

# Optional: Auto-deployment
enable_auto_deploy = true
webhook_secret     = "your-webhook-secret"

# Optional: Deploy RDS separately
deploy_rds_separately = true
```

### 2. GitHub Token Setup

Create a GitHub Personal Access Token with these permissions:
- `repo` (Full control of private repositories)
- `read:org` (Read org and team membership)

## Deployment Options

### Option 1: Deploy Everything Together

```bash
terraform init
terraform plan
terraform apply
```

### Option 2: Deploy RDS Separately First

This approach allows you to deploy and manage RDS independently:

```bash
# Step 1: Deploy RDS module only
terraform init
terraform plan -target=module.rds
terraform apply -target=module.rds

# Step 2: Deploy remaining infrastructure
terraform plan
terraform apply
```

### Option 3: Use External RDS

If you have an existing RDS instance:

```hcl
# In terraform.tfvars
deploy_rds_separately = false
enable_rds = false

external_rds_endpoint = "your-rds-endpoint.amazonaws.com"
external_rds_port     = 5432
external_rds_username = "your-username"
external_rds_password = "your-password"
external_rds_database = "your-database"
```

## GitHub Integration Features

### Automatic Code Checkout

When EC2 instances are provisioned, they will:
1. Clone the specified GitHub repository
2. Checkout the specified branch
3. Run `docker-build.sh` if it exists
4. Fall back to `docker-compose build && docker-compose up -d`

### Webhook Auto-deployment

If `enable_auto_deploy = true`:
1. A webhook server runs on port 9000
2. Configure GitHub webhook to point to: `http://[instance-ip]:9000/webhook`
3. Pushes to the specified branch trigger automatic redeployment

### Manual Build Triggers

Use the provided script to manually trigger builds:

```bash
# Using Terraform outputs (recommended)
./trigger-build.sh

# Using manual IP and key
./trigger-build.sh 1.2.3.4 ~/.ssh/my-key.pem
```

## Post-Deployment Setup

### 1. Configure GitHub Webhook (Optional)

If auto-deployment is enabled:

1. Go to your GitHub repository settings
2. Navigate to "Webhooks"
3. Add webhook with:
   - **Payload URL**: `http://[docker-instance-ip]:9000/webhook`
   - **Content type**: `application/json`
   - **Secret**: Your webhook secret from terraform.tfvars
   - **Events**: Just the push event

### 2. Access Your Applications

After deployment, access your services:

```bash
# Get service URLs
terraform output app_url          # Python API
terraform output frontend_url     # Frontend
terraform output helios_url       # Helios service
terraform output strapi_url       # Strapi CMS
terraform output flower_url       # Celery monitoring
terraform output webhook_url      # Webhook endpoint
```

### 3. Monitor Deployments

```bash
# SSH to instance
ssh -i your-key.pem ec2-user@[instance-ip]

# Monitor webhook server logs
sudo journalctl -u webhook-server -f

# Monitor Docker containers
sudo docker-compose logs -f

# Check container status
sudo docker-compose ps
```

## Build Process

### Automatic Build Flow

1. **Code Push** → GitHub repository
2. **Webhook Trigger** → EC2 webhook server (port 9000)
3. **Git Pull** → Latest code fetched
4. **Container Stop** → Existing containers stopped
5. **Build & Deploy** → `docker-build.sh` or `docker-compose build`
6. **Container Start** → New containers started

### Manual Build Trigger

```bash
# From your local machine
./trigger-build.sh

# Or via SSH
ssh -i your-key.pem ec2-user@[instance-ip]
cd /opt/app
sudo ./deploy.sh
```

## Troubleshooting

### Common Issues

1. **GitHub Clone Fails**
   - Check GitHub token permissions
   - Verify repository URL format
   - Ensure token has access to the repository

2. **Webhook Not Triggering**
   - Check security group allows port 9000
   - Verify webhook URL in GitHub settings
   - Check webhook server logs: `sudo journalctl -u webhook-server`

3. **Build Failures**
   - Check Docker logs: `sudo docker-compose logs`
   - Verify `docker-build.sh` script permissions
   - Check available disk space: `df -h`

4. **RDS Connection Issues**
   - Verify security group rules
   - Check database credentials
   - Test connection: `psql -h [endpoint] -U [username] -d [database]`

### Useful Commands

```bash
# Check instance status
terraform output docker_instance_public_ip

# SSH to instance
ssh -i your-key.pem ec2-user@$(terraform output -raw docker_instance_public_ip)

# Restart webhook server
sudo systemctl restart webhook-server

# Manual deployment
cd /opt/app && sudo ./deploy.sh

# View all logs
sudo journalctl -f

# Check Docker status
sudo docker-compose ps
sudo docker system df
```

## Security Considerations

1. **GitHub Token**: Store securely, use minimal required permissions
2. **Webhook Secret**: Use a strong, random secret
3. **RDS Password**: Use a strong password, consider AWS Secrets Manager
4. **Security Groups**: Restrict access to necessary ports only
5. **SSH Keys**: Use strong key pairs, rotate regularly

## Scaling and Production

### For Production Use

1. **Enable HTTPS**: Configure SSL certificates and HTTPS listeners
2. **Use Secrets Manager**: Store sensitive values in AWS Secrets Manager
3. **Enable Monitoring**: Set up CloudWatch alarms and monitoring
4. **Backup Strategy**: Configure RDS automated backups
5. **High Availability**: Deploy across multiple AZs
6. **Load Balancing**: Use the ALB for production traffic

### Cost Optimization

1. **RDS Scheduling**: Consider stopping RDS during non-business hours
2. **Instance Sizing**: Right-size EC2 instances based on usage
3. **Storage Optimization**: Use gp3 storage for better cost/performance
4. **Reserved Instances**: Consider Reserved Instances for predictable workloads

## Support

For issues or questions:
1. Check the troubleshooting section above
2. Review Terraform logs: `terraform plan` and `terraform apply` output
3. Check AWS CloudWatch logs for detailed error information
4. Verify all prerequisites are met