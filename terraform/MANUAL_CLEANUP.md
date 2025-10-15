# Manual Resource Cleanup Guide

If the automated cleanup script doesn't work, you can manually clean up the resources using the AWS Console or by fixing the AWS CLI issue.

## 🔧 Fix AWS CLI Issue First

The AWS CLI has a urllib3 compatibility issue. Fix it with:

```bash
pip3 install 'urllib3<2.0'
```

## 🧹 Manual Cleanup Steps

### 1. **EC2 Instances**
- Go to AWS Console → EC2 → Instances
- Terminate instances: `upscpro-strapi`, `upscpro-docker`

### 2. **ECR Repositories**
- Go to AWS Console → ECR → Repositories
- Delete: `study-planner-app`, `study-planner-frontend`, `study-planner-helios`

### 3. **RDS Database**
- Go to AWS Console → RDS → Databases
- Delete: `study-planner-db` (if it exists)

### 4. **VPC and Networking**
- Go to AWS Console → VPC → VPCs
- Delete VPC: `study-planner-vpc` (this will delete associated subnets, route tables, etc.)

### 5. **Security Groups**
- Go to AWS Console → EC2 → Security Groups
- Delete: `upscpro-ec2-sg`, `upscpro-rds-sg`

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
- **Data Loss**: This will permanently delete all data in RDS
- **Backup**: Make sure you don't need any data from the existing resources
- **Time**: Manual cleanup can take 10-15 minutes depending on resource dependencies

## 🔍 Resource Dependencies

Delete resources in this order to avoid dependency issues:
1. EC2 Instances
2. ECR Repositories
3. RDS Database
4. VPC and Networking
5. Security Groups
