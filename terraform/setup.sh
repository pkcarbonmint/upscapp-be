#!/bin/bash

# UPSC App Infrastructure Setup Script
# This script sets up the entire AWS infrastructure using only environment variables for AWS credentials

set -e  # Exit on any error

echo "🚀 UPSC App Infrastructure Setup"
echo "================================="

# Check if required environment variables are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Error: AWS credentials not found in environment variables"
    echo "Please set the following environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-access-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    echo "  export AWS_DEFAULT_REGION=us-west-2  # Optional, defaults to us-west-2"
    exit 1
fi

# Set default region if not provided
export AWS_DEFAULT_REGION=${AWS_DEFAULT_REGION:-ap-south-1}

echo "✅ AWS credentials found"
echo "📍 Region: $AWS_DEFAULT_REGION"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Error: Terraform is not installed"
    echo "Please install Terraform: https://learn.hashicorp.com/tutorials/terraform/install-cli"
    exit 1
fi

echo "✅ Terraform found: $(terraform version | head -n1)"

# Terraform will handle AWS authentication directly using environment variables
echo "🔐 AWS credentials will be verified by Terraform during deployment"

# Copy minimal terraform.tfvars if it doesn't exist
if [ ! -f "terraform.tfvars" ]; then
    echo "📝 Creating terraform.tfvars from minimal template..."
    cp terraform.tfvars.minimal terraform.tfvars
    echo "✅ terraform.tfvars created"
    echo "⚠️  Please edit terraform.tfvars to change default passwords before proceeding"
    echo "   You can use: nano terraform.tfvars"
    read -p "Press Enter to continue after editing terraform.tfvars..."
else
    echo "✅ terraform.tfvars already exists"
fi

# Initialize Terraform
echo "🔧 Initializing Terraform..."
terraform init

# Plan the deployment
echo "📋 Planning Terraform deployment..."
terraform plan

# Ask for confirmation
echo ""
echo "⚠️  This will create AWS resources that will incur costs."
echo "💰 Estimated monthly cost: $90-125 (depending on usage and RDS choice)"
echo ""
read -p "Do you want to proceed with the deployment? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Deployment cancelled"
    exit 0
fi

# Apply the deployment
echo "🚀 Deploying infrastructure..."
terraform apply -auto-approve

# Get important outputs
echo ""
echo "🎉 Deployment completed successfully!"
echo "=================================="
echo ""
echo "📊 Important Information:"
echo "========================"

# Get EC2 instance URLs
STRAPI_URL=$(terraform output -raw strapi_url 2>/dev/null || echo "Not available")
APP_URL=$(terraform output -raw app_url 2>/dev/null || echo "Not available")
HELIOS_URL=$(terraform output -raw helios_url 2>/dev/null || echo "Not available")
FRONTEND_URL=$(terraform output -raw frontend_url 2>/dev/null || echo "Not available")

echo "🌐 Application URLs:"
echo "   Strapi CMS: $STRAPI_URL"
echo "   Python API: $APP_URL"
echo "   Helios: $HELIOS_URL"
echo "   Frontend: $FRONTEND_URL"

# Get ECR repository URLs
echo ""
echo "🐳 ECR Repository URLs (for pushing Docker images):"
ECR_APP=$(terraform output -raw ecr_repository_app_url 2>/dev/null || echo "Not available")
ECR_HELIOS=$(terraform output -raw ecr_repository_helios_url 2>/dev/null || echo "Not available")
ECR_FRONTEND=$(terraform output -raw ecr_repository_frontend_url 2>/dev/null || echo "Not available")

echo "   App: $ECR_APP"
echo "   Helios: $ECR_HELIOS"
echo "   Frontend: $ECR_FRONTEND"

# Get database info
echo ""
echo "🗄️  Database Information:"
RDS_ENDPOINT=$(terraform output -raw rds_endpoint 2>/dev/null || echo "Not available")
echo "   Endpoint: $RDS_ENDPOINT"

# Get EC2 instance IPs
echo ""
echo "💻 EC2 Instance Information:"
STRAPI_IP=$(terraform output -raw strapi_instance_public_ip 2>/dev/null || echo "Not available")
DOCKER_IP=$(terraform output -raw docker_instance_public_ip 2>/dev/null || echo "Not available")
echo "   Strapi Instance IP: $STRAPI_IP"
echo "   Docker Instance IP: $DOCKER_IP"

echo ""
echo "📝 Next Steps:"
echo "============="
echo "1. Your applications are automatically deployed on EC2 instances"
echo "2. Access your services using the URLs above"
echo "3. Monitor your instances in the AWS EC2 Console"
echo "4. SSH to instances for debugging (if key pairs configured)"
echo ""
echo "🐳 Docker Image Options:"
echo "   Option 1: Enable automatic Docker build in terraform.tfvars:"
echo "     enable_docker_build = true"
echo "     docker_build_context = \"../\""
echo "   Option 2: Manual build and push (requires AWS CLI):"
echo "     aws ecr get-login-password --region $AWS_DEFAULT_REGION | docker login --username AWS --password-stdin <account-id>.dkr.ecr.$AWS_DEFAULT_REGION.amazonaws.com"
echo ""
echo "🔧 To destroy the infrastructure later:"
echo "   terraform destroy"
echo ""
echo "✅ Setup complete!"
