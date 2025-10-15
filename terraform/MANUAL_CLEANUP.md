# Manual Resource Cleanup Guide

If the automated cleanup script doesn't work, you can manually clean up the resources using the AWS Console or by fixing the AWS CLI issue.

## 🔧 Fix AWS CLI Issue First

The AWS CLI has a urllib3 compatibility issue. Fix it with:

```bash
pip3 install 'urllib3<2.0'
```

## 🧹 Manual Cleanup Steps

### 1. **ECS Resources**
- Go to AWS Console → ECS → Clusters
- Delete cluster: `study-planner-cluster`
- Go to ECS → Task Definitions
- Delete task definitions: `study-planner-app`, `study-planner-frontend`, `study-planner-celery`

### 2. **Load Balancer**
- Go to AWS Console → EC2 → Load Balancers
- Delete: `study-planner-alb`
- Go to EC2 → Target Groups
- Delete: `study-planner-app-tg`, `study-planner-frontend-tg`, `study-planner-helios-tg`

### 3. **ECR Repositories**
- Go to AWS Console → ECR → Repositories
- Delete: `study-planner-app`, `study-planner-frontend`, `study-planner-helios`

### 4. **RDS Database**
- Go to AWS Console → RDS → Databases
- Delete: `study-planner-db` (if it exists)

### 5. **ElastiCache Redis**
- Go to AWS Console → ElastiCache → Redis clusters
- Delete: `study-planner-redis` (if it exists)

### 6. **VPC and Networking**
- Go to AWS Console → VPC → VPCs
- Delete VPC: `study-planner-vpc` (this will delete associated subnets, route tables, etc.)

### 7. **Security Groups**
- Go to AWS Console → EC2 → Security Groups
- Delete: `study-planner-alb-sg`, `study-planner-ecs-sg`, `study-planner-rds-sg`

### 8. **IAM Roles**
- Go to AWS Console → IAM → Roles
- Delete: `study-planner-ecs-task-execution-role`, `study-planner-ecs-task-role`

### 9. **CloudWatch Logs**
- Go to AWS Console → CloudWatch → Log groups
- Delete: `/ecs/study-planner`

## 🚀 After Cleanup

1. Remove local Terraform state:
```bash
rm -f terraform.tfstate*
rm -f .terraform.lock.hcl
```

2. Reinitialize Terraform:
```bash
terraform init
```

3. Deploy fresh in ap-south-1:
```bash
./setup.sh
```

## ⚠️ Important Notes

- **Cost**: Deleting resources will stop all AWS charges
- **Data Loss**: This will permanently delete all data in RDS and Redis
- **Backup**: Make sure you don't need any data from the existing resources
- **Time**: Manual cleanup can take 10-15 minutes depending on resource dependencies

## 🔍 Resource Dependencies

Delete resources in this order to avoid dependency issues:
1. ECS Services and Tasks
2. Load Balancer and Target Groups
3. ECR Repositories
4. RDS and ElastiCache
5. VPC and Networking
6. Security Groups
7. IAM Roles
8. CloudWatch Logs
