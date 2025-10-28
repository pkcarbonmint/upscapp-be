#!/bin/bash

# Test Study Planner Deployment
# This script tests the deployment setup and verifies everything is working

set -e

# Configuration
BUCKET_NAME="study-planner.upscpro.laex.in"
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

# Test AWS CLI access
test_aws_access() {
    print_status "Testing AWS CLI access..."
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed"
        return 1
    fi
    
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured"
        return 1
    fi
    
    print_success "AWS CLI access verified"
    return 0
}

# Test S3 bucket access
test_s3_bucket() {
    print_status "Testing S3 bucket access..."
    
    if ! aws s3 ls "s3://$BUCKET_NAME" >/dev/null 2>&1; then
        print_error "S3 bucket '$BUCKET_NAME' does not exist or is not accessible"
        return 1
    fi
    
    print_success "S3 bucket access verified"
    return 0
}

# Test CloudFront distribution
test_cloudfront_distribution() {
    print_status "Testing CloudFront distribution..."
    
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='CloudFront distribution for Study Planner Application'].Id" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ -z "$DISTRIBUTION_ID" ]; then
        print_error "CloudFront distribution not found for Study Planner Application"
        return 1
    fi
    
    print_success "CloudFront distribution found: $DISTRIBUTION_ID"
    
    # Get distribution status
    STATUS=$(aws cloudfront get-distribution \
        --id "$DISTRIBUTION_ID" \
        --query "Distribution.Status" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ "$STATUS" = "Deployed" ]; then
        print_success "CloudFront distribution is deployed"
    else
        print_warning "CloudFront distribution status: $STATUS"
    fi
    
    return 0
}

# Test application build
test_application_build() {
    print_status "Testing application build..."
    
    APP_DIR="/workspace/study-planner/apps/onboarding2"
    
    if [ ! -d "$APP_DIR" ]; then
        print_error "Application directory not found: $APP_DIR"
        return 1
    fi
    
    cd "$APP_DIR"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        print_error "package.json not found in $APP_DIR"
        return 1
    fi
    
    # Check if pnpm is available
    if ! command_exists pnpm; then
        print_warning "pnpm not found, installing..."
        npm install -g pnpm
    fi
    
    # Install dependencies
    print_status "Installing dependencies..."
    if ! pnpm install >/dev/null 2>&1; then
        print_error "Failed to install dependencies"
        return 1
    fi
    
    # Test build
    print_status "Testing build process..."
    if ! pnpm run build >/dev/null 2>&1; then
        print_error "Build failed"
        return 1
    fi
    
    # Check if dist directory was created
    if [ ! -d "dist" ]; then
        print_error "Build output directory 'dist' not found"
        return 1
    fi
    
    print_success "Application build test passed"
    return 0
}

# Test deployment script
test_deployment_script() {
    print_status "Testing deployment script..."
    
    SCRIPT_PATH="/workspace/terraform/deploy-study-planner.sh"
    
    if [ ! -f "$SCRIPT_PATH" ]; then
        print_error "Deployment script not found: $SCRIPT_PATH"
        return 1
    fi
    
    if [ ! -x "$SCRIPT_PATH" ]; then
        print_error "Deployment script is not executable"
        return 1
    fi
    
    # Test help option
    if ! "$SCRIPT_PATH" --help >/dev/null 2>&1; then
        print_error "Deployment script help option failed"
        return 1
    fi
    
    print_success "Deployment script test passed"
    return 0
}

# Test Terraform configuration
test_terraform_config() {
    print_status "Testing Terraform configuration..."
    
    TERRAFORM_DIR="/workspace/terraform"
    
    if [ ! -d "$TERRAFORM_DIR" ]; then
        print_error "Terraform directory not found: $TERRAFORM_DIR"
        return 1
    fi
    
    cd "$TERRAFORM_DIR"
    
    # Check if terraform is available
    if ! command_exists terraform; then
        print_error "Terraform is not installed"
        return 1
    fi
    
    # Validate Terraform configuration
    if ! terraform validate >/dev/null 2>&1; then
        print_error "Terraform configuration validation failed"
        return 1
    fi
    
    print_success "Terraform configuration is valid"
    return 0
}

# Main test function
run_tests() {
    print_status "Starting Study Planner deployment tests..."
    
    local tests_passed=0
    local tests_failed=0
    
    # Run tests
    if test_aws_access; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    if test_s3_bucket; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    if test_cloudfront_distribution; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    if test_application_build; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    if test_deployment_script; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    if test_terraform_config; then
        ((tests_passed++))
    else
        ((tests_failed++))
    fi
    
    # Print results
    echo ""
    print_status "Test Results:"
    print_success "Tests passed: $tests_passed"
    if [ $tests_failed -gt 0 ]; then
        print_error "Tests failed: $tests_failed"
    fi
    
    if [ $tests_failed -eq 0 ]; then
        print_success "All tests passed! Deployment setup is ready."
        return 0
    else
        print_error "Some tests failed. Please fix the issues before deploying."
        return 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Test Study Planner Deployment Setup"
        echo ""
        echo "Options:"
        echo "  --help, -h     Show this help message"
        echo "  --aws-only     Test only AWS access and infrastructure"
        echo "  --build-only   Test only application build"
        echo "  --script-only  Test only deployment script"
        echo ""
        exit 0
        ;;
    --aws-only)
        test_aws_access
        test_s3_bucket
        test_cloudfront_distribution
        ;;
    --build-only)
        test_application_build
        ;;
    --script-only)
        test_deployment_script
        test_terraform_config
        ;;
    "")
        run_tests
        ;;
    *)
        print_error "Unknown option: $1"
        echo "Use --help for usage information"
        exit 1
        ;;
esac