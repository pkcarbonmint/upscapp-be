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
output "alb_security_group_id" {
  description = "ID of the ALB security group"
  value       = aws_security_group.alb.id
}

output "ecs_security_group_id" {
  description = "ID of the ECS security group"
  value       = aws_security_group.ecs.id
}

# RDS Outputs
output "rds_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = var.enable_rds ? aws_db_instance.main[0].endpoint : null
}

output "rds_port" {
  description = "The port on which the DB accepts connections"
  value       = var.enable_rds ? aws_db_instance.main[0].port : null
}

output "database_url" {
  description = "The full database URL for the application"
  value       = var.enable_rds ? "postgresql://${var.rds_username}:${var.rds_password}@${aws_db_instance.main[0].endpoint}:${aws_db_instance.main[0].port}/${var.rds_database_name}" : null
  sensitive   = true
}

# Redis Outputs
output "redis_endpoint" {
  description = "The connection endpoint for the Redis cluster"
  value       = var.enable_redis ? aws_elasticache_replication_group.main[0].primary_endpoint_address : null
}

output "redis_port" {
  description = "The port on which Redis accepts connections"
  value       = var.enable_redis ? aws_elasticache_replication_group.main[0].port : null
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

# ECS Outputs
output "ecs_cluster_id" {
  description = "ID of the ECS cluster"
  value       = aws_ecs_cluster.main.id
}

output "ecs_cluster_arn" {
  description = "ARN of the ECS cluster"
  value       = aws_ecs_cluster.main.arn
}

output "ecs_cluster_name" {
  description = "Name of the ECS cluster"
  value       = aws_ecs_cluster.main.name
}

# Load Balancer Outputs
output "alb_dns_name" {
  description = "The DNS name of the load balancer"
  value       = aws_lb.main.dns_name
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
  description = "The URL of the load balancer"
  value       = "http://${aws_lb.main.dns_name}"
}

# Target Group Outputs
output "target_group_app_arn" {
  description = "ARN of the app target group"
  value       = aws_lb_target_group.app.arn
}

output "target_group_helios_arn" {
  description = "ARN of the helios target group"
  value       = aws_lb_target_group.helios.arn
}

output "target_group_frontend_arn" {
  description = "ARN of the frontend target group"
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