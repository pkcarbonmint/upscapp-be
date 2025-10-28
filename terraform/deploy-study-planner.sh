#!/bin/bash

# Deploy Study Planner (Onboarding2) to S3 and CloudFront
# This script builds the app, uploads to S3, and invalidates CloudFront cache

set -e  # Exit on error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
WORKSPACE_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
ONBOARDING_DIR="${WORKSPACE_ROOT}/study-planner/apps/onboarding2"
DIST_DIR="${ONBOARDING_DIR}/dist"

# AWS Configuration - can be overridden via environment variables or command line
AWS_REGION="${AWS_REGION:-ap-south-1}"
S3_BUCKET="${S3_BUCKET:-study-planner.upscpro.laex.in}"
CLOUDFRONT_DISTRIBUTION_ID="${CLOUDFRONT_DISTRIBUTION_ID:-}"

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --bucket)
      S3_BUCKET="$2"
      shift 2
      ;;
    --region)
      AWS_REGION="$2"
      shift 2
      ;;
    --distribution-id)
      CLOUDFRONT_DISTRIBUTION_ID="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD="true"
      shift
      ;;
    --skip-invalidation)
      SKIP_INVALIDATION="true"
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo ""
      echo "Options:"
      echo "  --bucket BUCKET_NAME              S3 bucket name (default: study-planner.upscpro.laex.in)"
      echo "  --region REGION                   AWS region (default: ap-south-1)"
      echo "  --distribution-id ID              CloudFront distribution ID (auto-detected from terraform output if not provided)"
      echo "  --skip-build                      Skip building the application"
      echo "  --skip-invalidation               Skip CloudFront cache invalidation"
      echo "  --help                            Show this help message"
      echo ""
      echo "Environment Variables:"
      echo "  AWS_REGION                        AWS region"
      echo "  S3_BUCKET                         S3 bucket name"
      echo "  CLOUDFRONT_DISTRIBUTION_ID        CloudFront distribution ID"
      exit 0
      ;;
    *)
      echo -e "${RED}Unknown option: $1${NC}"
      echo "Use --help for usage information"
      exit 1
      ;;
  esac
done

# Functions
log_info() {
  echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
  echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
  echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1"
}

# Check if AWS CLI is installed
check_aws_cli() {
  if ! command -v aws &> /dev/null; then
    log_error "AWS CLI is not installed. Please install it first."
    exit 1
  fi
  log_success "AWS CLI found"
}

# Check if Node.js/npm is installed
check_node() {
  if ! command -v node &> /dev/null; then
    log_error "Node.js is not installed. Please install it first."
    exit 1
  fi
  if ! command -v npm &> /dev/null; then
    log_error "npm is not installed. Please install it first."
    exit 1
  fi
  log_success "Node.js and npm found"
}

# Auto-detect CloudFront distribution ID from Terraform output
get_cloudfront_id() {
  if [[ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    log_info "Auto-detecting CloudFront distribution ID from Terraform output..."
    
    if [[ -f "${SCRIPT_DIR}/terraform.tfstate" ]]; then
      CLOUDFRONT_DISTRIBUTION_ID=$(terraform output -state="${SCRIPT_DIR}/terraform.tfstate" -raw study_planner_cloudfront_id 2>/dev/null || echo "")
      
      if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
        log_success "Found CloudFront distribution ID: $CLOUDFRONT_DISTRIBUTION_ID"
      else
        log_warning "Could not detect CloudFront distribution ID from Terraform output"
        log_warning "CloudFront cache invalidation will be skipped"
        SKIP_INVALIDATION="true"
      fi
    else
      log_warning "Terraform state file not found"
      log_warning "CloudFront cache invalidation will be skipped"
      SKIP_INVALIDATION="true"
    fi
  fi
}

# Build the application
build_app() {
  if [[ "$SKIP_BUILD" == "true" ]]; then
    log_warning "Skipping build step"
    return
  fi

  log_info "Building onboarding application..."
  
  if [[ ! -d "$ONBOARDING_DIR" ]]; then
    log_error "Onboarding directory not found: $ONBOARDING_DIR"
    exit 1
  fi

  cd "$ONBOARDING_DIR"
  
  # Install dependencies
  log_info "Installing dependencies..."
  npm install
  
  # Build the application
  log_info "Running build..."
  npm run build
  
  if [[ ! -d "$DIST_DIR" ]]; then
    log_error "Build failed - dist directory not found"
    exit 1
  fi
  
  log_success "Build completed successfully"
  cd "$SCRIPT_DIR"
}

# Upload to S3
upload_to_s3() {
  log_info "Uploading to S3 bucket: $S3_BUCKET"
  
  if [[ ! -d "$DIST_DIR" ]]; then
    log_error "Dist directory not found: $DIST_DIR"
    log_error "Please build the application first"
    exit 1
  fi

  # Check if bucket exists
  if ! aws s3 ls "s3://${S3_BUCKET}" --region "$AWS_REGION" &> /dev/null; then
    log_error "S3 bucket does not exist or you don't have access: $S3_BUCKET"
    log_error "Please create the bucket using Terraform first"
    exit 1
  fi

  # Sync files to S3
  log_info "Syncing files to S3..."
  aws s3 sync "$DIST_DIR" "s3://${S3_BUCKET}" \
    --region "$AWS_REGION" \
    --delete \
    --cache-control "public, max-age=31536000, immutable" \
    --exclude "index.html" \
    --exclude "*.html"

  # Upload HTML files with no-cache
  log_info "Uploading HTML files with no-cache headers..."
  aws s3 sync "$DIST_DIR" "s3://${S3_BUCKET}" \
    --region "$AWS_REGION" \
    --cache-control "no-cache, no-store, must-revalidate" \
    --content-type "text/html" \
    --exclude "*" \
    --include "*.html"

  log_success "Files uploaded to S3"
}

# Invalidate CloudFront cache
invalidate_cloudfront() {
  if [[ "$SKIP_INVALIDATION" == "true" ]]; then
    log_warning "Skipping CloudFront cache invalidation"
    return
  fi

  if [[ -z "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    log_warning "CloudFront distribution ID not provided, skipping invalidation"
    return
  fi

  log_info "Invalidating CloudFront cache..."
  
  INVALIDATION_ID=$(aws cloudfront create-invalidation \
    --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
    --paths "/*" \
    --query 'Invalidation.Id' \
    --output text)

  if [[ -n "$INVALIDATION_ID" ]]; then
    log_success "CloudFront invalidation created: $INVALIDATION_ID"
    log_info "Waiting for invalidation to complete..."
    
    aws cloudfront wait invalidation-completed \
      --distribution-id "$CLOUDFRONT_DISTRIBUTION_ID" \
      --id "$INVALIDATION_ID"
    
    log_success "CloudFront cache invalidated successfully"
  else
    log_error "Failed to create CloudFront invalidation"
    exit 1
  fi
}

# Main execution
main() {
  log_info "Starting deployment process..."
  log_info "S3 Bucket: $S3_BUCKET"
  log_info "AWS Region: $AWS_REGION"
  echo ""

  # Pre-flight checks
  check_aws_cli
  check_node
  
  # Get CloudFront distribution ID
  get_cloudfront_id
  
  echo ""
  
  # Build application
  build_app
  
  echo ""
  
  # Upload to S3
  upload_to_s3
  
  echo ""
  
  # Invalidate CloudFront cache
  invalidate_cloudfront
  
  echo ""
  log_success "Deployment completed successfully!"
  
  if [[ -n "$CLOUDFRONT_DISTRIBUTION_ID" ]]; then
    log_info "Application URL: https://study-planner.upscpro.laex.in"
  else
    log_info "S3 bucket: $S3_BUCKET"
    log_warning "Configure CloudFront for HTTPS access"
  fi
}

# Run main function
main
