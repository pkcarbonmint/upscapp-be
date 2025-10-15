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

# Data sources
data "aws_availability_zones" "available" {
  state = "available"
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

  ingress {
    from_port   = 80
    to_port     = 80
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 443
    to_port     = 443
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

  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ecs.id]
  }

  # Allow access from EC2 instances
  ingress {
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = [aws_security_group.ec2.id]
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

  # Strapi port
  ingress {
    from_port   = 1337
    to_port     = 1337
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  # Docker containers ports
  ingress {
    from_port   = 8000
    to_port     = 8000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 8080
    to_port     = 8080
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
  }

  ingress {
    from_port   = 3000
    to_port     = 3000
    protocol    = "tcp"
    cidr_blocks = ["0.0.0.0/0"]
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

# RDS Instance (PostgreSQL) - Only deploy if no external RDS is provided
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

  skip_final_snapshot = var.rds_skip_final_snapshot
  final_snapshot_identifier = var.rds_skip_final_snapshot ? null : "${var.project_name}-db-final-snapshot"
  deletion_protection = var.rds_deletion_protection

  tags = {
    Name = "${var.project_name}-db"
  }
}

# ElastiCache Redis removed - using RDS for Redis functionality

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

# EC2 Instances
# Strapi EC2 Instance
resource "aws_instance" "strapi" {
  count = var.enable_ec2_instances ? 1 : 0

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.strapi_instance_type
  key_name               = var.strapi_key_name != "" ? var.strapi_key_name : null
  vpc_security_group_ids = [aws_security_group.ec2.id]
  subnet_id              = aws_subnet.public[0].id
  user_data = base64encode(templatefile("${path.module}/strapi-user-data.sh", {
    strapi_domain = var.strapi_domain
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

  ami                    = data.aws_ami.amazon_linux.id
  instance_type          = var.docker_instance_type
  key_name               = var.docker_key_name != "" ? var.docker_key_name : null
  vpc_security_group_ids = [aws_security_group.ec2.id]
  subnet_id              = aws_subnet.public[0].id
  user_data = base64encode(templatefile("${path.module}/docker-user-data.sh", {
    project_name = var.project_name
    strapi_ip    = var.enable_ec2_instances ? aws_instance.strapi[0].private_ip : ""
    rds_endpoint = var.external_rds_endpoint != "" ? var.external_rds_endpoint : (var.enable_rds && var.external_rds_endpoint == "" ? aws_db_instance.main[0].endpoint : "")
    rds_port     = var.external_rds_port
    rds_username = var.external_rds_username != "" ? var.external_rds_username : var.rds_username
    rds_password = var.external_rds_password != "" ? var.external_rds_password : var.rds_password
    rds_database = var.external_rds_database != "" ? var.external_rds_database : var.rds_database_name
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

# ECS Cluster
resource "aws_ecs_cluster" "main" {
  name = "${var.project_name}-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }

  tags = {
    Name = "${var.project_name}-cluster"
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

# ALB Target Groups
resource "aws_lb_target_group" "app" {
  name        = "${var.project_name}-app-tg"
  port        = 8000
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/healthcheck"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-app-tg"
  }
}

resource "aws_lb_target_group" "helios" {
  name        = "${var.project_name}-helios-tg"
  port        = 8080
  protocol    = "HTTP"
  vpc_id      = aws_vpc.main.id
  target_type = "ip"

  health_check {
    enabled             = true
    healthy_threshold   = 2
    interval            = 30
    matcher             = "200"
    path                = "/health"
    port                = "traffic-port"
    protocol            = "HTTP"
    timeout             = 5
    unhealthy_threshold = 2
  }

  tags = {
    Name = "${var.project_name}-helios-tg"
  }
}

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

# ALB Listeners
resource "aws_lb_listener" "main" {
  load_balancer_arn = aws_lb.main.arn
  port              = "80"
  protocol          = "HTTP"

  default_action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.frontend.arn
  }
}

resource "aws_lb_listener_rule" "app" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 100

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.app.arn
  }

  condition {
    path_pattern {
      values = ["/api/*", "/docs", "/redoc", "/healthcheck"]
    }
  }
}

resource "aws_lb_listener_rule" "helios" {
  listener_arn = aws_lb_listener.main.arn
  priority     = 200

  action {
    type             = "forward"
    target_group_arn = aws_lb_target_group.helios.arn
  }

  condition {
    path_pattern {
      values = ["/helios/*", "/health"]
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
          DATABASE_URL      = var.external_rds_endpoint != "" ? "postgresql://${var.external_rds_username}:${var.external_rds_password}@${var.external_rds_endpoint}:${var.external_rds_port}/${var.external_rds_database}" : (var.enable_rds ? "postgresql://${var.rds_username}:${var.rds_password}@${aws_db_instance.main[0].endpoint}:${aws_db_instance.main[0].port}/${var.rds_database_name}" : "")
          REDIS_URL         = "postgresql://${var.external_rds_username != "" ? var.external_rds_username : var.rds_username}:${var.external_rds_password != "" ? var.external_rds_password : var.rds_password}@${var.external_rds_endpoint != "" ? var.external_rds_endpoint : (var.enable_rds ? aws_db_instance.main[0].endpoint : "")}:${var.external_rds_port}/${var.external_rds_database != "" ? var.external_rds_database : var.rds_database_name}"
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
          DATABASE_URL = var.external_rds_endpoint != "" ? "postgresql://${var.external_rds_username}:${var.external_rds_password}@${var.external_rds_endpoint}:${var.external_rds_port}/${var.external_rds_database}" : (var.enable_rds ? "postgresql://${var.rds_username}:${var.rds_password}@${aws_db_instance.main[0].endpoint}:${aws_db_instance.main[0].port}/${var.rds_database_name}" : "")
          REDIS_URL    = "postgresql://${var.external_rds_username != "" ? var.external_rds_username : var.rds_username}:${var.external_rds_password != "" ? var.external_rds_password : var.rds_password}@${var.external_rds_endpoint != "" ? var.external_rds_endpoint : (var.enable_rds ? aws_db_instance.main[0].endpoint : "")}:${var.external_rds_port}/${var.external_rds_database != "" ? var.external_rds_database : var.rds_database_name}"
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

  load_balancer {
    target_group_arn = aws_lb_target_group.app.arn
    container_name   = "app"
    container_port   = 8000
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

# Data source to get AWS account ID
data "aws_caller_identity" "current" {}

# Docker Build and Push Resources
resource "null_resource" "docker_build_push_app" {
  count = var.enable_docker_build ? 1 : 0

  provisioner "local-exec" {
    command = <<EOT
      set -e
      
      # Get ECR login token using AWS CLI (if available) or use alternative method
      if command -v aws >/dev/null 2>&1; then
        echo "🔐 Logging into ECR using AWS CLI..."
        aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com
      else
        echo "⚠️  AWS CLI not found. You'll need to manually login to ECR."
        echo "   Run: aws ecr get-login-password --region ${var.aws_region} | docker login --username AWS --password-stdin ${data.aws_caller_identity.current.account_id}.dkr.ecr.${var.aws_region}.amazonaws.com"
        exit 1
      fi
      
      # Build the Docker image
      echo "🐳 Building app Docker image..."
      docker build -t ${aws_ecr_repository.app.repository_url}:${var.app_image_tag} -f ${var.docker_build_context}/${var.app_dockerfile_path} ${var.docker_build_context}
      
      # Push the Docker image to ECR
      echo "📤 Pushing app Docker image to ECR..."
      docker push ${aws_ecr_repository.app.repository_url}:${var.app_image_tag}
      
      echo "✅ App Docker image built and pushed successfully!"
    EOT
  }

  triggers = {
    app_dockerfile_hash = fileexists("${var.docker_build_context}/${var.app_dockerfile_path}") ? filemd5("${var.docker_build_context}/${var.app_dockerfile_path}") : "no-dockerfile"
    app_image_tag       = var.app_image_tag
    ecr_repo_url        = aws_ecr_repository.app.repository_url
  }

  depends_on = [aws_ecr_repository.app]
}

resource "null_resource" "docker_build_push_helios" {
  count = var.enable_docker_build ? 1 : 0

  provisioner "local-exec" {
    command = <<EOT
      set -e
      
      # Build the Helios Docker image
      echo "🐳 Building Helios Docker image..."
      docker build -t ${aws_ecr_repository.helios.repository_url}:${var.helios_image_tag} -f ${var.docker_build_context}/${var.helios_dockerfile_path} ${var.docker_build_context}
      
      # Push the Docker image to ECR
      echo "📤 Pushing Helios Docker image to ECR..."
      docker push ${aws_ecr_repository.helios.repository_url}:${var.helios_image_tag}
      
      echo "✅ Helios Docker image built and pushed successfully!"
    EOT
  }

  triggers = {
    helios_dockerfile_hash = fileexists("${var.docker_build_context}/${var.helios_dockerfile_path}") ? filemd5("${var.docker_build_context}/${var.helios_dockerfile_path}") : "no-dockerfile"
    helios_image_tag       = var.helios_image_tag
    ecr_repo_url           = aws_ecr_repository.helios.repository_url
  }

  depends_on = [aws_ecr_repository.helios, null_resource.docker_build_push_app]
}

resource "null_resource" "docker_build_push_frontend" {
  count = var.enable_docker_build ? 1 : 0

  provisioner "local-exec" {
    command = <<EOT
      set -e
      
      # Build the Frontend Docker image
      echo "🐳 Building Frontend Docker image..."
      docker build -t ${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag} -f ${var.docker_build_context}/${var.frontend_dockerfile_path} ${var.docker_build_context}
      
      # Push the Docker image to ECR
      echo "📤 Pushing Frontend Docker image to ECR..."
      docker push ${aws_ecr_repository.frontend.repository_url}:${var.frontend_image_tag}
      
      echo "✅ Frontend Docker image built and pushed successfully!"
    EOT
  }

  triggers = {
    frontend_dockerfile_hash = fileexists("${var.docker_build_context}/${var.frontend_dockerfile_path}") ? filemd5("${var.docker_build_context}/${var.frontend_dockerfile_path}") : "no-dockerfile"
    frontend_image_tag       = var.frontend_image_tag
    ecr_repo_url             = aws_ecr_repository.frontend.repository_url
  }

  depends_on = [aws_ecr_repository.frontend, null_resource.docker_build_push_helios]
}