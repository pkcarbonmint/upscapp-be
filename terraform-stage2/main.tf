terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
    null = {
      source  = "hashicorp/null"
      version = "~> 3.0"
    }
    tls = {
      source  = "hashicorp/tls"
      version = "~> 4.0"
    }
  }
}

# Configure the AWS Provider
provider "aws" {
  region = var.aws_region

  default_tags {
    tags = {
      Environment = var.environment
      Project     = var.project_name
      ManagedBy   = "terraform"
    }
  }
}

# Data source for Amazon Linux 2 AMI
data "aws_ami" "amazon_linux" {
  most_recent = true
  owners      = ["amazon"]

  filter {
    name   = "name"
    values = ["amzn2-ami-hvm-*-x86_64-gp2"]
  }

  filter {
    name   = "virtualization-type"
    values = ["hvm"]
  }
}

# Data source for availability zones
data "aws_availability_zones" "available" {
  state = "available"
}

# Data source for current AWS account
data "aws_caller_identity" "current" {}

# Local values for RDS configuration
locals {
  # Determine RDS endpoint based on deployment method
  rds_endpoint = var.external_rds_endpoint != "" ? var.external_rds_endpoint : (
    var.enable_rds && length(aws_db_instance.main) > 0 ? aws_db_instance.main[0].endpoint : ""
  )

  # Determine RDS port
  rds_port = var.external_rds_endpoint != "" ? var.external_rds_port : (
    var.enable_rds && length(aws_db_instance.main) > 0 ? aws_db_instance.main[0].port : 5432
  )

  # Determine RDS credentials
  rds_username = var.external_rds_username != "" ? var.external_rds_username : var.rds_username
  rds_password = var.external_rds_password != "" ? var.external_rds_password : var.rds_password
  rds_database = var.external_rds_database != "" ? var.external_rds_database : var.rds_database_name

  # Full database URL
  database_url = "postgresql://${local.rds_username}:${local.rds_password}@${local.rds_endpoint}:${local.rds_port}/${local.rds_database}"
}

# VPC
resource "aws_vpc" "main" {
  cidr_block           = var.vpc_cidr
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name = "${var.project_name}-vpc"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "main" {
  vpc_id = aws_vpc.main.id

  tags = {
    Name = "${var.project_name}-igw"
  }
}

# Public Subnets
resource "aws_subnet" "public" {
  count             = var.public_subnet_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  map_public_ip_on_launch = true

  tags = {
    Name = "${var.project_name}-public-subnet-${count.index + 1}"
    Type = "public"
  }
}

# Private Subnets
resource "aws_subnet" "private" {
  count             = var.private_subnet_count
  vpc_id            = aws_vpc.main.id
  cidr_block        = cidrsubnet(var.vpc_cidr, 8, count.index + var.public_subnet_count)
  availability_zone = data.aws_availability_zones.available.names[count.index]

  tags = {
    Name = "${var.project_name}-private-subnet-${count.index + 1}"
    Type = "private"
  }
}

# NAT Gateways
resource "aws_eip" "nat" {
  count  = var.enable_nat_gateway ? var.public_subnet_count : 0
  domain = "vpc"

  tags = {
    Name = "${var.project_name}-nat-eip-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

resource "aws_nat_gateway" "main" {
  count         = var.enable_nat_gateway ? var.public_subnet_count : 0
  allocation_id = aws_eip.nat[count.index].id
  subnet_id     = aws_subnet.public[count.index].id

  tags = {
    Name = "${var.project_name}-nat-gateway-${count.index + 1}"
  }

  depends_on = [aws_internet_gateway.main]
}

# Route Tables
resource "aws_route_table" "public" {
  vpc_id = aws_vpc.main.id

  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.main.id
  }

  tags = {
    Name = "${var.project_name}-public-rt"
  }
}

resource "aws_route_table" "private" {
  count  = var.enable_nat_gateway ? var.public_subnet_count : 0
  vpc_id = aws_vpc.main.id

  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.main[count.index].id
  }

  tags = {
    Name = "${var.project_name}-private-rt-${count.index + 1}"
  }
}

# Route Table Associations
resource "aws_route_table_association" "public" {
  count          = var.public_subnet_count
  subnet_id      = aws_subnet.public[count.index].id
  route_table_id = aws_route_table.public.id
}

resource "aws_route_table_association" "private" {
  count          = var.enable_nat_gateway ? var.private_subnet_count : 0
  subnet_id      = aws_subnet.private[count.index].id
  route_table_id = aws_route_table.private[count.index].id
}

# Security Groups
resource "aws_security_group" "alb" {
  name_prefix = "${var.project_name}-alb-"
  vpc_id      = aws_vpc.main.id

  # Allow HTTPS when SSL certificate is provided
  ingress {
    from_port   = 443
    to_port     = 443
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Allow HTTP when no SSL certificate is provided
  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-alb-sg"
  }
}

resource "aws_security_group" "ecs" {
  name_prefix = "${var.project_name}-ecs-"
  vpc_id      = aws_vpc.main.id

  ingress {
    from_port       = 0
    to_port         = 65535
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port = 0
    to_port   = 65535
    protocol  = "tcp"
    self      = true
  }

  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ecs-sg"
  }
}

resource "aws_security_group" "rds" {
  name_prefix = "${var.project_name}-rds-"
  vpc_id      = aws_vpc.main.id

  # Allow access from EC2 instances
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
  }

  # Allow access from ECS tasks
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  tags = {
    Name = "${var.project_name}-rds-sg"
  }
}

# Security Group for EC2 instances
resource "aws_security_group" "ec2" {
  name_prefix = "${var.project_name}-ec2-"
  vpc_id      = aws_vpc.main.id

  # SSH access
  ingress {
    from_port   = 22
    to_port     = 22
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Only allow internal access to Docker services from ALB/ECS
  ingress {
    from_port       = 1337
    to_port         = 1337
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 8000
    to_port         = 8000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 8080
    to_port         = 8080
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  ingress {
    from_port       = 3000
    to_port         = 3000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # GitHub webhook port - only accessible from ALB
  ingress {
    from_port       = 9000
    to_port         = 9000
    protocol        = "tcp"
    security_groups = [aws_security_group.alb.id]
  }

  # Allow all outbound traffic
  egress {
    from_port   = 0
    to_port     = 0
    protocol    = "-1"
    cidr_blocks = ["0.0.0.0/0"]
  }

  tags = {
    Name = "${var.project_name}-ec2-sg"
  }
}

# RDS Subnet Group
resource "aws_db_subnet_group" "main" {
  name       = "${var.project_name}-db-subnet-group"
  subnet_ids = aws_subnet.private[*].id

  tags = {
    Name = "${var.project_name}-db-subnet-group"
  }
}

# RDS Instance (PostgreSQL) - Only deploy if enabled and no external RDS is provided
resource "aws_db_instance" "main" {
  count = var.enable_rds && var.external_rds_endpoint == "" ? 1 : 0

  identifier             = "${var.project_name}-db"
  allocated_storage      = var.rds_allocated_storage
  max_allocated_storage  = var.rds_max_allocated_storage
  storage_type           = "gp2"
  engine                 = "postgres"
  engine_version         = var.rds_engine_version
  instance_class         = var.rds_instance_class
  db_name                = var.rds_database_name
  username               = var.rds_username
  password               = var.rds_password
  parameter_group_name   = "default.postgres15"
  db_subnet_group_name   = aws_db_subnet_group.main.name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = var.rds_backup_retention_period
  backup_window           = var.rds_backup_window
  maintenance_window      = var.rds_maintenance_window

  skip_final_snapshot       = var.rds_skip_final_snapshot
  final_snapshot_identifier = var.rds_skip_final_snapshot ? null : "${var.project_name}-db-final-snapshot"
  deletion_protection       = var.rds_deletion_protection

  tags = {
    Name = "${var.project_name}-db"
  }
}

# ECR Repository
resource "aws_ecr_repository" "app" {
  name                 = "${var.project_name}-app"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-app"
  }
}

resource "aws_ecr_repository" "helios" {
  name                 = "${var.project_name}-helios"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-helios"
  }
}

resource "aws_ecr_repository" "frontend" {
  name                 = "${var.project_name}-frontend"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-frontend"
  }
}

# New ECR repositories for stage2 apps
resource "aws_ecr_repository" "onboarding_ui" {
  name                 = "${var.project_name}-onboarding-ui"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-onboarding-ui"
  }
}

resource "aws_ecr_repository" "faculty_ui" {
  name                 = "${var.project_name}-faculty-ui"
  image_tag_mutability = "MUTABLE"

  image_scanning_configuration {
    scan_on_push = true
  }

  tags = {
    Name = "${var.project_name}-faculty-ui"
  }
}

# EC2 Instances
# Strapi EC2 Instance
resource "aws_instance" "strapi" {
  count = var.enable_ec2_instances ? 1 : 0

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.strapi_instance_type
  key_name               = var.strapi_key_name != "" ? var.strapi_key_name : null
  vpc_security_group_ids = [aws_security_group.ec2.id]
  subnet_id              = aws_subnet.private[0].id
  user_data = base64encode(templatefile("${path.module}/strapi-user-data.sh", {
    strapi_domain         = var.strapi_domain
    github_token          = var.github_token
    github_repository_url = var.github_token != "" ? "https://${var.github_token}@github.com/pkcarbonmint/upscapp-be.git" : var.github_repository_url
    github_branch         = var.github_branch
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = var.strapi_volume_size
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-strapi"
    Type = "strapi"
  }
}

# Docker Containers EC2 Instance
resource "aws_instance" "docker" {
  count = var.enable_ec2_instances ? 1 : 0

  ami                         = data.aws_ami.amazon_linux.id
  instance_type               = var.docker_instance_type
  key_name                    = var.docker_key_name != "" ? var.docker_key_name : null
  vpc_security_group_ids      = [aws_security_group.ec2.id]
  subnet_id                   = aws_subnet.public[0].id
  associate_public_ip_address = true
  user_data = base64encode(templatefile("${path.module}/docker-user-data-improved.sh", {
    project_name          = var.project_name
    environment           = var.environment
    strapi_ip             = var.enable_ec2_instances ? aws_instance.strapi[0].private_ip : ""
    rds_endpoint          = local.rds_endpoint
    rds_port              = local.rds_port
    rds_username          = local.rds_username
    rds_password          = local.rds_password
    rds_database          = local.rds_database
    github_token          = var.github_token
    github_repository_url = var.github_token != "" ? "https://${var.github_token}@github.com/pkcarbonmint/upscapp-be.git" : var.github_repository_url
    github_branch         = var.github_branch
    enable_auto_deploy    = var.enable_auto_deploy
    webhook_secret        = var.webhook_secret
    GITHUB_TOKEN          = var.github_token
    GITHUB_REPOSITORY_URL = var.github_token != "" ? "https://${var.github_token}@github.com/pkcarbonmint/upscapp-be.git" : var.github_repository_url
    GITHUB_BRANCH         = var.github_branch
    alb_dns_name          = aws_lb.main.dns_name
    domain_name           = var.domain_name
  }))

  root_block_device {
    volume_type = "gp3"
    volume_size = var.docker_volume_size
    encrypted   = true
  }

  tags = {
    Name = "${var.project_name}-docker"
    Type = "docker"
  }

  depends_on = [aws_instance.strapi]
}

# CloudWatch Log Group for Docker Instance
resource "aws_cloudwatch_log_group" "docker_instance" {
  count = var.enable_ec2_instances ? 1 : 0
  
  name              = "/aws/ec2/${var.project_name}-docker"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-docker-logs"
  }
}

# CloudWatch Log Group for Strapi Instance
resource "aws_cloudwatch_log_group" "strapi_instance" {
  count = var.enable_ec2_instances ? 1 : 0
  
  name              = "/aws/ec2/${var.project_name}-strapi"
  retention_in_days = 7

  tags = {
    Name = "${var.project_name}-strapi-logs"
  }
}

# Application Load Balancer
resource "aws_lb" "main" {
  name               = "${var.project_name}-alb"
  internal           = false
  load_balancer_type = "application"
  security_groups    = [aws_security_group.alb.id]
  subnets            = aws_subnet.public[*].id

  enable_deletion_protection = var.alb_deletion_protection

  tags = {
    Name = "${var.project_name}-alb"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  tags = {
    Name = "${var.project_name}-cluster"
  }
}

# SSL Certificate using AWS Certificate Manager
resource "aws_acm_certificate" "main" {
  count = var.domain_name != "" ? 1 : 0

  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }

  tags = {
    Name = "${var.project_name}-ssl-cert"
  }
}

# Create a self-signed certificate for ALB testing
resource "tls_private_key" "alb_test" {
  count = var.domain_name == "" && var.certificate_arn == "" && var.enable_https ? 1 : 0

  algorithm = "RSA"
  rsa_bits  = 2048
}

resource "tls_self_signed_cert" "alb_test" {
  count = var.domain_name == "" && var.certificate_arn == "" && var.enable_https ? 1 : 0

  private_key_pem = tls_private_key.alb_test[0].private_key_pem

  subject {
    common_name  = "*.elb.amazonaws.com"
    organization = "Amazon Web Services"
  }

  validity_period_hours = 8760 # 1 year

  allowed_uses = [
    "key_encipherment",
    "digital_signature",
    "server_auth",
  ]
}

resource "aws_acm_certificate" "alb_test" {
  count = var.domain_name == "" && var.certificate_arn == "" && var.enable_https ? 1 : 0

  certificate_body = tls_self_signed_cert.alb_test[0].cert_pem
  private_key      = tls_private_key.alb_test[0].private_key_pem

  tags = {
    Name = "${var.project_name}-alb-test-cert"
  }
}

# Route53 DNS validation records for the certificate
resource "aws_route53_record" "cert_validation" {
  for_each = var.domain_name != "" && var.route53_zone_id != "" ? {
    for dvo in aws_acm_certificate.main[0].domain_validation_options : dvo.domain_name => {
      name   = dvo.resource_record_name
      record = dvo.resource_record_value
      type   = dvo.resource_record_type
    }
  } : {}

  allow_overwrite = true
  name            = each.value.name
  records         = [each.value.record]
  ttl             = 60
  type            = each.value.type
  zone_id         = var.route53_zone_id
}

# Certificate validation
resource "aws_acm_certificate_validation" "main" {
  count = var.domain_name != "" && var.route53_zone_id != "" ? 1 : 0

  certificate_arn         = aws_acm_certificate.main[0].arn
  validation_record_fqdns = [for record in aws_route53_record.cert_validation : record.fqdn]

  timeouts {
    create = "5m"
  }
}

# ALB Target Groups
resource "aws_lb_target_group" "frontend" {
  name        = "${var.project_name}-frontend-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-frontend-tg"
  }
}

# Target groups for new stage2 apps
resource "aws_lb_target_group" "onboarding_ui" {
  name        = "${var.project_name}-onboarding-ui-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-onboarding-ui-tg"
  }
}

resource "aws_lb_target_group" "faculty_ui" {
  name        = "${var.project_name}-faculty-ui-tg"
  port        = 80
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-faculty-ui-tg"
  }
}

# ALB Listeners
resource "aws_lb_listener" "main" {
  count = var.domain_name != "" || var.certificate_arn != "" || var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "443"
  protocol          = "HTTPS"
  ssl_policy        = "ELBSecurityPolicy-TLS-1-2-2017-01"
  certificate_arn   = var.domain_name != "" ? aws_acm_certificate.main[0].arn : (var.certificate_arn != "" ? var.certificate_arn : aws_acm_certificate.alb_test[0].arn)

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# HTTP listener for when no SSL certificate is provided
resource "aws_lb_listener" "http" {
  count = var.domain_name == "" && var.certificate_arn == "" && !var.enable_https ? 1 : 0

  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

# Listener rules for new apps
resource "aws_lb_listener_rule" "onboarding_ui" {
  count = var.domain_name != "" || var.certificate_arn != "" || var.enable_https ? 1 : 0

  listener_arn = aws_lb_listener.main[0].arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.onboarding_ui.arn
  }

  condition {
    path_pattern {
      values = ["/onboarding*"]
    }
  }
}

resource "aws_lb_listener_rule" "faculty_ui" {
  count = var.domain_name != "" || var.certificate_arn != "" || var.enable_https ? 1 : 0

  listener_arn = aws_lb_listener.main[0].arn
  priority     = 101

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.faculty_ui.arn
  }

  condition {
    path_pattern {
      values = ["/faculty*"]
    }
  }
}

# IAM Role for ECS Task Execution
resource "aws_iam_role" "ecs_task_execution_role" {
  name = "${var.project_name}-ecs-task-execution-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-execution-role"
  }
}

resource "aws_iam_role_policy_attachment" "ecs_task_execution_role_policy" {
  role       = aws_iam_role.ecs_task_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy"
}

# IAM Role for ECS Tasks
resource "aws_iam_role" "ecs_task_role" {
  name = "${var.project_name}-ecs-task-role"

  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = "ecs-tasks.amazonaws.com"
        }
      }
    ]
  })

  tags = {
    Name = "${var.project_name}-ecs-task-role"
  }
}

# CloudWatch Log Groups
resource "aws_cloudwatch_log_group" "ecs" {
  name              = "/ecs/${var.project_name}"
  retention_in_days = var.cloudwatch_log_retention_days

  tags = {
    Name = "${var.project_name}-ecs-logs"
  }
}

# ECS Task Definitions
resource "aws_ecs_task_definition" "app" {
  family                   = "${var.project_name}-app"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_app_cpu
  memory                   = var.ecs_app_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "app"
      image = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"

      portMappings = [
        {
          containerPort = 8000
          protocol      = "tcp"
        }
      ]

      environment = [
        for key, value in merge(var.app_environment_variables, {
          DATABASE_URL      = local.database_url
          REDIS_URL         = local.database_url
          HELIOS_SERVER_URL = "http://localhost:8080"
          CMS_BASE_URL      = var.enable_ec2_instances ? "http://${aws_instance.strapi[0].private_ip}:1337" : ""
          }) : {
          name  = key
          value = tostring(value)
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "app"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8000/healthcheck || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    },
    {
      name  = "helios"
      image = "${aws_ecr_repository.helios.repository_url}:${var.helios_image_tag}"

      portMappings = [
        {
          containerPort = 8080
          protocol      = "tcp"
        }
      ]

      environment = [
        {
          name  = "PORT"
          value = "8080"
        },
        {
          name  = "ENVIRONMENT"
          value = var.environment
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "helios"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "curl -f http://localhost:8080/health || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 60
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-app-task"
  }
}

resource "aws_ecs_task_definition" "frontend" {
  family                   = "${var.project_name}-frontend"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_frontend_cpu
  memory                   = var.ecs_frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "frontend"
      image = "${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag}"

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "frontend"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-frontend-task"
  }
}

# Task definitions for new stage2 apps
resource "aws_ecs_task_definition" "onboarding_ui" {
  family                   = "${var.project_name}-onboarding-ui"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_frontend_cpu
  memory                   = var.ecs_frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "onboarding-ui"
      image = "${aws_ecr_repository.onboarding_ui.repository_url}:${var.onboarding_ui_image_tag}"

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "onboarding-ui"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-onboarding-ui-task"
  }
}

resource "aws_ecs_task_definition" "faculty_ui" {
  family                   = "${var.project_name}-faculty-ui"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_frontend_cpu
  memory                   = var.ecs_frontend_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "faculty-ui"
      image = "${aws_ecr_repository.faculty_ui.repository_url}:${var.faculty_ui_image_tag}"

      portMappings = [
        {
          containerPort = 80
          protocol      = "tcp"
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "faculty-ui"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "wget --quiet --tries=1 --spider http://localhost/ || exit 1"]
        interval    = 30
        timeout     = 5
        retries     = 3
        startPeriod = 30
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-faculty-ui-task"
  }
}

resource "aws_ecs_task_definition" "celery" {
  family                   = "${var.project_name}-celery"
  network_mode             = "awsvpc"
  requires_compatibilities = ["FARGATE"]
  cpu                      = var.ecs_celery_cpu
  memory                   = var.ecs_celery_memory
  execution_role_arn       = aws_iam_role.ecs_task_execution_role.arn
  task_role_arn            = aws_iam_role.ecs_task_role.arn

  container_definitions = jsonencode([
    {
      name  = "celery-worker"
      image = "${aws_ecr_repository.app.repository_url}:${var.app_image_tag}"

      command = ["celery", "-A", "src.tasks.celery_tasks", "worker", "-l", "INFO", "-E", "--concurrency=2"]

      environment = [
        for key, value in merge(var.app_environment_variables, {
          DATABASE_URL = local.database_url
          REDIS_URL    = local.database_url
          }) : {
          name  = key
          value = tostring(value)
        }
      ]

      logConfiguration = {
        logDriver = "awslogs"
        options = {
          awslogs-group         = aws_cloudwatch_log_group.ecs.name
          awslogs-region        = var.aws_region
          awslogs-stream-prefix = "celery"
        }
      }

      healthCheck = {
        command     = ["CMD-SHELL", "celery -A src.tasks.celery_tasks inspect ping || exit 1"]
        interval    = 60
        timeout     = 10
        retries     = 3
        startPeriod = 120
      }

      essential = true
    }
  ])

  tags = {
    Name = "${var.project_name}-celery-task"
  }
}

# ECS Services
resource "aws_ecs_service" "app" {
  name            = "${var.project_name}-app"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.app.arn
  desired_count   = var.ecs_app_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-app-service"
  }
}

resource "aws_ecs_service" "frontend" {
  name            = "${var.project_name}-frontend"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.frontend.arn
  desired_count   = var.ecs_frontend_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.frontend.arn
    container_name   = "frontend"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-frontend-service"
  }
}

# ECS Services for new stage2 apps
resource "aws_ecs_service" "onboarding_ui" {
  name            = "${var.project_name}-onboarding-ui"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.onboarding_ui.arn
  desired_count   = var.ecs_frontend_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.onboarding_ui.arn
    container_name   = "onboarding-ui"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-onboarding-ui-service"
  }
}

resource "aws_ecs_service" "faculty_ui" {
  name            = "${var.project_name}-faculty-ui"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.faculty_ui.arn
  desired_count   = var.ecs_frontend_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  load_balancer {
    target_group_arn = aws_lb_target_group.faculty_ui.arn
    container_name   = "faculty-ui"
    container_port   = 80
  }

  depends_on = [aws_lb_listener.main]

  tags = {
    Name = "${var.project_name}-faculty-ui-service"
  }
}

resource "aws_ecs_service" "celery" {
  name            = "${var.project_name}-celery"
  cluster         = aws_ecs_cluster.main.id
  task_definition = aws_ecs_task_definition.celery.arn
  desired_count   = var.ecs_celery_count
  launch_type     = "FARGATE"

  network_configuration {
    security_groups  = [aws_security_group.ecs.id]
    subnets          = aws_subnet.private[*].id
    assign_public_ip = false
  }

  tags = {
    Name = "${var.project_name}-celery-service"
  }
}

# S3 Buckets for Static Assets
resource "aws_s3_bucket" "assets" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = "${var.project_name}-assets"

  tags = {
    Name = "${var.project_name}-assets"
  }
}

resource "aws_s3_bucket" "images" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = "${var.project_name}-images"

  tags = {
    Name = "${var.project_name}-images"
  }
}

resource "aws_s3_bucket_versioning" "assets" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = aws_s3_bucket.assets[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_versioning" "images" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = aws_s3_bucket.images[0].id
  versioning_configuration {
    status = "Enabled"
  }
}

resource "aws_s3_bucket_public_access_block" "assets" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = aws_s3_bucket.assets[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_public_access_block" "images" {
  count  = var.enable_s3_buckets ? 1 : 0
  bucket = aws_s3_bucket.images[0].id

  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

# CloudFront Distribution
resource "aws_cloudfront_distribution" "main" {
  count = var.enable_cloudfront ? 1 : 0

  origin {
    domain_name = aws_lb.main.dns_name
    origin_id   = "ALB-${var.project_name}"

    custom_origin_config {
      http_port              = 80
      https_port             = 443
      origin_protocol_policy = "https-only"
      origin_ssl_protocols   = ["TLSv1.2"]
    }
  }

  enabled             = true
  is_ipv6_enabled     = true
  comment             = "CloudFront distribution for ${var.project_name}"
  default_root_object = "index.html"

  default_cache_behavior {
    allowed_methods        = ["DELETE", "GET", "HEAD", "OPTIONS", "PATCH", "POST", "PUT"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = true
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 3600
    max_ttl     = 86400
  }

  # Cache behavior for static assets
  ordered_cache_behavior {
    path_pattern           = "/static/*"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    target_origin_id       = "ALB-${var.project_name}"
    compress               = true
    viewer_protocol_policy = "redirect-to-https"

    forwarded_values {
      query_string = false
      cookies {
        forward = "none"
      }
    }

    min_ttl     = 0
    default_ttl = 86400
    max_ttl     = 31536000
  }

  price_class = var.cloudfront_price_class

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = var.domain_name == "" ? true : false
    acm_certificate_arn            = var.domain_name != "" ? aws_acm_certificate.main[0].arn : null
    ssl_support_method             = var.domain_name != "" ? "sni-only" : null
    minimum_protocol_version       = var.domain_name != "" ? "TLSv1.2_2021" : null
  }

  aliases = var.domain_name != "" ? [var.domain_name] : []

  tags = {
    Name = "${var.project_name}-cloudfront"
  }
}
