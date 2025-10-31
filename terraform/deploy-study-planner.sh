#!/bin/bash

# Deploy Study Planner Onboarding2 App to S3 and CloudFront
# This script builds the onboarding2 app and deploys it to the S3 bucket

set -e

# Configuration
BUCKET_NAME="study-planner.upscpro.laex.in"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# Configuration
BUCKET_NAME="study-planner.upscpro.laex.in"
APP_DIR="$REPO_ROOT/study-planner/apps/onboarding2"
BUILD_DIR="$APP_DIR/dist"
AWS_REGION="ap-south-1"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists node; then
        print_error "Node.js is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists pnpm; then
        print_warning "pnpm is not installed. Installing pnpm..."
        npm install -g pnpm
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to generate version file
generate_version() {
    print_status "Generating version information..."
    
    # Save current directory
    ORIGINAL_DIR=$(pwd)
    
    # Change to repo root to get git info
    cd "$REPO_ROOT"
    
    # Get git commit hash (first 6 characters)
    GIT_COMMIT=$(git rev-parse --short=6 HEAD 2>/dev/null || echo "unknown")
    
    # Change back to original directory
    cd "$ORIGINAL_DIR"
    
    # Create version string
    VERSION="1.0.0-${GIT_COMMIT}"
    
    # Create public directory if it doesn't exist
    mkdir -p "$APP_DIR/public"
    
    # Write version to public/version.json
    echo "{\"version\":\"${VERSION}\"}" > "$APP_DIR/public/version.json"
    
    print_success "Version file generated: ${VERSION}"
}

# Function to build the application
build_app() {
    # Generate version file first (before changing directories)
    generate_version
    
    print_status "Building the onboarding2 application..."
    
    cd "$APP_DIR"
    
    # Install dependencies if node_modules doesn't exist
    if [ ! -d "node_modules" ]; then
        print_status "Installing dependencies..."
        pnpm install
    fi
    
    # Clean previous build
    if [ -d "dist" ]; then
        print_status "Cleaning previous build..."
        rm -rf dist
    fi
    
    # Build the application
    print_status "Running build command..."
    pnpm run -r build
    
    if [ ! -d "dist" ]; then
        print_error "Build failed. dist directory not found."
        exit 1
    fi
    
    print_success "Application built successfully"
}

# Function to sync files to S3
sync_to_s3() {
    print_status "Syncing files to S3 bucket: $BUCKET_NAME"
    
    # Sync files to S3 with appropriate cache headers
    aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --delete \
        --cache-control "max-age=31536000" \
        --exclude "*.html" \
        --exclude "*.json"
    
    # Upload HTML files with no-cache headers
    aws s3 sync "$BUILD_DIR" "s3://$BUCKET_NAME" \
        --region "$AWS_REGION" \
        --cache-control "no-cache, no-store, must-revalidate" \
        --include "*.html" \
        --include "*.json"
    
    print_success "Files synced to S3 successfully"
}

# Function to get CloudFront distribution ID
get_cloudfront_distribution_id() {
    print_status "Getting CloudFront distribution ID..."
    
    # First, try to get the distribution ID from Terraform output
    TERRAFORM_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    
    # Try to get distribution ID from terraform output
    if [ -f "$TERRAFORM_DIR/terraform.tfstate" ]; then
        DISTRIBUTION_ID=$(terraform -chdir="$TERRAFORM_DIR" output -raw study_planner_cloudfront_distribution_id 2>/dev/null)
        
        if [ ! -z "$DISTRIBUTION_ID" ]; then
            print_success "Found CloudFront distribution ID: $DISTRIBUTION_ID"
            echo "$DISTRIBUTION_ID"
            return 0
        fi
    fi
    
    # Fallback: Query by origin (S3 bucket domain)
    BUCKET_DOMAIN="study-planner.upscpro.laex.in.s3.ap-south-1.amazonaws.com"
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Origins.Items[?DomainName=='$BUCKET_DOMAIN']].Id" \
        --output text \
        --region "$AWS_REGION")
    
    if [ -z "$DISTRIBUTION_ID" ]; then
        print_error "CloudFront distribution not found. Please ensure Terraform has been applied."
        print_error "Run: cd terraform && terraform apply"
        exit 1
    fi
    
    print_success "Found CloudFront distribution ID: $DISTRIBUTION_ID"
    echo "$DISTRIBUTION_ID"
}
# Function to invalidate CloudFront cache
invalidate_cloudfront() {
    print_status "Invalidating CloudFront cache..."
    
    DISTRIBUTION_ID=$(get_cloudfront_distribution_id)
    DISTRIBUTION_ID="E3LZ9SVGVBX134"
    # Create invalidation
    INVALIDATION_ID=$(aws cloudfront create-invalidation \
        --distribution-id "$DISTRIBUTION_ID" \
        --paths "/*" \
        --query "Invalidation.Id" \
        --output text \
        --region "$AWS_REGION")
    
    print_success "CloudFront cache invalidation created: $INVALIDATION_ID"
    
    # Wait for invalidation to complete
    print_status "Waiting for invalidation to complete..."
    aws cloudfront wait invalidation-completed \
        --distribution-id "$DISTRIBUTION_ID" \
        --id "$INVALIDATION_ID" \
        --region "$AWS_REGION"
    
    print_success "CloudFront cache invalidation completed"
}

# Function to get the CloudFront URL
get_cloudfront_url() {
    print_status "Getting CloudFront URL..."
    
    # DISTRIBUTION_ID=$(get_cloudfront_distribution_id)
    DISTRIBUTION_ID="E3LZ9SVGVBX134"

    CLOUDFRONT_URL=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query "Distribution.DomainName" \
        --output text \
        --region "$AWS_REGION")
    
    print_success "Study Planner Application URL: https://$CLOUDFRONT_URL"
    echo "https://$CLOUDFRONT_URL"
}

# Function to verify deployment
verify_deployment() {
    print_status "Verifying deployment..."
    
    CLOUDFRONT_URL=$(get_cloudfront_url)
    
    # Wait a moment for the distribution to propagate
    sleep 10
    
    # Check if the main page loads
    if curl -s -o /dev/null -w "%{http_code}" "https://$CLOUDFRONT_URL" | grep -q "200"; then
        print_success "Deployment verification successful"
        print_success "Study Planner Application is now available at: https://$CLOUDFRONT_URL"
    else
        print_warning "Deployment verification failed. The application might still be propagating."
        print_warning "Please check the URL manually: https://$CLOUDFRONT_URL"
    fi
}

# Main execution
main() {
    print_status "Starting Study Planner deployment process..."
    
    check_prerequisites
    build_app
    sync_to_s3
    invalidate_cloudfront
    verify_deployment
    
    print_success "Deployment completed successfully!"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Deploy Study Planner Onboarding2 App to S3 and CloudFront"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --build-only   Only build the application, don't deploy"
        echo "  --sync-only    Only sync to S3, don't invalidate CloudFront"
        echo "  --invalidate-only   Only invalidate CloudFront cache"
        echo ""
        exit 0
        ;;
    --build-only)
        check_prerequisites
        generate_version
        build_app
        print_success "Build completed successfully!"
        exit 0
        ;;
    --sync-only)
        check_prerequisites
        sync_to_s3
        print_success "Sync completed successfully!"
        exit 0
        ;;
    --invalidate-only)
        check_prerequisites
        invalidate_cloudfront
        print_success "CloudFront invalidation completed successfully!"
        exit 0
        ;;
    "")
        main
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac