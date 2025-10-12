# Multi-Cloud Docker Compose Deployment

Deploy your docker-compose application to **DigitalOcean** (recommended - more affordable) or **AWS** using Terraform with automated scripts.

## 💰 Cost Comparison

| Provider | Service Type | Monthly Cost | Best For |
|----------|-------------|--------------|----------|
| **🟢 DigitalOcean** | App Platform (PaaS) | **$48-78** | Small to medium apps, simpler management |
| **🟢 DigitalOcean** | Droplets (IaaS) | **$33-63** | More control, cost optimization |
| **🔵 AWS** | ECS Fargate | **$120-200** | Enterprise, high-scale, more services |

### 💡 **Recommendation**: Start with DigitalOcean for 60% cost savings, migrate to AWS later if needed.

---

## 🚀 Quick Start (Any Provider)

### 1. **Choose Your Provider**
```bash
# Interactive setup (recommended for first-time users)
./scripts/deploy-multi.sh

# Or specify provider directly
./scripts/deploy-multi.sh digitalocean  # Cheaper option
./scripts/deploy-multi.sh aws          # Enterprise option
```

### 2. **Build and Deploy**
```bash
# Build images for your chosen provider
./scripts/build-multi.sh

# Check deployment status  
./scripts/manage-multi.sh status
```

That's it! The scripts handle provider detection, setup, and deployment automatically.

---

## 🏗️ Architecture Comparison

### DigitalOcean Architecture
```
Internet → Load Balancer → App Platform (managed containers)
                        ↓
           Managed Database (PostgreSQL) + Managed Redis
```

### AWS Architecture  
```
Internet → ALB → ECS Fargate (containers in VPC)
                ↓
        RDS PostgreSQL + ElastiCache Redis
```

---

## 📋 Prerequisites

### Required Tools
- [Docker](https://docs.docker.com/get-docker/)
- [Terraform](https://www.terraform.io/downloads.html) (v1.0+)

### Provider-Specific Tools

#### For DigitalOcean (Recommended)
- [DigitalOcean CLI (doctl)](https://docs.digitalocean.com/reference/doctl/how-to/install/)
- DigitalOcean Personal Access Token

#### For AWS  
- [AWS CLI](https://aws.amazon.com/cli/) (v2.x+)
- AWS credentials configured

---

## 🛠️ Detailed Setup Instructions

### Option 1: DigitalOcean (Recommended - 60% Cheaper)

#### **Step 1: Install and Configure DigitalOcean CLI**
```bash
# Install doctl (macOS)
brew install doctl

# Install doctl (Linux)
cd ~
wget https://github.com/digitalocean/doctl/releases/download/v1.98.0/doctl-1.98.0-linux-amd64.tar.gz
tar xf doctl-1.98.0-linux-amd64.tar.gz
sudo mv doctl /usr/local/bin

# Authenticate with DigitalOcean
doctl auth init
# Enter your DigitalOcean Personal Access Token when prompted
```

#### **Step 2: Configure Deployment**
```bash
# Create configuration file
cp terraform-digitalocean/terraform.tfvars.example terraform-digitalocean/terraform.tfvars

# Edit the configuration
vim terraform-digitalocean/terraform.tfvars
```

**Required variables for DigitalOcean:**
```hcl
# REQUIRED: Your DigitalOcean token
do_token = "your-digitalocean-token-here"

# Basic configuration
do_region    = "nyc3"  # or sfo3, ams3, lon1, etc.
project_name = "your-project-name"

# Deployment strategy (choose one)
use_app_platform = true   # Recommended: Fully managed
use_droplets     = false  # Alternative: More control

# Instance sizes (affects cost)
app_instance_size = "basic-xxs"  # $5/month per instance
```

#### **Step 3: Deploy to DigitalOcean**
```bash
# Deploy infrastructure and build images
./scripts/deploy-multi.sh digitalocean
./scripts/build-multi.sh digitalocean

# Check status
./scripts/manage-multi.sh status
```

### Option 2: AWS (Enterprise/Scale)

#### **Step 1: Configure AWS CLI**
```bash
# Install AWS CLI v2
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure credentials
aws configure
# Enter: Access Key ID, Secret Access Key, Region, Output format
```

#### **Step 2: Configure Deployment**
```bash
# Create configuration file  
cp terraform/terraform.tfvars.example terraform/terraform.tfvars

# Edit the configuration
vim terraform/terraform.tfvars
```

**Required variables for AWS:**
```hcl
# REQUIRED: Secure passwords
rds_password    = "your-secure-database-password"
redis_password  = "your-secure-redis-password"
flower_password = "your-secure-flower-password"

# Basic configuration
aws_region   = "us-west-2"
project_name = "your-project-name"
```

#### **Step 3: Deploy to AWS**
```bash
# Deploy infrastructure and build images
./scripts/deploy-multi.sh aws
./scripts/build-multi.sh aws

# Check status  
./scripts/manage-multi.sh status
```

---

## 📊 Detailed Cost Breakdown

### DigitalOcean Monthly Costs

#### App Platform (PaaS) - Recommended
| Service | Spec | Cost |
|---------|------|------|
| App instances (3x basic-xxs) | 0.5 vCPU, 0.5GB each | $15 |
| Database (PostgreSQL) | 1 vCPU, 1GB | $15 |
| Redis | 1 vCPU, 1GB | $15 |
| Load Balancer | Small | $12 |
| Container Registry | Starter | Free |
| **Total** | | **~$57/month** |

#### Droplets (IaaS) - More Control
| Service | Spec | Cost |
|---------|------|------|
| Droplets (2x s-1vcpu-1gb) | 1 vCPU, 1GB each | $12 |
| Database (PostgreSQL) | 1 vCPU, 1GB | $15 |
| Redis | 1 vCPU, 1GB | $15 |
| Load Balancer | Small | $12 |
| **Total** | | **~$54/month** |

### AWS Monthly Costs

#### ECS Fargate
| Service | Spec | Cost |
|---------|------|------|
| ECS Fargate tasks (3x 0.5 vCPU) | 0.5 vCPU, 1GB each | $45 |
| RDS PostgreSQL | db.t3.micro | $15 |
| ElastiCache Redis | cache.t3.micro | $12 |
| Application Load Balancer | Standard | $18 |
| NAT Gateway | 2x gateways | $45 |
| **Total** | | **~$135/month** |

---

## 🔄 Management Commands

### Universal Commands (Work with Both Providers)
```bash
# Check status of all services
./scripts/manage-multi.sh status

# Update/redeploy services  
./scripts/manage-multi.sh update

# View application logs
./scripts/manage-multi.sh logs app

# Check application health
./scripts/manage-multi.sh health

# Build new images
./scripts/build-multi.sh
```

### Provider-Specific Usage
```bash
# Force specific provider
./scripts/manage-multi.sh digitalocean status
./scripts/manage-multi.sh aws logs app

# Build for specific provider
./scripts/build-multi.sh digitalocean
./scripts/build-multi.sh aws
```

---

## 🔧 Configuration Options

### DigitalOcean App Platform Scaling
```hcl
# In terraform-digitalocean/terraform.tfvars

# Instance counts
app_instance_count = 2      # Scale horizontally
helios_instance_count = 1
celery_instance_count = 1

# Instance sizes (vertical scaling)
app_instance_size = "basic-xs"    # $12/month (1 vCPU, 1GB)
# Options: basic-xxs ($5), basic-xs ($12), basic-s ($24)

# Auto-scaling
enable_auto_scaling = true
min_instance_count = 1
max_instance_count = 5
```

### AWS ECS Scaling
```hcl  
# In terraform/terraform.tfvars

# Task resources
ecs_app_cpu    = 512   # 0.5 vCPU
ecs_app_memory = 1024  # 1GB RAM  
ecs_app_count  = 2     # Number of tasks

# Auto-scaling
enable_auto_scaling = true
auto_scaling_min_capacity = 1
auto_scaling_max_capacity = 10
auto_scaling_target_cpu = 70
```

---

## 🌐 Domain and SSL Configuration

### DigitalOcean Custom Domain
```hcl
# In terraform-digitalocean/terraform.tfvars
custom_domain = "your-domain.com"
ssl_certificate_name = "your-ssl-cert"  # Create in DO dashboard first
```

### AWS Custom Domain  
```hcl
# In terraform/terraform.tfvars
enable_https = true
certificate_arn = "arn:aws:acm:region:account:certificate/cert-id"
domain_name = "your-domain.com"
route53_zone_id = "Z1D633PJN98FT9"
```

---

## 🔍 Monitoring and Troubleshooting

### DigitalOcean Monitoring
```bash
# App Platform logs (real-time)
./scripts/manage-multi.sh logs app
./scripts/manage-multi.sh logs helios  
./scripts/manage-multi.sh logs celery

# Check deployment status
doctl apps list
doctl apps get <app-id>

# Database monitoring
doctl databases list
```

### AWS Monitoring
```bash
# ECS service logs
./scripts/manage-multi.sh logs app
./scripts/manage-multi.sh logs frontend
./scripts/manage-multi.sh logs celery

# CloudWatch logs direct access
aws logs describe-log-groups --log-group-name-prefix /ecs/

# Service status  
aws ecs describe-services --cluster your-project-cluster
```

### Common Issues and Solutions

#### 1. **"No space left on device" during build**
```bash
docker system prune -a
```

#### 2. **DigitalOcean App Platform deployment failed**
```bash
# Check deployment logs
doctl apps get-deployment <app-id>

# Rebuild images
./scripts/build-multi.sh digitalocean
```

#### 3. **AWS ECS tasks not starting**
```bash
# Check ECS events
aws ecs describe-services --cluster <cluster> --services <service>

# Check task definition
aws ecs describe-task-definition --task-definition <task-def>
```

#### 4. **Database connection issues**
```bash
# Get connection details
cd terraform-digitalocean  # or terraform for AWS
terraform output database_connection_string
```

---

## 🔄 Migration Between Providers

### From DigitalOcean to AWS
```bash
# 1. Backup your database
doctl databases backup list <db-id>

# 2. Deploy to AWS
./scripts/deploy-multi.sh aws
./scripts/build-multi.sh aws

# 3. Migrate data (manual step)
# 4. Update DNS to point to AWS

# 5. Destroy DigitalOcean (optional)
cd terraform-digitalocean && terraform destroy
```

### From AWS to DigitalOcean  
```bash
# 1. Create RDS snapshot
aws rds create-db-snapshot --db-instance-identifier <db-id> --db-snapshot-identifier migration-snapshot

# 2. Deploy to DigitalOcean
./scripts/deploy-multi.sh digitalocean
./scripts/build-multi.sh digitalocean

# 3. Migrate data (manual step)
# 4. Update DNS

# 5. Destroy AWS (optional)  
cd terraform && terraform destroy
```

---

## 🗂️ File Structure

```
├── terraform/                     # AWS Terraform configuration
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   └── terraform.tfvars.example
├── terraform-digitalocean/        # DigitalOcean Terraform configuration  
│   ├── main.tf
│   ├── variables.tf
│   ├── outputs.tf
│   ├── terraform.tfvars.example
│   └── user_data.sh              # Droplet initialization script
├── scripts/
│   ├── build-multi.sh            # Multi-provider image build
│   ├── deploy-multi.sh           # Multi-provider deployment  
│   ├── manage-multi.sh           # Multi-provider management
│   ├── build.sh                  # AWS-specific (legacy)
│   ├── deploy.sh                 # AWS-specific (legacy)
│   └── manage.sh                 # AWS-specific (legacy)
├── docker-compose.yml            # Local development
├── docker-compose.prod.yml       # Production reference
└── README-DEPLOYMENT.md          # This file
```

---

## 🚀 Quick Migration Guide

### Start Small, Scale Later Strategy

1. **Start with DigitalOcean** for development/MVP ($57/month)
2. **Monitor growth** and performance requirements  
3. **Migrate to AWS** when you need advanced features or scale
4. **Use the same Docker images** - no application changes needed!

### When to Choose Each Provider

**Choose DigitalOcean when:**
- ✅ Cost is a primary concern  
- ✅ You want simpler management
- ✅ Your app is small-to-medium scale
- ✅ You prefer managed services (App Platform)

**Choose AWS when:**
- ✅ You need enterprise features
- ✅ You require specific AWS services  
- ✅ You're building for high-scale
- ✅ Your team has AWS expertise

---

## 🆘 Support

### Getting Help
1. **Check the troubleshooting section** above
2. **View logs**: `./scripts/manage-multi.sh logs`  
3. **Check status**: `./scripts/manage-multi.sh status`
4. **Provider documentation**:
   - [DigitalOcean App Platform](https://docs.digitalocean.com/products/app-platform/)
   - [AWS ECS Documentation](https://docs.aws.amazon.com/ecs/)

### Cleanup Resources
```bash  
# DigitalOcean
cd terraform-digitalocean && terraform destroy

# AWS
cd terraform && terraform destroy
```

**⚠️ Warning**: Destroying resources will delete all data. Backup first!

---

**🎉 You're all set!** Choose your provider, deploy, and start saving money with DigitalOcean or get enterprise features with AWS.