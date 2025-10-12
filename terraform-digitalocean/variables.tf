# General Configuration
variable "do_token" {
  description = "DigitalOcean Personal Access Token"
  type        = string
  sensitive   = true
}

variable "do_region" {
  description = "DigitalOcean region"
  type        = string
  default     = "nyc3"
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
variable "enable_vpc" {
  description = "Enable VPC for private networking"
  type        = bool
  default     = true
}

variable "vpc_cidr" {
  description = "CIDR block for VPC"
  type        = string
  default     = "10.0.0.0/16"
}

# Deployment Strategy
variable "use_app_platform" {
  description = "Use DigitalOcean App Platform (PaaS) instead of droplets"
  type        = bool
  default     = true
}

variable "use_droplets" {
  description = "Use droplets for deployment (alternative to App Platform)"
  type        = bool
  default     = false
}

# Container Registry Configuration
variable "registry_tier" {
  description = "Container registry subscription tier (starter, basic, professional)"
  type        = string
  default     = "starter"
}

# Database Configuration
variable "enable_database" {
  description = "Enable DigitalOcean Managed Database (PostgreSQL)"
  type        = bool
  default     = true
}

variable "database_version" {
  description = "PostgreSQL version"
  type        = string
  default     = "15"
}

variable "database_size" {
  description = "Database node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

variable "database_node_count" {
  description = "Number of database nodes"
  type        = number
  default     = 1
}

variable "database_name" {
  description = "Name of the database"
  type        = string
  default     = "app"
}

variable "database_username" {
  description = "Database username"
  type        = string
  default     = "app"
}

# Redis Configuration
variable "enable_redis" {
  description = "Enable DigitalOcean Managed Redis"
  type        = bool
  default     = true
}

variable "redis_version" {
  description = "Redis version"
  type        = string
  default     = "7"
}

variable "redis_size" {
  description = "Redis node size"
  type        = string
  default     = "db-s-1vcpu-1gb"
}

# App Platform Configuration
variable "app_instance_count" {
  description = "Number of app instances"
  type        = number
  default     = 1
}

variable "app_instance_size" {
  description = "App instance size"
  type        = string
  default     = "basic-xxs"
}

variable "helios_instance_count" {
  description = "Number of Helios instances"
  type        = number
  default     = 1
}

variable "helios_instance_size" {
  description = "Helios instance size"
  type        = string
  default     = "basic-xxs"
}

variable "celery_instance_count" {
  description = "Number of Celery worker instances"
  type        = number
  default     = 1
}

variable "celery_instance_size" {
  description = "Celery worker instance size"
  type        = string
  default     = "basic-xxs"
}

# Droplet Configuration (when not using App Platform)
variable "droplet_count" {
  description = "Number of droplets to create"
  type        = number
  default     = 1
}

variable "droplet_size" {
  description = "Droplet size"
  type        = string
  default     = "s-1vcpu-1gb"
}

variable "droplet_image" {
  description = "Droplet image"
  type        = string
  default     = "docker-20-04"
}

variable "ssh_key_ids" {
  description = "List of SSH key IDs to add to droplets"
  type        = list(string)
  default     = []
}

# Load Balancer Configuration
variable "load_balancer_size" {
  description = "Load balancer size"
  type        = string
  default     = "lb-small"
}

# Firewall Configuration
variable "enable_firewall" {
  description = "Enable firewall for droplets"
  type        = bool
  default     = true
}

variable "ssh_allowed_ips" {
  description = "List of IP addresses allowed to SSH"
  type        = list(string)
  default     = ["0.0.0.0/0"]
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
    ENVIRONMENT = "production"
  }
}

variable "frontend_environment_variables" {
  description = "Environment variables for the frontend build"
  type        = map(string)
  default = {
    NODE_ENV = "production"
  }
}

# GitHub Configuration (for App Platform with GitHub integration)
variable "github_repo" {
  description = "GitHub repository for App Platform deployment"
  type        = string
  default     = ""
}

variable "github_branch" {
  description = "GitHub branch to deploy"
  type        = string
  default     = "main"
}

variable "auto_deploy_on_push" {
  description = "Auto-deploy on git push"
  type        = bool
  default     = true
}

# Domain Configuration
variable "custom_domain" {
  description = "Custom domain for the application"
  type        = string
  default     = ""
}

variable "ssl_certificate_name" {
  description = "SSL certificate name in DigitalOcean"
  type        = string
  default     = ""
}

# Monitoring Configuration
variable "enable_monitoring" {
  description = "Enable DigitalOcean monitoring"
  type        = bool
  default     = true
}

# Cost Optimization
variable "enable_auto_scaling" {
  description = "Enable auto-scaling for App Platform"
  type        = bool
  default     = false
}

variable "min_instance_count" {
  description = "Minimum instance count for auto-scaling"
  type        = number
  default     = 1
}

variable "max_instance_count" {
  description = "Maximum instance count for auto-scaling"
  type        = number
  default     = 5
}