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





output "alb_zone_id" {
  description = "The canonical hosted zone ID of the load balancer"
  value       = aws_lb.main.zone_id
}

output "alb_arn" {
  description = "The ARN of the load balancer"
  value       = aws_lb.main.arn
}

output "alb_url" {
  description = "The URL of the load balancer (frontend only)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : (var.certificate_arn != "" || var.enable_https ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}")
}

# SSL Certificate Outputs
output "ssl_certificate_arn" {
  description = "ARN of the SSL certificate"
  value       = var.domain_name != "" ? aws_acm_certificate.main[0].arn : null
}

output "ssl_certificate_status" {
  description = "Status of the SSL certificate"
  value       = var.domain_name != "" ? aws_acm_certificate.main[0].status : null
}

# Target Group Outputs
output "target_group_frontend_arn" {
  description = "ARN of the frontend target group (only exposed service)"
  value       = aws_lb_target_group.frontend.arn
}

# IAM Role Outputs
output "ecs_task_execution_role_arn" {
  description = "ARN of the ECS task execution role"
  value       = aws_iam_role.ecs_task_execution_role.arn
}

output "ecs_task_role_arn" {
  description = "ARN of the ECS task role"
  value       = aws_iam_role.ecs_task_role.arn
}

# CloudWatch Log Group Output
output "cloudwatch_log_group_name" {
  description = "Name of the CloudWatch log group"
  value       = aws_cloudwatch_log_group.ecs.name
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
  description = "Strapi CMS is now private - accessible only through internal network"
  value       = var.enable_ec2_instances ? "http://${aws_instance.strapi[0].private_ip}:1337 (private)" : null
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
  description = "Python API is now private - accessible only through frontend"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].private_ip}:8000 (private)" : null
}

output "helios_url" {
  description = "Helios service is now private - accessible only through frontend"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].private_ip}:8080 (private)" : null
}

output "frontend_url" {
  description = "URL to access the frontend (via ALB)"
  value       = var.domain_name != "" ? "https://${var.domain_name}" : (var.certificate_arn != "" || var.enable_https ? "https://${aws_lb.main.dns_name}" : "http://${aws_lb.main.dns_name}")
}

output "flower_url" {
  description = "Celery Flower is now private - accessible only through internal network"
  value       = var.enable_ec2_instances ? "http://${aws_instance.docker[0].private_ip}:5555 (private)" : null
}

output "webhook_url" {
  description = "GitHub webhook is now private - accessible only through internal network"
  value       = var.enable_ec2_instances && var.enable_auto_deploy ? "http://${aws_instance.docker[0].private_ip}:9000/webhook (private)" : null
}

# GitHub Integration Outputs
output "github_integration_info" {
  description = "Information about GitHub integration setup"
  value = {
    repository_configured = var.github_repository_url != ""
    auto_deploy_enabled   = var.enable_auto_deploy
    webhook_endpoint      = var.enable_ec2_instances && var.enable_auto_deploy ? "http://${aws_instance.docker[0].private_ip}:9000/webhook (private)" : null
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