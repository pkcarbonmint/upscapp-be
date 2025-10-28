# General Configuration
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "ap-south-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "stage2"
}

variable "project_name" {
  description = "Name of the project"
  type        = string
  default     = "upscpro-stage2"
}

# VPC Configuration
variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.2.0.0/16" # Different CIDR to avoid conflicts with existing stage
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
  description = "Enable RDS PostgreSQL database (ignored if deploy_rds_separately is true)"
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
  default     = "upscproStage2DB"
}

variable "rds_username" {
  description = "Username for the master DB user"
  type        = string
  default     = "upscproStage2User"
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

variable "onboarding_ui_image_tag" {
  description = "Docker image tag for the Onboarding UI"
  type        = string
  default     = "latest"
}

variable "faculty_ui_image_tag" {
  description = "Docker image tag for the Faculty UI"
  type        = string
  default     = "latest"
}

# Environment Variables
variable "app_environment_variables" {
  description = "Environment variables for the application"
  type        = map(string)
  default = {
    ENVIRONMENT  = "stage2"
    CORS_ORIGINS = "[\"https://stage2.upscpro.laex.in\"]"
  }
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
  default     = true
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

# ECS Configuration
variable "ecs_app_cpu" {
  description = "CPU units for the app ECS task"
  type        = number
  default     = 256
}

variable "ecs_app_memory" {
  description = "Memory for the app ECS task"
  type        = number
  default     = 512
}

variable "ecs_app_count" {
  description = "Number of app ECS tasks to run"
  type        = number
  default     = 1
}

variable "ecs_frontend_cpu" {
  description = "CPU units for the frontend ECS task"
  type        = number
  default     = 256
}

variable "ecs_frontend_memory" {
  description = "Memory for the frontend ECS task"
  type        = number
  default     = 512
}

variable "ecs_frontend_count" {
  description = "Number of frontend ECS tasks to run"
  type        = number
  default     = 1
}

variable "ecs_celery_cpu" {
  description = "CPU units for the celery ECS task"
  type        = number
  default     = 256
}

variable "ecs_celery_memory" {
  description = "Memory for the celery ECS task"
  type        = number
  default     = 512
}

variable "ecs_celery_count" {
  description = "Number of celery ECS tasks to run"
  type        = number
  default     = 1
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

variable "onboarding_ui_dockerfile_path" {
  description = "Path to the Onboarding UI Dockerfile relative to docker_build_context"
  type        = string
  default     = "onboarding-ui/Dockerfile"
}

variable "faculty_ui_dockerfile_path" {
  description = "Path to the Faculty UI Dockerfile relative to docker_build_context"
  type        = string
  default     = "faculty-ui/Dockerfile"
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

# GitHub Integration
variable "github_token" {
  description = "GitHub personal access token for cloning repositories"
  type        = string
  sensitive   = true
  default     = ""
}

variable "github_repository_url" {
  description = "GitHub repository URL (HTTPS format)"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to checkout"
  type        = string
  default     = "main"
}

variable "enable_auto_deploy" {
  description = "Enable automatic deployment on code changes"
  type        = bool
  default     = false
}

variable "webhook_secret" {
  description = "Secret for GitHub webhook validation"
  type        = string
  sensitive   = true
  default     = ""
}

# RDS Module Configuration (removed - using direct RDS deployment)

# S3 Configuration
variable "enable_s3_buckets" {
  description = "Enable S3 buckets for static assets and images"
  type        = bool
  default     = true
}

# CloudFront Configuration
variable "enable_cloudfront" {
  description = "Enable CloudFront distribution"
  type        = bool
  default     = true
}

variable "cloudfront_price_class" {
  description = "CloudFront price class"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.cloudfront_price_class)
    error_message = "CloudFront price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}

# Study Planner Static Site (S3 + CloudFront)
variable "study_planner_enable" {
  description = "Enable S3 + CloudFront for study planner SPA"
  type        = bool
  default     = true
}

variable "study_planner_bucket_name" {
  description = "S3 bucket name for study planner static site"
  type        = string
  default     = "study-planner.upscpro.laex.in"
}

variable "study_planner_domain_name" {
  description = "Custom domain for study planner CloudFront (optional)"
  type        = string
  default     = ""
}

variable "study_planner_route53_zone_id" {
  description = "Route53 Hosted Zone ID for study planner domain (optional)"
  type        = string
  default     = ""
}

variable "study_planner_certificate_arn" {
  description = "Existing ACM certificate ARN in us-east-1 for study planner (optional)"
  type        = string
  default     = ""
}

variable "study_planner_cloudfront_price_class" {
  description = "CloudFront price class for study planner"
  type        = string
  default     = "PriceClass_100"
  validation {
    condition = contains([
      "PriceClass_All",
      "PriceClass_200",
      "PriceClass_100"
    ], var.study_planner_cloudfront_price_class)
    error_message = "CloudFront price class must be one of: PriceClass_All, PriceClass_200, PriceClass_100."
  }
}
