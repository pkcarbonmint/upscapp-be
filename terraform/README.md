# UPSC Pro Stage2 Environment

This Terraform configuration sets up a complete stage2 environment for UPSC Pro, replicating the existing stage infrastructure with additional components.

## Architecture Overview

The stage2 environment includes:

### Core Infrastructure
- **VPC**: Custom VPC with public/private subnets (CIDR: 10.2.0.0/16)
- **RDS PostgreSQL**: Database instance for application data
- **Application Load Balancer**: Routes traffic to ECS services
- **ECS Cluster**: Runs containerized applications on Fargate
- **ECR Repositories**: Stores Docker images for all services

### Applications
- **Main App**: Python FastAPI application (port 8000)
- **Helios Server**: New microservice (port 8080)
- **Frontend**: React application (port 80)
- **Onboarding UI**: New React application for onboarding flow
- **Faculty UI**: New React application for faculty management
- **Celery Worker**: Background task processing
- **Celery Flower**: Task monitoring interface

### EC2 Instances (Optional)
- **Strapi CMS**: Content management system (port 1337)
- **Docker Server**: Local development and testing environment

### Storage & CDN
- **S3 Buckets**: Static assets and images storage
- **CloudFront**: CDN for global content delivery

## Prerequisites

1. **AWS CLI** configured with appropriate permissions
2. **Terraform** >= 1.0 installed
3. **Docker** (for building images locally)
4. **Git** access to the repository

## Quick Start

### 1. Configure Variables

Edit `terraform.tfvars` to set your specific values:

```hcl
# Required: Set your RDS password
rds_password = "your-secure-password"

# Optional: Configure domain
domain_name = "stage2.upscpro.laex.in"
route53_zone_id = "Z1234567890"

# Optional: GitHub integration
github_token = "your-github-token"
github_repository_url = "https://github.com/your-org/upscpro"
```

### 2. Initialize and Deploy

```bash
# Initialize Terraform
terraform init

# Plan the deployment
terraform plan

# Apply the configuration
terraform apply
```

### 3. Build and Push Docker Images

After infrastructure is created, build and push your Docker images:

```bash
# Login to ECR
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin $(terraform output -raw ecr_repository_app_url | cut -d'/' -f1)

# Build and push app image
docker build -t $(terraform output -raw ecr_repository_app_url):latest .
docker push $(terraform output -raw ecr_repository_app_url):latest

# Build and push helios image
docker build -t $(terraform output -raw ecr_repository_helios_url):latest ./helios
docker push $(terraform output -raw ecr_repository_helios_url):latest

# Build and push frontend image
docker build -t $(terraform output -raw ecr_repository_frontend_url):latest ./frontend
docker push $(terraform output -raw ecr_repository_frontend_url):latest

# Build and push onboarding UI image
docker build -t $(terraform output -raw ecr_repository_onboarding_ui_url):latest ./onboarding-ui
docker push $(terraform output -raw ecr_repository_onboarding_ui_url):latest

# Build and push faculty UI image
docker build -t $(terraform output -raw ecr_repository_faculty_ui_url):latest ./faculty-ui
docker push $(terraform output -raw ecr_repository_faculty_ui_url):latest
```

## Configuration Details

### Environment Variables

The applications are configured with these environment variables:

```bash
# Database
DATABASE_URL=postgresql://upscproStage2User:password@rds-endpoint:5432/upscproStage2DB

# Application
ENVIRONMENT=stage2
CORS_ORIGINS=["https://stage2.upscpro.laex.in"]

# Services
HELIOS_SERVER_URL=http://localhost:8080
CMS_BASE_URL=http://strapi-private-ip:1337
```

### Service URLs

After deployment, your services will be available at:

- **Frontend**: `https://stage2.upscpro.laex.in` (or ALB URL)
- **Onboarding UI**: `https://stage2.upscpro.laex.in/onboarding`
- **Faculty UI**: `https://stage2.upscpro.laex.in/faculty`
- **API**: Internal only (accessed through ALB)
- **Helios**: Internal only (accessed through ALB)

### EC2 Instances (if enabled)

- **Strapi CMS**: `http://strapi-private-ip:1337` (private network only)
- **Docker Services**: Various ports for local development

## Monitoring and Logs

### CloudWatch Logs
All ECS services log to CloudWatch:
- `/ecs/upscpro-stage2`

### Health Checks
- **ECS Services**: Automatic health checks via ALB
- **EC2 Instances**: Custom health check scripts

### Monitoring Scripts
- **System Monitor**: `/opt/upscpro/monitor.sh` (runs every 5 minutes)
- **Health Checks**: Individual scripts for each service

## Security

### Network Security
- **Public Subnets**: Only ALB and NAT Gateway
- **Private Subnets**: All application services
- **Security Groups**: Restrictive rules for each service type

### Access Control
- **EC2 Instances**: SSH access only (if key pairs configured)
- **RDS**: Access only from application security groups
- **ALB**: HTTPS only (if certificate configured)

## Scaling

### Auto Scaling (Optional)
Enable auto scaling in `terraform.tfvars`:

```hcl
enable_auto_scaling = true
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 10
auto_scaling_target_cpu = 70
```

### Manual Scaling
Update ECS service desired count:

```bash
aws ecs update-service --cluster upscpro-stage2-cluster --service upscpro-stage2-app --desired-count 3
```

## Troubleshooting

### Common Issues

1. **ECS Tasks Not Starting**
   - Check CloudWatch logs: `/ecs/upscpro-stage2`
   - Verify Docker images are pushed to ECR
   - Check security group rules

2. **Database Connection Issues**
   - Verify RDS security group allows connections
   - Check database credentials in environment variables

3. **ALB Health Check Failures**
   - Ensure applications respond to health check endpoints
   - Check target group health in AWS Console

### Useful Commands

```bash
# Check ECS service status
aws ecs describe-services --cluster upscpro-stage2-cluster --services upscpro-stage2-app

# View CloudWatch logs
aws logs tail /ecs/upscpro-stage2 --follow

# Check ALB target health
aws elbv2 describe-target-health --target-group-arn $(terraform output -raw target_group_frontend_arn)
```

## Cleanup

To destroy the entire infrastructure:

```bash
terraform destroy
```

**Warning**: This will permanently delete all resources including databases. Make sure to backup any important data first.

## Differences from Stage Environment

### New Components
- **Helios Server**: New microservice for enhanced functionality
- **Onboarding UI**: Dedicated UI for user onboarding
- **Faculty UI**: Dedicated UI for faculty management
- **Separate VPC**: Uses different CIDR (10.2.0.0/16) to avoid conflicts

### Enhanced Features
- **Better Monitoring**: Comprehensive health checks and monitoring scripts
- **Improved Security**: More restrictive security groups
- **Scalability**: ECS-based architecture for better scaling
- **CI/CD Ready**: GitHub webhook integration for automated deployments

## Support

For issues or questions:
1. Check CloudWatch logs first
2. Review Terraform state: `terraform show`
3. Check AWS Console for resource status
4. Review this documentation for common solutions
