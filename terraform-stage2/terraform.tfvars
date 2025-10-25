# General Configuration
aws_region   = "ap-south-1"
environment  = "stage2"
project_name = "upscpro-stage2"

# VPC Configuration
vpc_cidr             = "10.2.0.0/16" # Different CIDR to avoid conflicts with existing stage
public_subnet_count  = 2
private_subnet_count = 2
enable_nat_gateway   = true

# RDS Configuration
enable_rds                  = true
rds_allocated_storage       = 20
rds_max_allocated_storage   = 100
rds_engine_version          = "15.14"
rds_instance_class          = "db.t3.micro"
rds_database_name           = "upscproStage2DB"
rds_username                = "upscproStage2User"
rds_password                = "upscproStage2Password123!" # Change this in production
rds_backup_retention_period = 7
rds_backup_window           = "03:00-04:00"
rds_maintenance_window      = "Sun:04:00-Sun:05:00"
rds_skip_final_snapshot     = true
rds_deletion_protection     = false

# Application Configuration
app_image_tag           = "latest"
helios_image_tag        = "latest"
frontend_image_tag      = "latest"
onboarding_ui_image_tag = "latest"
faculty_ui_image_tag    = "latest"

# Environment Variables
app_environment_variables = {
  ENVIRONMENT  = "stage2"
  CORS_ORIGINS = "[\"https://stage2.upscpro.laex.in\"]"
}

flower_user     = "admin"
flower_password = "admin123" # Change this in production

# Load Balancer Configuration
alb_deletion_protection = false

# CloudWatch Configuration
cloudwatch_log_retention_days = 14

# SSL Certificate
certificate_arn = ""
enable_https    = true

# Domain Configuration
route53_zone_id = ""
domain_name     = ""

# Auto Scaling Configuration
enable_auto_scaling        = false
auto_scaling_min_capacity  = 1
auto_scaling_max_capacity  = 10
auto_scaling_target_cpu    = 70
auto_scaling_target_memory = 80

# ECS Configuration (Disabled - using EC2 with docker-compose)
ecs_app_cpu    = 256
ecs_app_memory = 512
ecs_app_count  = 0

ecs_frontend_cpu    = 256
ecs_frontend_memory = 512
ecs_frontend_count  = 0

ecs_celery_cpu    = 256
ecs_celery_memory = 512
ecs_celery_count  = 0

# Docker Image Configuration
enable_docker_build           = false
docker_build_context          = "../"
app_dockerfile_path           = "Dockerfile"
helios_dockerfile_path        = "helios/Dockerfile"
frontend_dockerfile_path      = "frontend/Dockerfile"
onboarding_ui_dockerfile_path = "onboarding-ui/Dockerfile"
faculty_ui_dockerfile_path    = "faculty-ui/Dockerfile"

# EC2 Configuration
enable_ec2_instances = true
strapi_instance_type = "t3.medium"
docker_instance_type = "t3.large"
strapi_key_name      = ""
docker_key_name      = ""
strapi_volume_size   = 20
docker_volume_size   = 30
strapi_domain        = ""

# External RDS Configuration (if using existing RDS)
external_rds_endpoint = ""
external_rds_port     = 5432
external_rds_username = ""
external_rds_password = ""
external_rds_database = ""

# GitHub Integration
github_token          = ""
github_repository_url = ""
github_branch         = "algo_refactor"
enable_auto_deploy    = false
webhook_secret        = ""

# RDS Module Configuration (removed - using direct RDS deployment)

# S3 and CloudFront Configuration
enable_s3_buckets      = true
enable_cloudfront      = true
cloudfront_price_class = "PriceClass_100"
