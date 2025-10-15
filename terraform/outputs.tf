# VPC Outputs
output "vpc_id" {
  description = "ID of the VPC"
  value       = aws_vpc.main.id
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC"
  value       = aws_vpc.main.cidr_block
}

# Subnet Outputs
output "public_subnet_ids" {
  description = "List of IDs of the public subnets"
  value       = aws_subnet.public[*].id
}

output "private_subnet_ids" {
  description = "List of IDs of the private subnets"
  value       = aws_subnet.private[*].id
}

# Security Group Outputs
output "ec2_security_group_id" {
  description = "ID of the EC2 security group"
  value       = aws_security_group.ec2.id
}

output "rds_security_group_id" {
  description = "ID of the RDS security group"
  value       = aws_security_group.rds.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = local.rds_endpoint
}

output "rds_port" {
  description = "The port on which the DB accepts connections"
  value       = local.rds_port
}

output "database_url" {
  description = "The full database URL for the application"
  value       = local.database_url
  sensitive   = true
}

# RDS Module Outputs (if using separate RDS module)
output "rds_module_outputs" {
  description = "Outputs from the RDS module (if deployed separately)"
  value = var.deploy_rds_separately && length(module.rds) > 0 ? {
    db_instance_id       = module.rds[0].db_instance_id
    db_instance_arn      = module.rds[0].db_instance_arn
    db_instance_endpoint = module.rds[0].db_instance_endpoint
    db_instance_port     = module.rds[0].db_instance_port
    security_group_id    = module.rds[0].security_group_id
    connection_info      = module.rds[0].connection_info
  } : null
}

# Redis Outputs (removed - using RDS for Redis functionality)
# Redis functionality is now handled by RDS

# ECR Repository Outputs
output "ecr_repository_app_url" {
  description = "The URL of the app ECR repository"
  value       = aws_ecr_repository.app.repository_url
}

output "ecr_repository_helios_url" {
  description = "The URL of the helios ECR repository"
  value       = aws_ecr_repository.helios.repository_url
}

output "ecr_repository_frontend_url" {
  description = "The URL of the frontend ECR repository"
  value       = aws_ecr_repository.frontend.repository_url
}






# EC2 Instance Outputs
output "strapi_instance_id" {
  description = "ID of the Strapi EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.strapi[0].id : null
}

output "strapi_instance_public_ip" {
  description = "Public IP of the Strapi EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.strapi[0].public_ip : null
}

output "strapi_instance_private_ip" {
  description = "Private IP of the Strapi EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.strapi[0].private_ip : null
}

output "strapi_url" {
  description = "URL to access Strapi CMS"
  value       = var.enable_ec2_instances ? "http://${aws_instance.strapi[0].public_ip}:1337" : null
}

output "docker_instance_id" {
  description = "ID of the Docker EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.docker[0].id : null
}

output "docker_instance_public_ip" {
  description = "Public IP of the Docker EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.docker[0].public_ip : null
}

output "docker_instance_private_ip" {
  description = "Private IP of the Docker EC2 instance"
  value       = var.enable_ec2_instances ? aws_instance.docker[0].private_ip : null
}

output "app_url" {
  description = "URL to access the Python API"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].public_ip}:8000" : null
}

output "helios_url" {
  description = "URL to access Helios service"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].public_ip}:8080" : null
}

output "frontend_url" {
  description = "URL to access the frontend"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].public_ip}:3000" : null
}


output "webhook_url" {
  description = "URL for GitHub webhook (if auto-deploy is enabled)"
  value       = var.enable_ec2_instances && var.enable_auto_deploy ? "http://${aws_instance.docker[0].public_ip}:9000/webhook" : null
}

# GitHub Integration Outputs
output "github_integration_info" {
  description = "Information about GitHub integration setup"
  value = {
    repository_configured = var.github_repository_url != ""
    auto_deploy_enabled   = var.enable_auto_deploy
    webhook_endpoint      = var.enable_ec2_instances && var.enable_auto_deploy ? "http://${aws_instance.docker[0].public_ip}:9000/webhook" : null
    branch                = var.github_branch
  }
}

# General Information
output "aws_region" {
  description = "AWS region"
  value       = var.aws_region
}

output "environment" {
  description = "Environment name"
  value       = var.environment
}

output "project_name" {
  description = "Project name"
  value       = var.project_name
}