#!/bin/bash

# AWS Infrastructure Audit Script
# This script captures the current state of AWS infrastructure
# Run this before making any changes to understand what's deployed

set -e

# Configuration
AWS_REGION="ap-south-1"
OUTPUT_DIR="aws-infrastructure-audit-$(date +%Y%m%d-%H%M%S)"
TIMESTAMP=$(date '+%Y-%m-%d %H:%M:%S')

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}  AWS Infrastructure Audit Script${NC}"
echo -e "${BLUE}  Region: ${AWS_REGION}${NC}"
echo -e "${BLUE}  Timestamp: ${TIMESTAMP}${NC}"
echo -e "${BLUE}========================================${NC}"

# Create output directory
mkdir -p "$OUTPUT_DIR"
cd "$OUTPUT_DIR"

echo -e "${GREEN}📁 Created output directory: $OUTPUT_DIR${NC}"

# Function to run AWS command and save output
run_aws_command() {
    local description="$1"
    local command="$2"
    local output_file="$3"
    
    echo -e "${YELLOW}🔍 $description${NC}"
    
    if eval "$command" > "$output_file" 2>&1; then
        echo -e "${GREEN}✅ Success: $description${NC}"
    else
        echo -e "${RED}❌ Failed: $description${NC}"
        echo "Error details saved to $output_file"
    fi
}

# 1. Account Information
echo -e "\n${BLUE}=== ACCOUNT INFORMATION ===${NC}"
run_aws_command "Getting AWS Account Information" \
    "aws sts get-caller-identity --region $AWS_REGION" \
    "01-account-info.json"

run_aws_command "Getting AWS Regions" \
    "aws ec2 describe-regions --region $AWS_REGION" \
    "02-available-regions.json"

# 2. EC2 Instances
echo -e "\n${BLUE}=== EC2 INSTANCES ===${NC}"
run_aws_command "Getting EC2 Instances" \
    "aws ec2 describe-instances --region $AWS_REGION" \
    "03-ec2-instances.json"

run_aws_command "Getting EC2 Instance Types" \
    "aws ec2 describe-instance-types --region $AWS_REGION" \
    "04-ec2-instance-types.json"

run_aws_command "Getting EC2 Key Pairs" \
    "aws ec2 describe-key-pairs --region $AWS_REGION" \
    "05-ec2-key-pairs.json"

run_aws_command "Getting EC2 Security Groups" \
    "aws ec2 describe-security-groups --region $AWS_REGION" \
    "06-ec2-security-groups.json"

# 3. VPC and Networking
echo -e "\n${BLUE}=== VPC AND NETWORKING ===${NC}"
run_aws_command "Getting VPCs" \
    "aws ec2 describe-vpcs --region $AWS_REGION" \
    "07-vpcs.json"

run_aws_command "Getting Subnets" \
    "aws ec2 describe-subnets --region $AWS_REGION" \
    "08-subnets.json"

run_aws_command "Getting Route Tables" \
    "aws ec2 describe-route-tables --region $AWS_REGION" \
    "09-route-tables.json"

run_aws_command "Getting Internet Gateways" \
    "aws ec2 describe-internet-gateways --region $AWS_REGION" \
    "10-internet-gateways.json"

run_aws_command "Getting NAT Gateways" \
    "aws ec2 describe-nat-gateways --region $AWS_REGION" \
    "11-nat-gateways.json"

run_aws_command "Getting Elastic IPs" \
    "aws ec2 describe-addresses --region $AWS_REGION" \
    "12-elastic-ips.json"

# 4. Load Balancers
echo -e "\n${BLUE}=== LOAD BALANCERS ===${NC}"
run_aws_command "Getting Application Load Balancers" \
    "aws elbv2 describe-load-balancers --region $AWS_REGION" \
    "13-alb-load-balancers.json"

run_aws_command "Getting Classic Load Balancers" \
    "aws elb describe-load-balancers --region $AWS_REGION" \
    "14-clb-load-balancers.json"

run_aws_command "Getting Target Groups" \
    "aws elbv2 describe-target-groups --region $AWS_REGION" \
    "15-target-groups.json"

run_aws_command "Getting Load Balancer Listeners" \
    "aws elbv2 describe-listeners --region $AWS_REGION" \
    "16-listeners.json"

# 5. CloudFront
echo -e "\n${BLUE}=== CLOUDFRONT DISTRIBUTIONS ===${NC}"
run_aws_command "Getting CloudFront Distributions" \
    "aws cloudfront list-distributions --region $AWS_REGION" \
    "17-cloudfront-distributions.json"

# 6. RDS Databases
echo -e "\n${BLUE}=== RDS DATABASES ===${NC}"
run_aws_command "Getting RDS Instances" \
    "aws rds describe-db-instances --region $AWS_REGION" \
    "18-rds-instances.json"

run_aws_command "Getting RDS Subnet Groups" \
    "aws rds describe-db-subnet-groups --region $AWS_REGION" \
    "19-rds-subnet-groups.json"

run_aws_command "Getting RDS Parameter Groups" \
    "aws rds describe-db-parameter-groups --region $AWS_REGION" \
    "20-rds-parameter-groups.json"

run_aws_command "Getting RDS Snapshots" \
    "aws rds describe-db-snapshots --region $AWS_REGION" \
    "21-rds-snapshots.json"

# 7. S3 Buckets
echo -e "\n${BLUE}=== S3 BUCKETS ===${NC}"
run_aws_command "Getting S3 Buckets" \
    "aws s3api list-buckets --region $AWS_REGION" \
    "22-s3-buckets.json"

# Get detailed info for each S3 bucket
echo -e "${YELLOW}🔍 Getting detailed S3 bucket information${NC}"
aws s3api list-buckets --region $AWS_REGION --query 'Buckets[*].Name' --output text | tr '\t' '\n' > s3-bucket-names.txt

while IFS= read -r bucket_name; do
    if [ -n "$bucket_name" ]; then
        echo -e "${YELLOW}  📦 Getting details for bucket: $bucket_name${NC}"
        
        # Get bucket location
        aws s3api get-bucket-location --bucket "$bucket_name" --region $AWS_REGION > "23-s3-bucket-$bucket_name-location.json" 2>/dev/null || true
        
        # Get bucket policy
        aws s3api get-bucket-policy --bucket "$bucket_name" --region $AWS_REGION > "24-s3-bucket-$bucket_name-policy.json" 2>/dev/null || true
        
        # Get bucket versioning
        aws s3api get-bucket-versioning --bucket "$bucket_name" --region $AWS_REGION > "25-s3-bucket-$bucket_name-versioning.json" 2>/dev/null || true
        
        # Get bucket public access block
        aws s3api get-public-access-block --bucket "$bucket_name" --region $AWS_REGION > "26-s3-bucket-$bucket_name-public-access.json" 2>/dev/null || true
        
        # Get bucket encryption
        aws s3api get-bucket-encryption --bucket "$bucket_name" --region $AWS_REGION > "27-s3-bucket-$bucket_name-encryption.json" 2>/dev/null || true
        
        # Get bucket lifecycle
        aws s3api get-bucket-lifecycle-configuration --bucket "$bucket_name" --region $AWS_REGION > "28-s3-bucket-$bucket_name-lifecycle.json" 2>/dev/null || true
    fi
done < s3-bucket-names.txt

# 8. ECS Services
echo -e "\n${BLUE}=== ECS SERVICES ===${NC}"
run_aws_command "Getting ECS Clusters" \
    "aws ecs list-clusters --region $AWS_REGION" \
    "29-ecs-clusters.json"

run_aws_command "Getting ECS Services" \
    "aws ecs list-services --region $AWS_REGION" \
    "30-ecs-services.json"

run_aws_command "Getting ECS Task Definitions" \
    "aws ecs list-task-definitions --region $AWS_REGION" \
    "31-ecs-task-definitions.json"

# 9. ECR Repositories
echo -e "\n${BLUE}=== ECR REPOSITORIES ===${NC}"
run_aws_command "Getting ECR Repositories" \
    "aws ecr describe-repositories --region $AWS_REGION" \
    "32-ecr-repositories.json"

# 10. Route53 DNS
echo -e "\n${BLUE}=== ROUTE53 DNS ===${NC}"
run_aws_command "Getting Route53 Hosted Zones" \
    "aws route53 list-hosted-zones --region $AWS_REGION" \
    "33-route53-hosted-zones.json"

run_aws_command "Getting Route53 Health Checks" \
    "aws route53 list-health-checks --region $AWS_REGION" \
    "34-route53-health-checks.json"

# 11. Certificate Manager
echo -e "\n${BLUE}=== CERTIFICATE MANAGER ===${NC}"
run_aws_command "Getting ACM Certificates" \
    "aws acm list-certificates --region $AWS_REGION" \
    "35-acm-certificates.json"

# 12. CloudWatch
echo -e "\n${BLUE}=== CLOUDWATCH ===${NC}"
run_aws_command "Getting CloudWatch Log Groups" \
    "aws logs describe-log-groups --region $AWS_REGION" \
    "36-cloudwatch-log-groups.json"

run_aws_command "Getting CloudWatch Alarms" \
    "aws cloudwatch describe-alarms --region $AWS_REGION" \
    "37-cloudwatch-alarms.json"

# 13. IAM
echo -e "\n${BLUE}=== IAM ===${NC}"
run_aws_command "Getting IAM Users" \
    "aws iam list-users --region $AWS_REGION" \
    "38-iam-users.json"

run_aws_command "Getting IAM Roles" \
    "aws iam list-roles --region $AWS_REGION" \
    "39-iam-roles.json"

run_aws_command "Getting IAM Policies" \
    "aws iam list-policies --region $AWS_REGION" \
    "40-iam-policies.json"

# 14. Elastic Beanstalk
echo -e "\n${BLUE}=== ELASTIC BEANSTALK ===${NC}"
run_aws_command "Getting Elastic Beanstalk Applications" \
    "aws elasticbeanstalk describe-applications --region $AWS_REGION" \
    "41-eb-applications.json"

run_aws_command "Getting Elastic Beanstalk Environments" \
    "aws elasticbeanstalk describe-environments --region $AWS_REGION" \
    "42-eb-environments.json"

# 15. Lambda Functions
echo -e "\n${BLUE}=== LAMBDA FUNCTIONS ===${NC}"
run_aws_command "Getting Lambda Functions" \
    "aws lambda list-functions --region $AWS_REGION" \
    "43-lambda-functions.json"

# 16. API Gateway
echo -e "\n${BLUE}=== API GATEWAY ===${NC}"
run_aws_command "Getting API Gateway REST APIs" \
    "aws apigateway get-rest-apis --region $AWS_REGION" \
    "44-api-gateway-rest-apis.json"

run_aws_command "Getting API Gateway V2 APIs" \
    "aws apigatewayv2 get-apis --region $AWS_REGION" \
    "45-api-gateway-v2-apis.json"

# 17. Elasticache
echo -e "\n${BLUE}=== ELASTICACHE ===${NC}"
run_aws_command "Getting ElastiCache Clusters" \
    "aws elasticache describe-cache-clusters --region $AWS_REGION" \
    "46-elasticache-clusters.json"

run_aws_command "Getting ElastiCache Replication Groups" \
    "aws elasticache describe-replication-groups --region $AWS_REGION" \
    "47-elasticache-replication-groups.json"

# 18. Create Summary Report
echo -e "\n${BLUE}=== CREATING SUMMARY REPORT ===${NC}"

cat > "00-AUDIT-SUMMARY.md" << EOF
# AWS Infrastructure Audit Summary

**Region:** $AWS_REGION  
**Timestamp:** $TIMESTAMP  
**Account ID:** $(aws sts get-caller-identity --query Account --output text --region $AWS_REGION)

## Quick Overview

### EC2 Instances
$(aws ec2 describe-instances --region $AWS_REGION --query 'Reservations[*].Instances[*].[InstanceId,State.Name,Tags[?Key==`Name`].Value|[0]]' --output table 2>/dev/null || echo "No EC2 instances found")

### RDS Instances
$(aws rds describe-db-instances --region $AWS_REGION --query 'DBInstances[*].[DBInstanceIdentifier,DBInstanceStatus,Endpoint.Address]' --output table 2>/dev/null || echo "No RDS instances found")

### Load Balancers
$(aws elbv2 describe-load-balancers --region $AWS_REGION --query 'LoadBalancers[*].[LoadBalancerName,State.Code,DNSName]' --output table 2>/dev/null || echo "No load balancers found")

### CloudFront Distributions
$(aws cloudfront list-distributions --region $AWS_REGION --query 'DistributionList.Items[*].[Id,DomainName,Status,Comment]' --output table 2>/dev/null || echo "No CloudFront distributions found")

### S3 Buckets
$(aws s3api list-buckets --region $AWS_REGION --query 'Buckets[*].[Name,CreationDate]' --output table 2>/dev/null || echo "No S3 buckets found")

## File Structure

This audit contains the following files:
- \`00-AUDIT-SUMMARY.md\` - This summary file
- \`01-account-info.json\` - AWS account information
- \`02-available-regions.json\` - Available AWS regions
- \`03-ec2-instances.json\` - EC2 instances details
- \`04-ec2-instance-types.json\` - Available EC2 instance types
- \`05-ec2-key-pairs.json\` - EC2 key pairs
- \`06-ec2-security-groups.json\` - Security groups
- \`07-vpcs.json\` - VPCs
- \`08-subnets.json\` - Subnets
- \`09-route-tables.json\` - Route tables
- \`10-internet-gateways.json\` - Internet gateways
- \`11-nat-gateways.json\` - NAT gateways
- \`12-elastic-ips.json\` - Elastic IPs
- \`13-alb-load-balancers.json\` - Application Load Balancers
- \`14-clb-load-balancers.json\` - Classic Load Balancers
- \`15-target-groups.json\` - Target groups
- \`16-listeners.json\` - Load balancer listeners
- \`17-cloudfront-distributions.json\` - CloudFront distributions
- \`18-rds-instances.json\` - RDS instances
- \`19-rds-subnet-groups.json\` - RDS subnet groups
- \`20-rds-parameter-groups.json\` - RDS parameter groups
- \`21-rds-snapshots.json\` - RDS snapshots
- \`22-s3-buckets.json\` - S3 buckets list
- \`23-s3-bucket-*-location.json\` - S3 bucket locations
- \`24-s3-bucket-*-policy.json\` - S3 bucket policies
- \`25-s3-bucket-*-versioning.json\` - S3 bucket versioning
- \`26-s3-bucket-*-public-access.json\` - S3 public access blocks
- \`27-s3-bucket-*-encryption.json\` - S3 bucket encryption
- \`28-s3-bucket-*-lifecycle.json\` - S3 bucket lifecycle
- \`29-ecs-clusters.json\` - ECS clusters
- \`30-ecs-services.json\` - ECS services
- \`31-ecs-task-definitions.json\` - ECS task definitions
- \`32-ecr-repositories.json\` - ECR repositories
- \`33-route53-hosted-zones.json\` - Route53 hosted zones
- \`34-route53-health-checks.json\` - Route53 health checks
- \`35-acm-certificates.json\` - ACM certificates
- \`36-cloudwatch-log-groups.json\` - CloudWatch log groups
- \`37-cloudwatch-alarms.json\` - CloudWatch alarms
- \`38-iam-users.json\` - IAM users
- \`39-iam-roles.json\` - IAM roles
- \`40-iam-policies.json\` - IAM policies
- \`41-eb-applications.json\` - Elastic Beanstalk applications
- \`42-eb-environments.json\` - Elastic Beanstalk environments
- \`43-lambda-functions.json\` - Lambda functions
- \`44-api-gateway-rest-apis.json\` - API Gateway REST APIs
- \`45-api-gateway-v2-apis.json\` - API Gateway V2 APIs
- \`46-elasticache-clusters.json\` - ElastiCache clusters
- \`47-elasticache-replication-groups.json\` - ElastiCache replication groups

## Usage

To view specific information:
\`\`\`bash
# View EC2 instances
cat 03-ec2-instances.json | jq '.'

# View RDS instances
cat 18-rds-instances.json | jq '.'

# View CloudFront distributions
cat 17-cloudfront-distributions.json | jq '.'
\`\`\`

## Next Steps

1. Review the summary above
2. Examine specific JSON files for detailed information
3. Use this data to plan infrastructure changes
4. Compare with Terraform state if needed

EOF

echo -e "${GREEN}✅ Summary report created: 00-AUDIT-SUMMARY.md${NC}"

# Count files created
file_count=$(find . -name "*.json" -o -name "*.md" -o -name "*.txt" | wc -l)

echo -e "\n${GREEN}🎉 Audit Complete!${NC}"
echo -e "${GREEN}📊 Total files created: $file_count${NC}"
echo -e "${GREEN}📁 Output directory: $(pwd)${NC}"
echo -e "${GREEN}📋 Summary report: $(pwd)/00-AUDIT-SUMMARY.md${NC}"

echo -e "\n${BLUE}========================================${NC}"
echo -e "${BLUE}  Next Steps:${NC}"
echo -e "${BLUE}  1. Review the summary report${NC}"
echo -e "${BLUE}  2. Examine specific JSON files${NC}"
echo -e "${BLUE}  3. Use this data for planning${NC}"
echo -e "${BLUE}========================================${NC}"
