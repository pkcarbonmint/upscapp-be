# General Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-west-2"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "production"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "upscpro"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

variable "public_subnet_count" {
  description = "Number of public subnets"
  type        = number
  default     = 2
}

variable "private_subnet_count" {
  description = "Number of private subnets"
  type        = number
  default     = 2
}

variable "enable_nat_gateway" {
  description = "Should be true to provision NAT Gateways for each of your private networks"
  type        = bool
  default     = true
}

# RDS Configuration
variable "enable_rds" {
  description = "Enable RDS PostgreSQL database"
  type        = bool
  default     = true
}

variable "rds_allocated_storage" {
  description = "The allocated storage in gigabytes"
  type        = number
  default     = 20
}

variable "rds_max_allocated_storage" {
  description = "The upper limit to which Amazon RDS can automatically scale the storage of the DB instance"
  type        = number
  default     = 100
}

variable "rds_engine_version" {
  description = "The engine version to use"
  type        = string
  default     = "15.14"
}

variable "rds_instance_class" {
  description = "The instance type of the RDS instance"
  type        = string
  default     = "db.t3.micro"
}

variable "rds_database_name" {
  description = "The name of the database to create when the DB instance is created"
  type        = string
  default     = "app"
}

variable "rds_username" {
  description = "Username for the master DB user"
  type        = string
  default     = "app"
}

variable "rds_password" {
  description = "Password for the master DB user"
  type        = string
  sensitive   = true
}

variable "rds_backup_retention_period" {
  description = "The days to retain backups for"
  type        = number
  default     = 7
}

variable "rds_backup_window" {
  description = "The daily time range (in UTC) during which automated backups are created"
  type        = string
  default     = "03:00-04:00"
}

variable "rds_maintenance_window" {
  description = "The window to perform maintenance in"
  type        = string
  default     = "Sun:04:00-Sun:05:00"
}

variable "rds_skip_final_snapshot" {
  description = "Determines whether a final DB snapshot is created before the DB instance is deleted"
  type        = bool
  default     = true
}

variable "rds_deletion_protection" {
  description = "The database can't be deleted when this value is set to true"
  type        = bool
  default     = false
}

# Redis Configuration
variable "enable_redis" {
  description = "Enable ElastiCache Redis cluster"
  type        = bool
  default     = true
}

variable "redis_node_type" {
  description = "The compute and memory capacity of the nodes"
  type        = string
  default     = "cache.t3.micro"
}

variable "redis_num_cache_nodes" {
  description = "The initial number of cache nodes that the cache cluster will have"
  type        = number
  default     = 1
}

# ECS Configuration
variable "ecs_app_cpu" {
  description = "Fargate instance CPU units to provision (1 vCPU = 1024 CPU units)"
  type        = number
  default     = 512
}

variable "ecs_app_memory" {
  description = "Fargate instance memory to provision (in MiB)"
  type        = number
  default     = 1024
}

variable "ecs_app_count" {
  description = "Number of docker containers to run"
  type        = number
  default     = 1
}

variable "ecs_helios_cpu" {
  description = "Fargate instance CPU units to provision for Helios service (1 vCPU = 1024 CPU units)"
  type        = number
  default     = 256
}

variable "ecs_helios_memory" {
  description = "Fargate instance memory to provision for Helios service (in MiB)"
  type        = number
  default     = 512
}

variable "ecs_helios_count" {
  description = "Number of Helios docker containers to run"
  type        = number
  default     = 1
}

variable "ecs_frontend_cpu" {
  description = "Fargate instance CPU units to provision for Frontend service (1 vCPU = 1024 CPU units)"
  type        = number
  default     = 256
}

variable "ecs_frontend_memory" {
  description = "Fargate instance memory to provision for Frontend service (in MiB)"
  type        = number
  default     = 512
}

variable "ecs_frontend_count" {
  description = "Number of Frontend docker containers to run"
  type        = number
  default     = 1
}

variable "ecs_celery_cpu" {
  description = "Fargate instance CPU units to provision for Celery worker (1 vCPU = 1024 CPU units)"
  type        = number
  default     = 256
}

variable "ecs_celery_memory" {
  description = "Fargate instance memory to provision for Celery worker (in MiB)"
  type        = number
  default     = 512
}

variable "ecs_celery_count" {
  description = "Number of Celery worker containers to run"
  type        = number
  default     = 1
}

# Application Configuration
variable "app_image_tag" {
  description = "Docker image tag for the application"
  type        = string
  default     = "latest"
}

variable "helios_image_tag" {
  description = "Docker image tag for the Helios service"
  type        = string
  default     = "latest"
}

variable "frontend_image_tag" {
  description = "Docker image tag for the Frontend service"
  type        = string
  default     = "latest"
}

# Environment Variables
variable "app_environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default = {
    ENVIRONMENT  = "production"
    CORS_ORIGINS = "[\"https://your-domain.com\"]"
  }
}

variable "redis_password" {
  description = "Password for Redis authentication"
  type        = string
  sensitive   = true
  default     = ""
}

variable "flower_user" {
  description = "Username for Flower monitoring interface"
  type        = string
  default     = "admin"
}

variable "flower_password" {
  description = "Password for Flower monitoring interface"
  type        = string
  sensitive   = true
  default     = ""
}

# Load Balancer Configuration
variable "alb_deletion_protection" {
  description = "If true, deletion of the load balancer will be disabled via the AWS API"
  type        = bool
  default     = false
}

# CloudWatch Configuration
variable "cloudwatch_log_retention_days" {
  description = "Specifies the number of days you want to retain log events"
  type        = number
  default     = 14
}

# SSL Certificate
variable "certificate_arn" {
  description = "The ARN of the certificate that the ALB uses for https"
  type        = string
  default     = ""
}

variable "enable_https" {
  description = "Enable HTTPS listener on ALB"
  type        = bool
  default     = false
}

# Domain Configuration
variable "route53_zone_id" {
  description = "The Route53 zone ID"
  type        = string
  default     = ""
}

variable "domain_name" {
  description = "The domain name for the application"
  type        = string
  default     = ""
}

# Auto Scaling Configuration
variable "enable_auto_scaling" {
  description = "Enable auto scaling for ECS services"
  type        = bool
  default     = false
}

variable "auto_scaling_min_capacity" {
  description = "Minimum number of tasks to run"
  type        = number
  default     = 1
}

variable "auto_scaling_max_capacity" {
  description = "Maximum number of tasks to run"
  type        = number
  default     = 10
}

variable "auto_scaling_target_cpu" {
  description = "Target CPU utilization for auto scaling"
  type        = number
  default     = 70
}

variable "auto_scaling_target_memory" {
  description = "Target memory utilization for auto scaling"
  type        = number
  default     = 80
}

# Docker Image Configuration
variable "enable_docker_build" {
  description = "Enable automatic Docker image building and pushing to ECR"
  type        = bool
  default     = false
}

variable "docker_build_context" {
  description = "Path to the Docker build context (directory containing Dockerfile)"
  type        = string
  default     = "../"
}

variable "app_dockerfile_path" {
  description = "Path to the app Dockerfile relative to docker_build_context"
  type        = string
  default     = "Dockerfile"
}

variable "helios_dockerfile_path" {
  description = "Path to the Helios Dockerfile relative to docker_build_context"
  type        = string
  default     = "helios/Dockerfile"
}

variable "frontend_dockerfile_path" {
  description = "Path to the Frontend Dockerfile relative to docker_build_context"
  type        = string
  default     = "frontend/Dockerfile"
}

# EC2 Configuration
variable "enable_ec2_instances" {
  description = "Enable EC2 instances for Strapi and Docker containers"
  type        = bool
  default     = true
}

variable "strapi_instance_type" {
  description = "EC2 instance type for Strapi"
  type        = string
  default     = "t3.medium"
}

variable "docker_instance_type" {
  description = "EC2 instance type for Docker containers"
  type        = string
  default     = "t3.large"
}

variable "strapi_key_name" {
  description = "Key pair name for Strapi EC2 instance"
  type        = string
  default     = ""
}

variable "docker_key_name" {
  description = "Key pair name for Docker EC2 instance"
  type        = string
  default     = ""
}

variable "strapi_volume_size" {
  description = "EBS volume size for Strapi instance (GB)"
  type        = number
  default     = 20
}

variable "docker_volume_size" {
  description = "EBS volume size for Docker instance (GB)"
  type        = number
  default     = 30
}

variable "strapi_domain" {
  description = "Domain name for Strapi CMS"
  type        = string
  default     = ""
}

variable "external_rds_endpoint" {
  description = "External RDS endpoint (if not using Terraform-managed RDS)"
  type        = string
  default     = ""
}

variable "external_rds_port" {
  description = "External RDS port"
  type        = number
  default     = 5432
}

variable "external_rds_username" {
  description = "External RDS username"
  type        = string
  default     = ""
}

variable "external_rds_password" {
  description = "External RDS password"
  type        = string
  sensitive   = true
  default     = ""
}

variable "external_rds_database" {
  description = "External RDS database name"
  type        = string
  default     = ""
}