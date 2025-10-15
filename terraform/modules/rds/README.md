# RDS Module

This module creates an RDS PostgreSQL instance that can be deployed independently from the main infrastructure.

## Features

- **Independent Deployment**: Can be deployed separately from other infrastructure components
- **Flexible VPC Support**: Can use existing VPC/subnets or create new ones
- **Security Groups**: Configurable access control via security groups and CIDR blocks
- **Backup & Maintenance**: Configurable backup and maintenance windows
- **Monitoring**: Optional Performance Insights and Enhanced Monitoring
- **Encryption**: Storage encryption support

## Usage

### Standalone Deployment (New VPC)

```hcl
module "rds" {
  source = "./modules/rds"

  project_name = "myapp"
  password     = "secure-password-here"
  
  # Optional: Configure instance
  instance_class     = "db.t3.small"
  allocated_storage  = 50
  
  # Optional: Configure access
  allowed_cidr_blocks = ["10.0.0.0/16"]
  
  tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

### Integration with Existing VPC

```hcl
module "rds" {
  source = "./modules/rds"

  project_name = "myapp"
  password     = "secure-password-here"
  
  # Use existing VPC
  vpc_id                      = "vpc-12345678"
  allowed_security_group_ids  = ["sg-12345678", "sg-87654321"]
  
  tags = {
    Environment = "production"
    Project     = "myapp"
  }
}
```

## Outputs

The module provides comprehensive outputs for integration with other infrastructure:

- `db_instance_endpoint` - Database connection endpoint
- `db_instance_port` - Database port
- `database_url` - Full connection URL (sensitive)
- `security_group_id` - RDS security group ID
- `connection_info` - Connection details object

## Deployment

### Deploy RDS Only

```bash
# Initialize and deploy just the RDS module
terraform init
terraform plan -target=module.rds
terraform apply -target=module.rds
```

### Deploy Everything

```bash
# Deploy all infrastructure including RDS
terraform init
terraform plan
terraform apply
```

## Variables

| Name | Description | Type | Default | Required |
|------|-------------|------|---------|:--------:|
| project_name | Name of the project | `string` | n/a | yes |
| password | Password for the master DB user | `string` | n/a | yes |
| vpc_id | ID of existing VPC (leave empty to create new) | `string` | `""` | no |
| allowed_security_group_ids | Security groups with RDS access | `list(string)` | `[]` | no |
| allowed_cidr_blocks | CIDR blocks with RDS access | `list(string)` | `[]` | no |
| instance_class | RDS instance type | `string` | `"db.t3.micro"` | no |
| allocated_storage | Storage size in GB | `number` | `20` | no |
| engine_version | PostgreSQL version | `string` | `"15.14"` | no |

See `variables.tf` for complete list of configurable options.