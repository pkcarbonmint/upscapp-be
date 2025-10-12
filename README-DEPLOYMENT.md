# AWS Docker Compose Deployment with Terraform

This repository contains Terraform scripts and deployment tools to deploy your docker-compose application to AWS using ECS Fargate, RDS PostgreSQL, and ElastiCache Redis.

## Architecture Overview

The deployment creates the following AWS infrastructure:
- **VPC** with public and private subnets across multiple AZs
- **Application Load Balancer (ALB)** for load balancing and routing
- **ECS Fargate Cluster** to run containerized services
- **RDS PostgreSQL** for the application database
- **ElastiCache Redis** for caching and Celery task queue
- **ECR repositories** for storing Docker images
- **CloudWatch** for logging and monitoring
- **Security Groups** for network access control

### Services Deployed:
1. **Main Application** (FastAPI backend) - Port 8000
2. **Helios Engine** (TypeScript/Haskell service) - Port 8080  
3. **Frontend** (React/Static files) - Port 80
4. **Celery Worker** (Background tasks)

## Prerequisites

Before you begin, ensure you have the following installed and configured:

### Required Tools
- [AWS CLI](https://aws.amazon.com/cli/) (v2.x or higher)
- [Terraform](https://www.terraform.io/downloads.html) (v1.0 or higher)
- [Docker](https://docs.docker.com/get-docker/) (for building images)
- bash (for running deployment scripts)

### AWS Setup
1. **Configure AWS CLI**:
   ```bash
   aws configure
   ```
   You'll need:
   - AWS Access Key ID
   - AWS Secret Access Key
   - Default region (e.g., us-west-2)
   - Default output format (json recommended)

2. **Verify AWS Configuration**:
   ```bash
   aws sts get-caller-identity
   ```

### Required AWS Permissions
Your AWS user/role needs the following permissions:
- EC2, VPC, ECS, RDS, ElastiCache, ECR
- IAM role creation and management
- CloudWatch, Application Load Balancer
- Route53 (if using custom domain)

## Quick Start

### 1. Clone and Configure

```bash
# Navigate to your project directory
cd /path/to/your/project

# Copy the example variables file
cp terraform/terraform.tfvars.example terraform/terraform.tfvars
```

### 2. Configure Variables

Edit `terraform/terraform.tfvars` with your specific values:

```hcl
# Basic Configuration
aws_region   = "us-west-2"
environment  = "production"
project_name = "your-project-name"

# REQUIRED: Database password
rds_password = "your-secure-database-password-here"

# REQUIRED: Redis password
redis_password = "your-secure-redis-password-here"

# REQUIRED: Flower monitoring credentials
flower_user     = "admin"
flower_password = "your-secure-flower-password-here"

# Optional: Custom domain (requires Route53 hosted zone)
# domain_name     = "your-domain.com"
# route53_zone_id = "Z1D633PJN98FT9"
# certificate_arn = "arn:aws:acm:region:account:certificate/cert-id"
# enable_https    = true
```

### 3. Deploy Infrastructure

```bash
# Deploy the infrastructure
./scripts/deploy.sh

# This will:
# 1. Initialize Terraform
# 2. Validate configuration
# 3. Show deployment plan
# 4. Ask for confirmation
# 5. Deploy infrastructure (15-20 minutes)
```

### 4. Build and Push Images

```bash
# Build Docker images and push to ECR
./scripts/build.sh

# This will:
# 1. Build all Docker images
# 2. Tag them for ECR
# 3. Push to your ECR repositories
```

### 5. Deploy Services

```bash
# Update ECS services with new images
./scripts/manage.sh update

# Check deployment status
./scripts/manage.sh status
```

## Script Usage

### Deployment Script (`scripts/deploy.sh`)

```bash
# Full deployment (recommended for first time)
./scripts/deploy.sh

# Individual commands
./scripts/deploy.sh init      # Initialize Terraform
./scripts/deploy.sh plan      # Create deployment plan
./scripts/deploy.sh apply     # Apply changes
./scripts/deploy.sh validate  # Validate configuration
./scripts/deploy.sh output    # Show outputs
./scripts/deploy.sh destroy   # Destroy infrastructure
./scripts/deploy.sh help      # Show help
```

### Build Script (`scripts/build.sh`)

```bash
# Build and push all images
./scripts/build.sh

# With custom image tag
IMAGE_TAG=v1.2.3 ./scripts/build.sh

# With custom region
AWS_REGION=eu-west-1 ./scripts/build.sh
```

### Management Script (`scripts/manage.sh`)

```bash
# Check status of all services
./scripts/manage.sh status

# Update all services
./scripts/manage.sh update

# Update specific service
./scripts/manage.sh update app
./scripts/manage.sh update frontend
./scripts/manage.sh update celery

# View logs
./scripts/manage.sh logs app
./scripts/manage.sh logs frontend
./scripts/manage.sh logs celery

# Check application health
./scripts/manage.sh health
```

## Configuration Options

### Infrastructure Scaling

Modify `terraform/terraform.tfvars` to adjust resources:

```hcl
# ECS Task Resources
ecs_app_cpu     = 512    # 0.5 vCPU
ecs_app_memory  = 1024   # 1 GB RAM
ecs_app_count   = 2      # Number of tasks

# Database Resources
rds_instance_class = "db.t3.small"
rds_allocated_storage = 20

# Redis Resources
redis_node_type = "cache.t3.micro"
```

### Auto Scaling

Enable auto scaling for ECS services:

```hcl
enable_auto_scaling = true
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 10
auto_scaling_target_cpu = 70
auto_scaling_target_memory = 80
```

### SSL/HTTPS Configuration

To enable HTTPS:

1. **Request SSL Certificate** (via AWS Certificate Manager)
2. **Configure Route53** (if using custom domain)
3. **Update terraform.tfvars**:

```hcl
enable_https    = true
certificate_arn = "arn:aws:acm:us-west-2:123456789012:certificate/12345678-1234-1234-1234-123456789012"
domain_name     = "your-domain.com"
route53_zone_id = "Z1D633PJN98FT9"
```

## Monitoring and Logs

### CloudWatch Logs
All services log to CloudWatch under `/ecs/your-project-name`. Access via:
- AWS Console → CloudWatch → Log groups
- Or use the management script: `./scripts/manage.sh logs app`

### Application Monitoring
- **Application**: `http://your-alb-url/api/healthcheck`
- **Helios**: `http://your-alb-url/helios/health`
- **Frontend**: `http://your-alb-url/`
- **Celery Flower**: `http://your-alb-url:5555` (if enabled)

### Service Health Checks
```bash
# Check all service health
./scripts/manage.sh status

# Check application endpoints
./scripts/manage.sh health
```

## Database Management

### Connecting to RDS
The database connection URL is automatically configured in your application environment. To connect manually:

```bash
# Get database endpoint
cd terraform
terraform output rds_endpoint

# Connect with psql
psql -h <rds-endpoint> -U app -d app
```

### Database Migrations
Migrations run automatically when the app starts via the `alembic upgrade head` command in the container startup.

## Troubleshooting

### Common Issues

1. **"No space left on device"** during Docker build
   ```bash
   docker system prune -a
   ```

2. **ECS tasks failing to start**
   ```bash
   ./scripts/manage.sh logs app
   # Check CloudWatch logs for detailed error messages
   ```

3. **Database connection issues**
   - Verify security groups allow connections
   - Check database credentials in terraform.tfvars
   - Ensure RDS instance is running

4. **Images not updating**
   ```bash
   # Force rebuild and push
   ./scripts/build.sh
   # Force ECS service update
   ./scripts/manage.sh update
   ```

### Debug Commands

```bash
# Check AWS connectivity
aws sts get-caller-identity

# Verify ECR repositories
aws ecr describe-repositories --region us-west-2

# Check ECS cluster
aws ecs describe-clusters --clusters your-project-name-cluster

# View service details
aws ecs describe-services --cluster your-project-name-cluster --services your-project-name-app
```

## Cost Optimization

### Development Environment
For development/testing, use smaller resources:

```hcl
# Minimal resources for development
rds_instance_class = "db.t3.micro"
redis_node_type = "cache.t3.micro"
ecs_app_cpu = 256
ecs_app_memory = 512
ecs_app_count = 1
```

### Production Environment
For production, consider:

```hcl
# Production resources
rds_instance_class = "db.t3.small"
redis_node_type = "cache.t3.small"
ecs_app_cpu = 512
ecs_app_memory = 1024
ecs_app_count = 2
enable_auto_scaling = true
```

## Security Best Practices

1. **Use strong passwords** in terraform.tfvars
2. **Enable encryption** (enabled by default for RDS and Redis)
3. **Use HTTPS** in production with SSL certificates
4. **Regular backups** (configured automatically for RDS)
5. **Network security** (services in private subnets by default)

## Cleanup

To destroy all AWS resources:

```bash
./scripts/deploy.sh destroy
```

**Warning**: This will permanently delete all data including databases. Make sure to backup any important data first.

## Support

### File Structure
```
├── terraform/
│   ├── main.tf                 # Main Terraform configuration
│   ├── variables.tf            # Variable definitions
│   ├── outputs.tf              # Output definitions
│   ├── terraform.tfvars.example # Example variables file
│   └── terraform.tfvars        # Your configuration (create this)
├── scripts/
│   ├── build.sh               # Build and push Docker images
│   ├── deploy.sh              # Deploy infrastructure
│   └── manage.sh              # Manage ECS services
├── docker-compose.yml         # Local development setup
└── docker-compose.prod.yml    # Production setup (for reference)
```

### Environment Variables Reference

The application receives these environment variables automatically:

- `DATABASE_URL`: PostgreSQL connection string
- `REDIS_URL`: Redis connection string  
- `HELIOS_SERVER_URL`: Internal Helios service URL
- `ENVIRONMENT`: Deployment environment
- `CORS_ORIGINS`: Allowed CORS origins

### Additional Resources

- [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)
- [Terraform AWS Provider](https://registry.terraform.io/providers/hashicorp/aws/latest/docs)
- [AWS CLI Configuration](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-quickstart.html)

---

For questions or issues, please check the troubleshooting section above or review the AWS CloudWatch logs for detailed error information.