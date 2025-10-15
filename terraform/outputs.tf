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
  value       = var.enable_rds && var.external_rds_endpoint == "" ? aws_db_instance.main[0].endpoint : (var.external_rds_endpoint != "" ? var.external_rds_endpoint : null)
}

output "rds_port" {
  description = "The port on which the DB accepts connections"
  value       = var.enable_rds && var.external_rds_endpoint == "" ? aws_db_instance.main[0].port : var.external_rds_port
}

output "database_url" {
  description = "The full database URL for the application"
  value       = var.external_rds_endpoint != "" ? "postgresql://${var.external_rds_username}:${var.external_rds_password}@${var.external_rds_endpoint}:${var.external_rds_port}/${var.external_rds_database}" : (var.enable_rds && var.external_rds_endpoint == "" ? "postgresql://${var.rds_username}:${var.rds_password}@${aws_db_instance.main[0].endpoint}:${aws_db_instance.main[0].port}/${var.rds_database_name}" : null)
  sensitive   = true
}


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