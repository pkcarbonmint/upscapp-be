# Study Planner Deployment Guide

This guide explains how to set up and deploy the Study Planner application using S3 and CloudFront.

## Infrastructure Setup

### Prerequisites

1. AWS CLI installed and configured
2. Terraform installed (>= 1.0)
3. Node.js and npm installed
4. AWS credentials with appropriate permissions

### Terraform Configuration

The infrastructure includes:
- **S3 Bucket**: `study-planner.upscpro.laex.in` for static website hosting
- **CloudFront Distribution**: CDN for global content delivery
- **SSL Certificate**: HTTPS support via ACM (optional, requires domain)
- **Route53 DNS**: Automatic DNS configuration (optional)

### Configuration Variables

Add or update these variables in your `terraform.tfvars`:

```hcl
# Study Planner Configuration
enable_study_planner_s3      = true
study_planner_bucket_name    = "study-planner.upscpro.laex.in"
study_planner_domain_name    = "study-planner.upscpro.laex.in"

# Optional: Route53 Zone ID for DNS management
route53_zone_id = "Z1234567890ABC"  # Your Route53 hosted zone ID
```

### Deploy Infrastructure

```bash
cd terraform

# Initialize Terraform (first time only)
terraform init

# Review changes
terraform plan

# Apply changes
terraform apply
```

### Terraform Outputs

After deployment, you can view important information:

```bash
# View all outputs
terraform output

# View specific outputs
terraform output study_planner_bucket_name
terraform output study_planner_cloudfront_id
terraform output study_planner_cloudfront_domain
terraform output study_planner_url
```

## Application Deployment

### Using the Deployment Script

The `deploy-study-planner.sh` script automates the entire deployment process:

```bash
cd terraform

# Deploy with auto-detected settings (recommended)
./deploy-study-planner.sh

# Deploy with custom bucket name
./deploy-study-planner.sh --bucket my-custom-bucket

# Deploy with custom CloudFront distribution ID
./deploy-study-planner.sh --distribution-id E1234567890ABC

# Skip build (use existing dist folder)
./deploy-study-planner.sh --skip-build

# Skip CloudFront invalidation
./deploy-study-planner.sh --skip-invalidation

# Show help
./deploy-study-planner.sh --help
```

### Manual Deployment Steps

If you prefer to deploy manually:

#### 1. Build the Application

```bash
cd study-planner/apps/onboarding2

# Install dependencies
npm install

# Build for production
npm run build
```

#### 2. Upload to S3

```bash
# Get bucket name from Terraform
BUCKET_NAME=$(terraform output -raw study_planner_bucket_name)

# Sync static assets with long cache
aws s3 sync dist/ "s3://${BUCKET_NAME}" \
  --delete \
  --cache-control "public, max-age=31536000, immutable" \
  --exclude "index.html" \
  --exclude "*.html"

# Upload HTML files with no-cache
aws s3 sync dist/ "s3://${BUCKET_NAME}" \
  --cache-control "no-cache, no-store, must-revalidate" \
  --content-type "text/html" \
  --exclude "*" \
  --include "*.html"
```

#### 3. Invalidate CloudFront Cache

```bash
# Get CloudFront distribution ID from Terraform
DISTRIBUTION_ID=$(terraform output -raw study_planner_cloudfront_id)

# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"
```

## DNS Configuration

### With Route53 (Automatic)

If you provide `route53_zone_id` in your Terraform configuration, DNS records will be created automatically.

### Without Route53 (Manual)

If you're not using Route53, you need to manually create DNS records:

1. Get CloudFront domain name:
   ```bash
   terraform output study_planner_cloudfront_domain
   ```

2. Create a CNAME record in your DNS provider:
   - **Name**: `study-planner.upscpro.laex.in`
   - **Type**: `CNAME`
   - **Value**: `<cloudfront-domain-name>` (from step 1)

## SSL Certificate

### Automatic SSL (with Route53)

If `route53_zone_id` is configured, SSL certificate will be automatically validated and attached to CloudFront.

### Manual SSL Validation

If not using Route53:

1. After running `terraform apply`, you'll see validation records in the output
2. Add the CNAME validation records to your DNS provider
3. Wait for validation to complete (can take up to 30 minutes)
4. Run `terraform apply` again to complete the setup

## Accessing the Application

After deployment:

```bash
# Get the application URL
terraform output study_planner_url
```

- **With custom domain**: `https://study-planner.upscpro.laex.in`
- **Without custom domain**: `https://<cloudfront-domain>.cloudfront.net`

## Updating the Application

To deploy updates:

```bash
cd terraform
./deploy-study-planner.sh
```

This will:
1. Build the latest code
2. Upload changes to S3
3. Invalidate CloudFront cache
4. Make updates available immediately

## Troubleshooting

### Build Fails

```bash
# Clean node_modules and rebuild
cd study-planner/apps/onboarding2
rm -rf node_modules package-lock.json
npm install
npm run build
```

### S3 Upload Fails

Check AWS credentials and bucket permissions:

```bash
# Test bucket access
aws s3 ls s3://study-planner.upscpro.laex.in

# Check bucket policy
aws s3api get-bucket-policy --bucket study-planner.upscpro.laex.in
```

### CloudFront Not Updating

```bash
# Manually invalidate cache
DISTRIBUTION_ID=$(terraform output -raw study_planner_cloudfront_id)
aws cloudfront create-invalidation \
  --distribution-id "$DISTRIBUTION_ID" \
  --paths "/*"

# Wait for invalidation
aws cloudfront wait invalidation-completed \
  --distribution-id "$DISTRIBUTION_ID" \
  --id <invalidation-id>
```

### SSL Certificate Stuck in Pending Validation

1. Check DNS validation records:
   ```bash
   aws acm describe-certificate \
     --certificate-arn <cert-arn> \
     --region us-east-1
   ```

2. Verify CNAME records are correctly added to DNS
3. Wait up to 30 minutes for validation
4. DNS propagation can take time - check with: `dig <validation-domain>`

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Internet                             │
└─────────────────────────┬───────────────────────────────────┘
                          │
                          │ HTTPS
                          │
                ┌─────────▼─────────┐
                │   CloudFront CDN   │
                │  (Global Edge)     │
                └─────────┬─────────┘
                          │
                          │ Origin Fetch
                          │
                ┌─────────▼─────────┐
                │   S3 Bucket        │
                │  (Static Files)    │
                │  - index.html      │
                │  - /assets/*       │
                └────────────────────┘
```

## Cost Estimation

### AWS Services
- **S3 Storage**: ~$0.023/GB per month
- **S3 Requests**: ~$0.0004 per 1,000 GET requests
- **CloudFront**: First 1TB free per month, then ~$0.085/GB
- **Route53**: ~$0.50 per hosted zone per month
- **ACM Certificate**: Free

### Typical Monthly Cost
For a small-to-medium traffic site:
- Storage (1GB): $0.02
- CloudFront (10GB transfer): $0.85
- Route53: $0.50
- **Total**: ~$1.50-$2.00/month

## Best Practices

1. **Version Control**: Always commit changes before deploying
2. **Test Locally**: Run `npm run dev` to test before building
3. **Monitor Costs**: Set up AWS billing alerts
4. **Cache Strategy**: 
   - Long cache for assets (1 year)
   - No cache for HTML (always fresh)
5. **Security**: Keep CloudFront OAI in place (prevents direct S3 access)
6. **Backup**: S3 versioning is enabled automatically

## Support

For issues or questions:
1. Check CloudWatch logs in AWS Console
2. Review CloudFront distribution settings
3. Verify S3 bucket permissions and policies
4. Check terraform outputs for configuration details
