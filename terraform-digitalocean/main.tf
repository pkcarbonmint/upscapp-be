terraform {
  required_version = ">= 1.0"
  required_providers {
    digitalocean = {
      source  = "digitalocean/digitalocean"
      version = "~> 2.0"
    }
  }
}

# Configure the DigitalOcean Provider
provider "digitalocean" {
  token = var.do_token
}

# Data sources
data "digitalocean_sizes" "available" {}
data "digitalocean_regions" "available" {}

# VPC
resource "digitalocean_vpc" "main" {
  name     = "${var.project_name}-vpc"
  region   = var.do_region
  ip_range = var.vpc_cidr

  count = var.enable_vpc ? 1 : 0
}

# Container Registry
resource "digitalocean_container_registry" "main" {
  name                   = var.project_name
  subscription_tier_slug = var.registry_tier
  region                 = var.do_region
}

# Database Cluster (PostgreSQL)
resource "digitalocean_database_cluster" "main" {
  count = var.enable_database ? 1 : 0

  name       = "${var.project_name}-db"
  engine     = "pg"
  version    = var.database_version
  size       = var.database_size
  region     = var.do_region
  node_count = var.database_node_count

  private_network_uuid = var.enable_vpc ? digitalocean_vpc.main[0].id : null

  tags = [
    var.project_name,
    var.environment
  ]
}

# Database (if cluster not used)
resource "digitalocean_database_db" "main" {
  count      = var.enable_database && var.database_node_count == 1 ? 1 : 0
  cluster_id = digitalocean_database_cluster.main[0].id
  name       = var.database_name
}

# Database User
resource "digitalocean_database_user" "main" {
  count      = var.enable_database ? 1 : 0
  cluster_id = digitalocean_database_cluster.main[0].id
  name       = var.database_username
}

# Redis Database
resource "digitalocean_database_cluster" "redis" {
  count = var.enable_redis ? 1 : 0

  name       = "${var.project_name}-redis"
  engine     = "redis"
  version    = var.redis_version
  size       = var.redis_size
  region     = var.do_region
  node_count = 1

  private_network_uuid = var.enable_vpc ? digitalocean_vpc.main[0].id : null

  tags = [
    var.project_name,
    var.environment,
    "redis"
  ]
}

# Load Balancer
resource "digitalocean_loadbalancer" "main" {
  name   = "${var.project_name}-lb"
  region = var.do_region
  size   = var.load_balancer_size

  vpc_uuid = var.enable_vpc ? digitalocean_vpc.main[0].id : null

  forwarding_rule {
    entry_protocol  = "http"
    entry_port      = 80
    target_protocol = "http"
    target_port     = 8000
    certificate_name = var.ssl_certificate_name != "" ? var.ssl_certificate_name : null
  }

  # HTTPS forwarding rule (optional)
  dynamic "forwarding_rule" {
    for_each = var.ssl_certificate_name != "" ? [1] : []
    content {
      entry_protocol   = "https"
      entry_port       = 443
      target_protocol  = "http"
      target_port      = 8000
      certificate_name = var.ssl_certificate_name
    }
  }

  healthcheck {
    protocol = "http"
    port     = 8000
    path     = "/healthcheck"
  }

  droplet_ids = []  # Will be populated by app platform or droplets
}

# App Platform Specification
resource "digitalocean_app" "main" {
  count = var.use_app_platform ? 1 : 0

  spec {
    name   = var.project_name
    region = var.do_region

    # Main Application Service
    service {
      name               = "app"
      instance_count     = var.app_instance_count
      instance_size_slug = var.app_instance_size

      image {
        registry_type = "DOCR"
        registry      = digitalocean_container_registry.main.name
        repository    = "app"
        tag           = var.app_image_tag
      }

      http_port = 8000

      health_check {
        http_path = "/healthcheck"
      }

      # Environment variables
      dynamic "env" {
        for_each = merge(
          var.app_environment_variables,
          var.enable_database ? {
            DATABASE_URL = "postgresql://${digitalocean_database_user.main[0].name}:${digitalocean_database_user.main[0].password}@${digitalocean_database_cluster.main[0].private_host}:${digitalocean_database_cluster.main[0].port}/${var.database_name}?sslmode=require"
          } : {},
          var.enable_redis ? {
            REDIS_URL = "redis://${digitalocean_database_cluster.redis[0].private_host}:${digitalocean_database_cluster.redis[0].port}"
          } : {}
        )
        content {
          key   = env.key
          value = env.value
          scope = "RUN_AND_BUILD_TIME"
        }
      }
    }

    # Helios Service
    service {
      name               = "helios"
      instance_count     = var.helios_instance_count
      instance_size_slug = var.helios_instance_size

      image {
        registry_type = "DOCR"
        registry      = digitalocean_container_registry.main.name
        repository    = "helios"
        tag           = var.helios_image_tag
      }

      http_port = 8080

      health_check {
        http_path = "/health"
      }

      env {
        key   = "PORT"
        value = "8080"
        scope = "RUN_AND_BUILD_TIME"
      }

      env {
        key   = "ENVIRONMENT"
        value = var.environment
        scope = "RUN_AND_BUILD_TIME"
      }
    }

    # Frontend Service
    static_site {
      name         = "frontend"
      build_command = "npm run build"
      output_dir   = "/dist"

      github {
        repo           = var.github_repo
        branch         = var.github_branch
        deploy_on_push = var.auto_deploy_on_push
      }

      dynamic "env" {
        for_each = var.frontend_environment_variables
        content {
          key   = env.key
          value = env.value
          scope = "BUILD_TIME"
        }
      }
    }

    # Celery Worker
    worker {
      name               = "celery"
      instance_count     = var.celery_instance_count
      instance_size_slug = var.celery_instance_size

      image {
        registry_type = "DOCR"
        registry      = digitalocean_container_registry.main.name
        repository    = "app"  # Same image as app
        tag           = var.app_image_tag
      }

      run_command = "celery -A src.tasks.celery_tasks worker -l INFO -E --concurrency=2"

      # Environment variables (same as app)
      dynamic "env" {
        for_each = merge(
          var.app_environment_variables,
          var.enable_database ? {
            DATABASE_URL = "postgresql://${digitalocean_database_user.main[0].name}:${digitalocean_database_user.main[0].password}@${digitalocean_database_cluster.main[0].private_host}:${digitalocean_database_cluster.main[0].port}/${var.database_name}?sslmode=require"
          } : {},
          var.enable_redis ? {
            REDIS_URL = "redis://${digitalocean_database_cluster.redis[0].private_host}:${digitalocean_database_cluster.redis[0].port}"
          } : {}
        )
        content {
          key   = env.key
          value = env.value
          scope = "RUN_AND_BUILD_TIME"
        }
      }
    }

    # Domain (optional)
    dynamic "domain" {
      for_each = var.custom_domain != "" ? [var.custom_domain] : []
      content {
        name = domain.value
        type = "PRIMARY"
      }
    }
  }
}

# Droplet-based deployment (alternative to App Platform)
resource "digitalocean_droplet" "app" {
  count = var.use_droplets ? var.droplet_count : 0

  image    = var.droplet_image
  name     = "${var.project_name}-app-${count.index + 1}"
  region   = var.do_region
  size     = var.droplet_size
  ssh_keys = var.ssh_key_ids

  vpc_uuid = var.enable_vpc ? digitalocean_vpc.main[0].id : null

  user_data = templatefile("${path.module}/user_data.sh", {
    project_name = var.project_name
    registry_endpoint = digitalocean_container_registry.main.endpoint
    app_image = "${digitalocean_container_registry.main.endpoint}/app:${var.app_image_tag}"
    helios_image = "${digitalocean_container_registry.main.endpoint}/helios:${var.helios_image_tag}"
    database_url = var.enable_database ? "postgresql://${digitalocean_database_user.main[0].name}:${digitalocean_database_user.main[0].password}@${digitalocean_database_cluster.main[0].private_host}:${digitalocean_database_cluster.main[0].port}/${var.database_name}?sslmode=require" : ""
    redis_url = var.enable_redis ? "redis://${digitalocean_database_cluster.redis[0].private_host}:${digitalocean_database_cluster.redis[0].port}" : ""
  })

  tags = [
    var.project_name,
    var.environment,
    "app"
  ]
}

# Add droplets to load balancer
resource "digitalocean_loadbalancer_droplet_ids" "main" {
  count = var.use_droplets ? 1 : 0

  loadbalancer_id = digitalocean_loadbalancer.main.id
  droplet_ids     = digitalocean_droplet.app[*].id
}

# Firewall
resource "digitalocean_firewall" "main" {
  count = var.enable_firewall ? 1 : 0

  name = "${var.project_name}-firewall"

  droplet_ids = var.use_droplets ? digitalocean_droplet.app[*].id : []

  # SSH
  inbound_rule {
    protocol         = "tcp"
    port_range       = "22"
    source_addresses = var.ssh_allowed_ips
  }

  # HTTP
  inbound_rule {
    protocol         = "tcp"
    port_range       = "80"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # HTTPS
  inbound_rule {
    protocol         = "tcp"
    port_range       = "443"
    source_addresses = ["0.0.0.0/0", "::/0"]
  }

  # Application port
  inbound_rule {
    protocol         = "tcp"
    port_range       = "8000"
    source_load_balancer_uids = [digitalocean_loadbalancer.main.id]
  }

  # Helios port
  inbound_rule {
    protocol         = "tcp"
    port_range       = "8080"
    source_load_balancer_uids = [digitalocean_loadbalancer.main.id]
  }

  # All outbound traffic
  outbound_rule {
    protocol              = "tcp"
    port_range            = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "udp"
    port_range            = "all"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }

  outbound_rule {
    protocol              = "icmp"
    destination_addresses = ["0.0.0.0/0", "::/0"]
  }
}