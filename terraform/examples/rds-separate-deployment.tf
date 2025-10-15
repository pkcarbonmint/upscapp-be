# Example: Deploy RDS separately from main infrastructure
# This example shows how to deploy RDS independently

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
}

# Deploy RDS module independently
module "rds" {
  source = "../modules/rds"

  project_name = "myapp"
  password     = var.rds_password

  # Optional: Use existing VPC (comment out to create new VPC)
  # vpc_id                     = "vpc-12345678"
  # allowed_security_group_ids = ["sg-12345678"]

  # Optional: Create new VPC for RDS
  vpc_cidr = "10.1.0.0/16"
  allowed_cidr_blocks = ["10.0.0.0/16"] # Allow access from main infrastructure VPC

  # RDS Configuration
  instance_class        = "db.t3.small"
  allocated_storage     = 50
  max_allocated_storage = 200
  
  # Backup and Maintenance
  backup_retention_period = 14
  deletion_protection     = true
  
  # Performance and Monitoring
  performance_insights_enabled = true
  monitoring_interval         = 60
  
  # Encryption
  storage_encrypted = true

  tags = {
    Environment = "production"
    Project     = "myapp"
    Component   = "database"
    ManagedBy   = "terraform"
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "rds_password" {
  description = "Password for the RDS instance"
  type        = string
  sensitive   = true
}

# Outputs
output "rds_connection_info" {
  description = "RDS connection information for use in main infrastructure"
  value = {
    endpoint        = module.rds.db_instance_endpoint
    port           = module.rds.db_instance_port
    database_name  = module.rds.db_instance_name
    username       = module.rds.db_instance_username
    security_group = module.rds.security_group_id
    vpc_id         = module.rds.vpc_id
  }
  sensitive = false
}

output "database_url" {
  description = "Full database connection URL"
  value       = module.rds.database_url
  sensitive   = true
}

# Example usage in main infrastructure:
# 1. Deploy this RDS configuration first:
#    terraform init
#    terraform apply
#
# 2. Use outputs in main infrastructure terraform.tfvars:
#    external_rds_endpoint = "output-from-step-1"
#    external_rds_port     = 5432
#    external_rds_username = "app"
#    external_rds_password = "your-password"
#    external_rds_database = "app"