# Quick Start Guide - Study Planner Deployment

This guide will help you quickly set up and deploy the Study Planner application to AWS S3 and CloudFront.

## Prerequisites

1. **AWS CLI**: Install and configure with appropriate permissions
2. **Node.js**: Version 16 or higher
3. **pnpm**: Package manager (will be installed automatically if missing)
4. **Terraform**: For infrastructure management

## Step 1: Deploy Infrastructure

```bash
# Navigate to terraform directory
cd /workspace/terraform

# Initialize Terraform (if not already done)
terraform init

# Plan the deployment
terraform plan

# Apply the infrastructure
terraform apply
```

## Step 2: Test the Setup

```bash
# Run the test script to verify everything is ready
./test-study-planner-deployment.sh
```

## Step 3: Deploy the Application

```bash
# Deploy the onboarding2 app to S3 and CloudFront
./deploy-study-planner.sh
```

## Step 4: Access Your Application

After deployment, you can access your application at:
- **CloudFront URL**: Check the output of the deployment script
- **Terraform Output**: `terraform output study_planner_url`

## What Gets Created

### S3 Bucket
- **Name**: `study-planner.upscpro.laex.in`
- **Purpose**: Hosts the static files for the Study Planner app
- **Configuration**: Website hosting enabled, CloudFront access only

### CloudFront Distribution
- **Purpose**: Global CDN for fast content delivery
- **Features**: HTTPS enforced, SPA routing support, optimized caching
- **Cache Strategy**: Static assets cached for 1 year, HTML files not cached

## Troubleshooting

### Common Issues

1. **AWS Credentials Not Configured**
   ```bash
   aws configure
   ```

2. **Terraform Not Initialized**
   ```bash
   terraform init
   ```

3. **Build Failures**
   ```bash
   # Check Node.js version
   node --version
   
   # Install dependencies manually
   cd /workspace/study-planner/apps/onboarding2
   pnpm install
   pnpm run build
   ```

4. **S3 Access Denied**
   - Ensure your AWS credentials have S3 and CloudFront permissions
   - Check if the bucket exists: `aws s3 ls s3://study-planner.upscpro.laex.in`

### Getting Help

- **Test Script**: `./test-study-planner-deployment.sh --help`
- **Deploy Script**: `./deploy-study-planner.sh --help`
- **Terraform**: `terraform plan` to see what will be created

## Next Steps

1. **Custom Domain**: Configure a custom domain in CloudFront
2. **SSL Certificate**: Add a custom SSL certificate for your domain
3. **Monitoring**: Set up CloudWatch alarms for the application
4. **CI/CD**: Integrate with your CI/CD pipeline for automated deployments

## File Structure

```
/workspace/terraform/
├── main.tf                           # Main Terraform configuration
├── variables.tf                      # Terraform variables
├── outputs.tf                        # Terraform outputs
├── deploy-study-planner.sh           # Deployment script
├── test-study-planner-deployment.sh  # Test script
├── README-STUDY-PLANNER-DEPLOYMENT.md # Detailed documentation
└── QUICK-START-STUDY-PLANNER.md      # This file
```

## Support

If you encounter any issues:
1. Run the test script to identify problems
2. Check the detailed README for troubleshooting
3. Verify AWS permissions and credentials
4. Ensure all prerequisites are installed