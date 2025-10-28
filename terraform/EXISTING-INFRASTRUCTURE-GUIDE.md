# Existing Infrastructure Management Guide

This guide explains how to safely manage existing AWS infrastructure without destroying it when applying Terraform changes.

## Overview

The Terraform configuration has been updated with lifecycle rules to prevent accidental destruction of critical resources. This ensures that existing infrastructure is updated rather than destroyed when changes are applied.

## Lifecycle Rules Applied

### S3 Bucket Resources
- `aws_s3_bucket.study_planner` - `prevent_destroy = true`
- `aws_s3_bucket_versioning.study_planner` - `prevent_destroy = true`
- `aws_s3_bucket_public_access_block.study_planner` - `prevent_destroy = true`
- `aws_s3_bucket_website_configuration.study_planner` - `prevent_destroy = true`
- `aws_s3_bucket_policy.study_planner` - `prevent_destroy = true`

### CloudFront Resources
- `aws_cloudfront_distribution.study_planner` - `prevent_destroy = true`
- `aws_cloudfront_origin_access_identity.study_planner` - `prevent_destroy = true`

## Importing Existing Resources

If you have existing infrastructure that was created outside of Terraform, you can import it using the provided script.

### Automatic Import
```bash
# Check if resources exist
./import-existing-resources.sh --check-only

# Automatically import all existing resources
./import-existing-resources.sh --auto
```

### Manual Import
```bash
# Show import commands for manual execution
./import-existing-resources.sh --show-cmds
```

### Manual Import Commands

#### S3 Bucket
```bash
terraform import aws_s3_bucket.study_planner study-planner.upscpro.laex.in
terraform import aws_s3_bucket_versioning.study_planner study-planner.upscpro.laex.in
terraform import aws_s3_bucket_public_access_block.study_planner study-planner.upscpro.laex.in
terraform import aws_s3_bucket_website_configuration.study_planner study-planner.upscpro.laex.in
terraform import aws_s3_bucket_policy.study_planner study-planner.upscpro.laex.in
```

#### CloudFront Distribution
```bash
# First, get the distribution ID
aws cloudfront list-distributions --query "DistributionList.Items[?Comment=='CloudFront distribution for Study Planner Application'].Id" --output text

# Import the distribution (replace DISTRIBUTION_ID with actual ID)
terraform import aws_cloudfront_distribution.study_planner DISTRIBUTION_ID

# Get and import the OAI ID
OAI_ID=$(aws cloudfront get-distribution --id DISTRIBUTION_ID --query "Distribution.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity" --output text | sed 's/.*origin-access-identity\/cloudfront\///')
terraform import aws_cloudfront_origin_access_identity.study_planner $OAI_ID
```

## Safe Deployment Process

### 1. Check Existing Resources
```bash
# Check what resources already exist
./import-existing-resources.sh --check-only

# If resources exist, import them
./import-existing-resources.sh --auto
```

### 2. Plan Changes
```bash
# Always run plan first to see what changes will be made
terraform plan

# Review the plan carefully to ensure no resources will be destroyed
```

### 3. Apply Changes
```bash
# Apply changes (only updates will be made, no destruction)
terraform apply
```

### 4. Verify Deployment
```bash
# Test the deployment
./test-study-planner-deployment.sh

# Deploy the application
./deploy-study-planner.sh
```

## Handling Different Scenarios

### Scenario 1: No Existing Infrastructure
- Run `terraform apply` directly
- All resources will be created fresh
- No import needed

### Scenario 2: Existing S3 Bucket Only
- Import the S3 bucket and related resources
- CloudFront will be created fresh
- Run `terraform apply`

### Scenario 3: Existing CloudFront Distribution Only
- Import the CloudFront distribution and OAI
- S3 bucket will be created fresh
- Run `terraform apply`

### Scenario 4: Both S3 and CloudFront Exist
- Import all resources using the script
- Run `terraform apply` to update configurations
- No resources will be destroyed

## Troubleshooting

### Import Errors
If import fails, check:
1. Resource names match exactly
2. AWS credentials have proper permissions
3. Resources actually exist in AWS

### Plan Shows Destruction
If `terraform plan` shows resources will be destroyed:
1. Check if lifecycle rules are properly applied
2. Verify resource names match existing resources
3. Import missing resources first

### State Conflicts
If you get state conflicts:
1. Check if resources are already in state
2. Use `terraform state list` to see current state
3. Remove conflicting resources from state if needed: `terraform state rm <resource>`

## Best Practices

### 1. Always Plan First
```bash
terraform plan
```
Never apply without reviewing the plan first.

### 2. Use Version Control
- Commit Terraform state files
- Use remote state storage (S3 + DynamoDB)
- Tag resources appropriately

### 3. Backup Before Changes
```bash
# Backup current state
cp terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)
```

### 4. Test in Non-Production First
- Test changes in a development environment
- Use different resource names for testing
- Verify lifecycle rules work as expected

### 5. Monitor Changes
```bash
# Watch CloudFormation events (if using CloudFormation)
aws cloudformation describe-stack-events --stack-name <stack-name>

# Monitor CloudFront distribution changes
aws cloudfront get-distribution --id <distribution-id>
```

## Emergency Procedures

### If Resources Are Accidentally Destroyed
1. **Don't panic** - Check if they're actually destroyed
2. **Check AWS Console** - Verify resource status
3. **Restore from backup** - If you have backups
4. **Recreate resources** - Use Terraform to recreate
5. **Update state** - Import recreated resources

### If State Gets Corrupted
1. **Backup current state**
2. **Remove problematic resources** from state
3. **Re-import resources** using the import script
4. **Verify state** with `terraform plan`

### If Import Fails
1. **Check resource names** - Ensure they match exactly
2. **Verify permissions** - Ensure AWS credentials have access
3. **Check resource existence** - Verify resources exist in AWS
4. **Manual import** - Use individual import commands

## Monitoring and Alerts

Set up CloudWatch alarms for:
- S3 bucket access patterns
- CloudFront distribution errors
- Cost anomalies
- Resource changes

## Cost Management

- Monitor S3 storage costs
- Track CloudFront data transfer
- Set up billing alerts
- Use appropriate storage classes

## Security Considerations

- S3 bucket is not publicly accessible
- Access only through CloudFront with OAI
- HTTPS enforced for all requests
- Regular security audits recommended

## Support

If you encounter issues:
1. Check this guide first
2. Run the test script: `./test-study-planner-deployment.sh`
3. Check AWS CloudTrail for API calls
4. Review Terraform logs
5. Contact your AWS support team if needed