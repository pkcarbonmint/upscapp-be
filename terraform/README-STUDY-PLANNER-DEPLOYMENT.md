# Study Planner S3 and CloudFront Deployment

This document describes the deployment setup for the Study Planner application using AWS S3 and CloudFront.

## Overview

The Study Planner application is deployed using:
- **S3 Bucket**: `study-planner.upscpro.laex.in` - Stores the static files
- **CloudFront Distribution**: Serves the application with global CDN
- **Deployment Script**: `deploy-study-planner.sh` - Automated build and deployment

## Infrastructure

### S3 Bucket Configuration
- **Bucket Name**: `study-planner.upscpro.laex.in`
- **Versioning**: Enabled
- **Public Access**: Configured for CloudFront access only
- **Website Hosting**: Enabled with `index.html` as default document
- **Error Document**: `index.html` (for SPA routing)

### CloudFront Distribution
- **Origin**: S3 bucket with Origin Access Identity (OAI)
- **Default Root Object**: `index.html`
- **Cache Behaviors**:
  - Static assets (`/assets/*`): Long-term caching (1 year)
  - API calls (`/api/*`): No caching
  - Default: 1 hour caching
- **Custom Error Pages**: 403/404 errors redirect to `index.html` for SPA routing
- **HTTPS**: Enforced with CloudFront default certificate

## Deployment Process

### Prerequisites
1. AWS CLI configured with appropriate permissions
2. Node.js and pnpm installed
3. Terraform applied to create the infrastructure

### Manual Deployment
```bash
# Navigate to terraform directory
cd /workspace/terraform

# Deploy the application
./deploy-study-planner.sh
```

### Deployment Options
```bash
# Build only (no deployment)
./deploy-study-planner.sh --build-only

# Sync to S3 only (no CloudFront invalidation)
./deploy-study-planner.sh --sync-only

# Invalidate CloudFront cache only
./deploy-study-planner.sh --invalidate-only
```

## Application Structure

The onboarding2 application is located at:
```
/workspace/study-planner/apps/onboarding2/
├── src/                    # Source code
├── dist/                   # Build output (generated)
├── package.json           # Dependencies and scripts
├── vite.config.ts         # Vite configuration
└── tsconfig.json          # TypeScript configuration
```

## Build Process

1. **Dependencies**: Installs using `pnpm install`
2. **TypeScript Compilation**: `tsc` compiles TypeScript to JavaScript
3. **Vite Build**: `vite build` creates optimized production bundle
4. **Output**: Generated in `dist/` directory

## Deployment Steps

1. **Build**: Compile and optimize the application
2. **Sync to S3**: Upload files with appropriate cache headers
3. **Invalidate CloudFront**: Clear CDN cache for immediate updates
4. **Verify**: Check that the application loads correctly

## Cache Strategy

- **HTML/JSON files**: No caching (immediate updates)
- **Static assets**: Long-term caching (1 year)
- **API calls**: No caching (real-time data)

## Monitoring and Troubleshooting

### Check Deployment Status
```bash
# Get CloudFront distribution details
aws cloudfront get-distribution --id <DISTRIBUTION_ID>

# Check S3 bucket contents
aws s3 ls s3://study-planner.upscpro.laex.in --recursive

# Monitor CloudFront invalidation
aws cloudfront get-invalidation --distribution-id <DISTRIBUTION_ID> --id <INVALIDATION_ID>
```

### Common Issues

1. **Build Failures**: Check Node.js version and dependencies
2. **Upload Failures**: Verify AWS credentials and S3 permissions
3. **Cache Issues**: Wait for CloudFront propagation (up to 15 minutes)
4. **404 Errors**: Ensure `index.html` is uploaded and error pages are configured

## Security

- S3 bucket is not publicly accessible
- Access is only through CloudFront with OAI
- HTTPS is enforced for all requests
- No sensitive data in client-side code

## Cost Optimization

- CloudFront uses `PriceClass_100` (US, Canada, Europe)
- S3 storage class optimized for web content
- Appropriate cache headers reduce origin requests

## Terraform Outputs

After applying Terraform, you can get the following outputs:
```bash
terraform output study_planner_url
terraform output study_planner_cloudfront_distribution_id
terraform output study_planner_s3_bucket_name
```

## Next Steps

1. Apply Terraform configuration to create infrastructure
2. Run deployment script to build and deploy application
3. Configure custom domain (optional)
4. Set up monitoring and alerts
5. Implement CI/CD pipeline for automated deployments