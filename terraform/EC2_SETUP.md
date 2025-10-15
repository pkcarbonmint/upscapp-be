# EC2 Infrastructure Setup

This document describes the updated Terraform configuration that deploys the application on EC2 instances instead of ECS Fargate.

## Architecture Overview

The new setup includes:

1. **Strapi EC2 Instance**: Runs Strapi CMS with PostgreSQL
2. **Docker EC2 Instance**: Runs all Docker containers (app, helios, frontend, celery) using the `docker-build.sh` script
3. **Conditional RDS**: Only deploys RDS if no external RDS is provided
4. **No ElastiCache**: Uses RDS for Redis functionality instead

## Key Changes

### 1. EC2 Instances
- **Strapi Instance**: `t3.medium` with 20GB storage
- **Docker Instance**: `t3.large` with 30GB storage
- Both instances use Amazon Linux 2 AMI
- Security groups allow necessary ports (22, 1337, 8000, 8080, 3000)

### 2. RDS Configuration
- RDS is only deployed if `external_rds_endpoint` is empty
- If external RDS is provided, all services use the external database
- Supports both Terraform-managed and external RDS

### 3. Redis Replacement
- ElastiCache Redis has been removed
- All services now use RDS for Redis functionality
- Celery workers use PostgreSQL instead of Redis

### 4. Strapi Integration
- Strapi runs on port 1337
- Python app connects to Strapi via `CMS_BASE_URL` environment variable
- Strapi has its own PostgreSQL database

## Configuration

### Required Variables

Add these to your `terraform.tfvars`:

```hcl
# EC2 Configuration
enable_ec2_instances = true
strapi_instance_type = "t3.medium"
docker_instance_type = "t3.large"

# Key pairs (create in AWS console first)
strapi_key_name = "your-strapi-key"
docker_key_name = "your-docker-key"

# External RDS (if using external RDS)
external_rds_endpoint = "your-rds-endpoint.amazonaws.com"
external_rds_username = "your-username"
external_rds_password = "your-password"
external_rds_database = "your-database"
```

### Optional Variables

```hcl
# Strapi domain (for custom domain)
strapi_domain = "cms.yourdomain.com"

# Volume sizes
strapi_volume_size = 20
docker_volume_size = 30
```

## Deployment Steps

1. **Create Key Pairs** (if using SSH access):
   ```bash
   aws ec2 create-key-pair --key-name your-strapi-key --query 'KeyMaterial' --output text > your-strapi-key.pem
   aws ec2 create-key-pair --key-name your-docker-key --query 'KeyMaterial' --output text > your-docker-key.pem
   ```

2. **Update terraform.tfvars** with your configuration

3. **Deploy Infrastructure**:
   ```bash
   cd terraform
   terraform init
   terraform plan
   terraform apply
   ```

4. **Access Services**:
   - Strapi CMS: `http://<strapi-instance-ip>:1337`
   - Python API: `http://<docker-instance-ip>:8000`
   - Helios: `http://<docker-instance-ip>:8080`
   - Frontend: `http://<docker-instance-ip>:3000`
   - Celery Flower: `http://<docker-instance-ip>:5555`

## Docker Build Integration

The Docker EC2 instance is configured to:
1. Clone your repository
2. Run `./docker-build.sh` to build all containers
3. Start services with `docker-compose up -d`

The `docker-build.sh` script will:
- Build the base image with pnpm setup
- Build all services (app, helios, frontend)
- Run interface validation
- Start all containers

## Environment Variables

The Docker containers receive these environment variables:

```bash
# Database
DATABASE_URL=postgresql://username:password@endpoint:port/database
REDIS_URL=postgresql://username:password@endpoint:port/database  # Using RDS

# Strapi Integration
CMS_BASE_URL=http://<strapi-ip>:1337

# Application
ENVIRONMENT=PRODUCTION
HELIOS_SERVER_URL=http://helios:8080
```

## Security Considerations

1. **Security Groups**: Configured to allow necessary ports only
2. **SSH Access**: Use key pairs for secure access
3. **Database**: RDS is in private subnets with restricted access
4. **Encryption**: EBS volumes are encrypted

## Monitoring

- CloudWatch logs are configured for all services
- Health checks are implemented for all containers
- Systemd services ensure automatic restart on reboot

## Troubleshooting

### Common Issues

1. **Docker Build Fails**:
   - Check if `docker-build.sh` exists and is executable
   - Verify all dependencies are installed
   - Check Docker daemon is running

2. **Strapi Not Accessible**:
   - Verify security group allows port 1337
   - Check Strapi container is running: `docker ps`
   - Check logs: `docker logs strapi`

3. **Database Connection Issues**:
   - Verify RDS endpoint is correct
   - Check security groups allow database access
   - Verify credentials in environment variables

### Logs

- EC2 instance logs: `/var/log/user-data.log`
- Docker logs: `docker logs <container-name>`
- Systemd service logs: `journalctl -u strapi.service` or `journalctl -u docker-app.service`

## Migration from ECS

To migrate from the previous ECS setup:

1. Backup your data
2. Update Terraform configuration
3. Deploy new infrastructure
4. Migrate data to new setup
5. Update DNS records
6. Destroy old ECS resources

## Cost Optimization

- Use appropriate instance types for your workload
- Consider reserved instances for production
- Monitor and adjust volume sizes as needed
- Use spot instances for non-critical workloads
