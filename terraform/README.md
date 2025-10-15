# UPSC App Infrastructure Setup

This Terraform configuration sets up a complete AWS infrastructure for the UPSC application using EC2 instances with minimal configuration required.

## 🚀 Quick Start (Environment Variables Only)

You can deploy the entire infrastructure using only AWS environment variables. No manual AWS configuration needed!

### Prerequisites

1. **AWS Account** with appropriate permissions
2. **Terraform** installed (>= 1.0)
3. **Docker** (for running containers on EC2)
4. **AWS CLI** (optional - for managing key pairs)

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
- **RDS PostgreSQL** database (db.t3.micro) - optional if external RDS provided
- **Two EC2 instances**:
  - Strapi EC2 instance (t3.medium) - runs Strapi CMS
  - Docker EC2 instance (t3.large) - runs all application containers
- **ECR repositories** for Docker images
- **CloudWatch** logging and monitoring
- **Security groups** with proper access controls

## 🔐 Security

- Database runs in private subnets (if using Terraform-managed RDS)
- EC2 instances run in public subnets with security groups
- Security groups restrict access to necessary ports only
- EBS volumes are encrypted
- All passwords are configurable via terraform.tfvars

## 💰 Cost Estimation

**Monthly costs (approximate):**
- RDS db.t3.micro: ~$15-20 (if using Terraform-managed RDS)
- EC2 t3.medium (Strapi): ~$30-35
- EC2 t3.large (Docker): ~$60-70
- NAT Gateway: ~$45 (if enabled)
- **Total: ~$105-125/month** (with Terraform RDS)
- **Total: ~$90-105/month** (with external RDS)

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

- **Strapi CMS**: `http://<strapi-instance-ip>:1337`
- **API**: `http://<docker-instance-ip>:8000`
- **Helios**: `http://<docker-instance-ip>:8080`
- **Frontend**: `http://<docker-instance-ip>:3000`
- **API Docs**: `http://<docker-instance-ip>:8000/docs`

Get the instance IPs:
```bash
terraform output strapi_instance_public_ip
terraform output docker_instance_public_ip
terraform output app_url
terraform output helios_url
terraform output frontend_url
terraform output strapi_url
```

## 📊 Monitoring

- **CloudWatch Logs**: Instance logs and Docker container logs
- **EC2 Console**: Monitor instance status and metrics
- **Docker**: Use `docker ps` and `docker logs` on instances

## 🔄 Common Operations

### Scale Services
To scale, you can:
1. Use larger EC2 instance types in `terraform.tfvars`
2. Add more EC2 instances manually
3. Use Docker Compose scaling on the Docker instance

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

# EC2 Configuration
enable_ec2_instances = true
strapi_key_name = "your-strapi-key"  # Create in AWS console
docker_key_name = "your-docker-key"  # Create in AWS console

# REQUIRED: Change these passwords!
rds_password = "YourSecurePassword123!"  # If using Terraform RDS

# External RDS (optional - if you have existing RDS)
external_rds_endpoint = ""  # Leave empty to create new RDS
external_rds_username = ""
external_rds_password = ""
external_rds_database = ""
```

### Optional Variables
```hcl
# EC2 Instance Types
strapi_instance_type = "t3.medium"
docker_instance_type = "t3.large"

# Storage
strapi_volume_size = 20  # GB
docker_volume_size = 30  # GB

# Database
rds_instance_class = "db.t3.micro"
rds_allocated_storage = 20

# Enable/Disable Services
enable_rds = true
enable_ec2_instances = true

# Strapi Domain
strapi_domain = ""  # Optional custom domain

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

3. **EC2 Instance Not Starting**
   - Check EC2 console for instance status
   - Review user data logs: `/var/log/user-data.log`
   - Verify security group rules

4. **Docker Containers Not Running**
   - SSH to Docker instance and check: `docker ps`
   - Check container logs: `docker logs <container-name>`
   - Verify Docker daemon is running: `systemctl status docker`

5. **Database Connection Issues**
   - Verify RDS endpoint is correct
   - Check security group allows EC2 → RDS (port 5432)
   - Confirm database credentials in terraform.tfvars

### Getting Help

- Check AWS EC2 Console for instance status
- SSH to instances to debug issues
- Review CloudWatch logs for application errors
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
