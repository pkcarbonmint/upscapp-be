# RDS Instance Outputs
output "db_instance_id" {
  description = "The RDS instance ID"
  value       = aws_db_instance.main.id
}

output "db_instance_arn" {
  description = "The ARN of the RDS instance"
  value       = aws_db_instance.main.arn
}

output "db_instance_endpoint" {
  description = "The connection endpoint for the RDS instance"
  value       = aws_db_instance.main.endpoint
}

output "db_instance_port" {
  description = "The database port"
  value       = aws_db_instance.main.port
}

output "db_instance_name" {
  description = "The database name"
  value       = aws_db_instance.main.db_name
}

output "db_instance_username" {
  description = "The master username for the database"
  value       = aws_db_instance.main.username
  sensitive   = true
}

output "db_instance_password" {
  description = "The master password for the database"
  value       = var.password
  sensitive   = true
}

# Database URL
output "database_url" {
  description = "The full database connection URL"
  value       = "postgresql://${aws_db_instance.main.username}:${var.password}@${aws_db_instance.main.endpoint}:${aws_db_instance.main.port}/${aws_db_instance.main.db_name}"
  sensitive   = true
}

# Security Group Outputs
output "security_group_id" {
  description = "The ID of the RDS security group"
  value       = aws_security_group.rds.id
}

# Subnet Group Output
output "db_subnet_group_name" {
  description = "The name of the DB subnet group"
  value       = aws_db_subnet_group.main.name
}

output "db_subnet_group_arn" {
  description = "The ARN of the DB subnet group"
  value       = aws_db_subnet_group.main.arn
}

# VPC Outputs (if created by this module)
output "vpc_id" {
  description = "The ID of the VPC (if created by this module)"
  value       = var.vpc_id != "" ? var.vpc_id : (length(aws_vpc.rds) > 0 ? aws_vpc.rds[0].id : null)
}

output "vpc_cidr_block" {
  description = "The CIDR block of the VPC (if created by this module)"
  value       = length(aws_vpc.rds) > 0 ? aws_vpc.rds[0].cidr_block : null
}

output "subnet_ids" {
  description = "List of subnet IDs used by RDS"
  value       = var.vpc_id != "" ? data.aws_subnets.existing[0].ids : aws_subnet.rds_private[*].id
}

# Connection Information
output "connection_info" {
  description = "Database connection information"
  value = {
    endpoint = aws_db_instance.main.endpoint
    port     = aws_db_instance.main.port
    database = aws_db_instance.main.db_name
    username = aws_db_instance.main.username
  }
  sensitive = false
}