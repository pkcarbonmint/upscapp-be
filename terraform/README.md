# UPSC App Infrastructure Setup

This Terraform configuration sets up a complete AWS infrastructure for the UPSC application with minimal configuration required.

## 🚀 Quick Start (Environment Variables Only)

You can deploy the entire infrastructure using only AWS environment variables. No manual AWS configuration needed!

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** installed (>= 1.0)
3. **Docker** (for building images - required if using automatic Docker build)
4. **AWS CLI** (optional - only needed for manual Docker image pushing)

### One-Command Setup

```bash
# Set your AWS credentials as environment variables
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=us-west-2  # Optional, defaults to us-west-2

# Run the automated setup script
cd terraform
./setup.sh
```

That's it! The script will:
- ✅ Verify your AWS credentials
- ✅ Create minimal configuration files
- ✅ Initialize and deploy Terraform
- ✅ Show you all the important URLs and endpoints

## 🔧 Manual Setup (Alternative)

If you prefer manual control:

```bash
# 1. Set AWS credentials (Terraform will use these directly)
export AWS_ACCESS_KEY_ID=your-access-key-id
export AWS_SECRET_ACCESS_KEY=your-secret-access-key
export AWS_DEFAULT_REGION=ap-south-1

# 2. Copy and edit configuration
cp terraform.tfvars.minimal terraform.tfvars
nano terraform.tfvars  # Change the default passwords

# 3. Deploy
terraform init
terraform plan
terraform apply
```

## 📋 What Gets Created

The infrastructure includes:

- **VPC** with public/private subnets across 2 AZs
- **RDS PostgreSQL** database (db.t3.micro)
- **ElastiCache Redis** cluster (cache.t3.micro)
- **ECS Fargate** cluster with 4 services:
  - Main application (backend API)
  - Helios service
  - Frontend (web UI)
  - Celery worker (background tasks)
- **Application Load Balancer** with intelligent routing
- **ECR repositories** for Docker images
- **CloudWatch** logging and monitoring
- **Security groups** with proper access controls

## 🔐 Security

- All services run in private subnets
- Database and Redis are not publicly accessible
- Load balancer handles all external traffic
- Security groups restrict access between services
- All passwords are configurable via terraform.tfvars

## 💰 Cost Estimation

**Monthly costs (approximate):**
- RDS db.t3.micro: ~$15-20
- ElastiCache cache.t3.micro: ~$15-20
- ECS Fargate (4 services): ~$20-50
- Load Balancer: ~$20-25
- NAT Gateway: ~$45
- **Total: ~$115-160/month**

*Costs vary by region and usage. Use AWS Calculator for precise estimates.*

## 🐳 Deploying Your Application

### Option 1: Automatic Docker Build (Recommended)

Enable automatic Docker image building in `terraform.tfvars`:

```hcl
# Enable automatic Docker build and push
enable_docker_build = true
docker_build_context = "../"  # Path to your project root
```

Then run `terraform apply` - it will automatically:
- Build all Docker images
- Push them to ECR
- Deploy the infrastructure with the new images

### Option 2: Manual Docker Build

1. **Get ECR repository URLs:**
```bash
terraform output ecr_repository_app_url
terraform output ecr_repository_helios_url
terraform output ecr_repository_frontend_url
```

2. **Login to ECR:**
```bash
aws ecr get-login-password --region ap-south-1 | docker login --username AWS --password-stdin <account-id>.dkr.ecr.ap-south-1.amazonaws.com
```

3. **Build and push images:**
```bash
# Build and push your app
docker build -t <ecr-app-url>:latest .
docker push <ecr-app-url>:latest

# Build and push Helios
docker build -t <ecr-helios-url>:latest ./helios
docker push <ecr-helios-url>:latest

# Build and push Frontend
docker build -t <ecr-frontend-url>:latest ./frontend
docker push <ecr-frontend-url>:latest
```

4. **Update ECS services** (Terraform will automatically use latest images)

## 🌐 Access Your Application

- **Frontend**: `http://<alb-dns-name>/`
- **API**: `http://<alb-dns-name>/api/`
- **Helios**: `http://<alb-dns-name>/helios/`
- **API Docs**: `http://<alb-dns-name>/docs`

Get the ALB URL:
```bash
terraform output alb_url
```

## 📊 Monitoring

- **CloudWatch Logs**: `/ecs/upscpro`
- **ECS Console**: Monitor running services
- **Load Balancer**: Health checks and traffic metrics

## 🔄 Common Operations

### Scale Services
Edit `terraform.tfvars`:
```hcl
ecs_app_count = 3  # Scale to 3 app instances
```
Then run: `terraform apply`

### Update Images
```bash
# Build and push new version
docker build -t <repo>:v2.0 .
docker push <repo>:v2.0

# Update terraform.tfvars
app_image_tag = "v2.0"

# Apply changes
terraform apply
```

### Destroy Infrastructure
```bash
terraform destroy
```

## ⚙️ Configuration Options

### Essential Variables (in terraform.tfvars)
```hcl
# Basic Configuration
aws_region   = "us-west-2"
environment  = "production"
project_name = "upscpro"

# REQUIRED: Change these passwords!
rds_password = "YourSecurePassword123!"
redis_password = "YourRedisPassword123!"
flower_password = "YourFlowerPassword123!"
```

### Optional Variables
```hcl
# Resource Sizing
ecs_app_cpu     = 512   # CPU units (1 vCPU = 1024)
ecs_app_memory  = 1024  # Memory in MiB
ecs_app_count   = 1     # Number of containers

# Database
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20

# Enable/Disable Services
enable_rds   = true
enable_redis = true

# Custom Environment Variables
app_environment_variables = {
  ENVIRONMENT = "production"
  CORS_ORIGINS = "[\"https://your-domain.com\"]"
  # Add your custom variables here
}
```

## 🆘 Troubleshooting

### Common Issues

1. **AWS Credentials Error**
   ```bash
   # Verify credentials
   aws sts get-caller-identity
   ```

2. **Terraform State Lock**
   ```bash
   # If state is locked, force unlock (be careful!)
   terraform force-unlock <lock-id>
   ```

3. **ECS Service Not Starting**
   - Check CloudWatch logs: `/ecs/upscpro`
   - Verify Docker images are pushed to ECR
   - Check security group rules

4. **Database Connection Issues**
   - Verify RDS is in private subnets
   - Check security group allows ECS → RDS (port 5432)
   - Confirm database credentials in terraform.tfvars

### Getting Help

- Check AWS ECS Console for service status
- Review CloudWatch logs for application errors
- Verify all ECR repositories have images pushed
- Ensure security groups allow necessary traffic

## 📁 File Structure

```
terraform/
├── main.tf                    # Main infrastructure configuration
├── variables.tf               # Variable definitions
├── outputs.tf                 # Output values
├── terraform.tfvars.minimal   # Minimal configuration template
├── setup.sh                   # Automated setup script
├── README.md                  # This file
└── .gitignore                 # Git ignore rules
```

## 🔒 Security Best Practices

1. **Change all default passwords** in terraform.tfvars
2. **Use strong, unique passwords** for RDS, Redis, and Flower
3. **Enable HTTPS** by configuring SSL certificates
4. **Regularly update** Docker images and dependencies
5. **Monitor** CloudWatch logs for security events
6. **Use IAM roles** with minimal required permissions

---

**Need help?** Check the troubleshooting section or review the AWS ECS and Terraform documentation.
