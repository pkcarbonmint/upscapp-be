# DigitalOcean Region
output "do_region" {
  description = "DigitalOcean region"
  value       = var.do_region
}

# Container Registry
output "registry_endpoint" {
  description = "Container registry endpoint"
  value       = digitalocean_container_registry.main.endpoint
}

output "registry_name" {
  description = "Container registry name"
  value       = digitalocean_container_registry.main.name
}

# VPC
output "vpc_id" {
  description = "VPC ID"
  value       = var.enable_vpc ? digitalocean_vpc.main[0].id : null
}

output "vpc_urn" {
  description = "VPC URN"
  value       = var.enable_vpc ? digitalocean_vpc.main[0].urn : null
}

# Database
output "database_host" {
  description = "Database host"
  value       = var.enable_database ? digitalocean_database_cluster.main[0].host : null
}

output "database_private_host" {
  description = "Database private host"
  value       = var.enable_database ? digitalocean_database_cluster.main[0].private_host : null
}

output "database_port" {
  description = "Database port"
  value       = var.enable_database ? digitalocean_database_cluster.main[0].port : null
}

output "database_username" {
  description = "Database username"
  value       = var.enable_database ? digitalocean_database_user.main[0].name : null
}

output "database_password" {
  description = "Database password"
  value       = var.enable_database ? digitalocean_database_user.main[0].password : null
  sensitive   = true
}

output "database_uri" {
  description = "Database connection URI"
  value       = var.enable_database ? digitalocean_database_cluster.main[0].uri : null
  sensitive   = true
}

output "database_connection_string" {
  description = "Full database connection string"
  value = var.enable_database ? "postgresql://${digitalocean_database_user.main[0].name}:${digitalocean_database_user.main[0].password}@${digitalocean_database_cluster.main[0].private_host}:${digitalocean_database_cluster.main[0].port}/${var.database_name}?sslmode=require" : null
  sensitive = true
}

# Redis
output "redis_host" {
  description = "Redis host"
  value       = var.enable_redis ? digitalocean_database_cluster.redis[0].host : null
}

output "redis_private_host" {
  description = "Redis private host"
  value       = var.enable_redis ? digitalocean_database_cluster.redis[0].private_host : null
}

output "redis_port" {
  description = "Redis port"
  value       = var.enable_redis ? digitalocean_database_cluster.redis[0].port : null
}

output "redis_uri" {
  description = "Redis connection URI"
  value       = var.enable_redis ? digitalocean_database_cluster.redis[0].uri : null
  sensitive   = true
}

# Load Balancer
output "load_balancer_ip" {
  description = "Load balancer IP address"
  value       = digitalocean_loadbalancer.main.ip
}

output "load_balancer_id" {
  description = "Load balancer ID"
  value       = digitalocean_loadbalancer.main.id
}

output "application_url" {
  description = "Application URL"
  value       = "http://${digitalocean_loadbalancer.main.ip}"
}

# App Platform
output "app_platform_live_url" {
  description = "App Platform live URL"
  value       = var.use_app_platform ? digitalocean_app.main[0].live_url : null
}

output "app_platform_active_deployment_id" {
  description = "App Platform active deployment ID"
  value       = var.use_app_platform ? digitalocean_app.main[0].active_deployment_id : null
}

output "app_platform_default_ingress" {
  description = "App Platform default ingress URL"
  value       = var.use_app_platform ? digitalocean_app.main[0].default_ingress : null
}

# Droplets
output "droplet_ids" {
  description = "List of droplet IDs"
  value       = var.use_droplets ? digitalocean_droplet.app[*].id : []
}

output "droplet_ips" {
  description = "List of droplet IP addresses"
  value       = var.use_droplets ? digitalocean_droplet.app[*].ipv4_address : []
}

output "droplet_private_ips" {
  description = "List of droplet private IP addresses"
  value       = var.use_droplets ? digitalocean_droplet.app[*].ipv4_address_private : []
}

# Firewall
output "firewall_id" {
  description = "Firewall ID"
  value       = var.enable_firewall ? digitalocean_firewall.main[0].id : null
}

# General Information
output "project_name" {
  description = "Project name"
  value       = var.project_name
}

output "environment" {
  description = "Environment"
  value       = var.environment
}

# Cost Information
output "estimated_monthly_cost" {
  description = "Estimated monthly cost breakdown"
  value = {
    app_platform = var.use_app_platform ? "$${var.app_instance_count * 5 + var.helios_instance_count * 5 + var.celery_instance_count * 5}" : "0"
    droplets = var.use_droplets ? "$${var.droplet_count * 6}" : "0"  # Approximate for s-1vcpu-1gb
    database = var.enable_database ? "$15" : "0"  # Approximate for db-s-1vcpu-1gb
    redis = var.enable_redis ? "$15" : "0"        # Approximate for db-s-1vcpu-1gb
    load_balancer = "$12"                         # lb-small
    registry = "$0"                               # Starter tier is free
    total_estimate = "Approximately $48-78/month for basic setup"
  }
}