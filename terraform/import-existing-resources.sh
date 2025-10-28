#!/bin/bash

# Import Existing Resources Script
# This script helps import existing AWS resources into Terraform state

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

# Check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command_exists aws; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! command_exists terraform; then
        print_error "Terraform is not installed. Please install it first."
        exit 1
    fi
    
    # Check if AWS credentials are configured
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials are not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "Prerequisites check passed"
}

# Function to check if S3 bucket exists
check_s3_bucket() {
    print_status "Checking if S3 bucket exists..."
    
    if aws s3 ls "s3://$BUCKET_NAME" >/dev/null 2>&1; then
        print_success "S3 bucket '$BUCKET_NAME' exists"
        return 0
    else
        print_warning "S3 bucket '$BUCKET_NAME' does not exist"
        return 1
    fi
}

# Function to check if CloudFront distribution exists
check_cloudfront_distribution() {
    print_status "Checking if CloudFront distribution exists..."
    
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='CloudFront distribution for Study Planner Application'].Id" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        print_success "CloudFront distribution exists: $DISTRIBUTION_ID"
        echo "$DISTRIBUTION_ID"
        return 0
    else
        print_warning "CloudFront distribution not found"
        return 1
    fi
}

# Function to import S3 bucket
import_s3_bucket() {
    print_status "Importing S3 bucket..."
    
    if terraform import aws_s3_bucket.study_planner "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket imported successfully"
    else
        print_warning "S3 bucket import failed or already exists in state"
    fi
}

# Function to import S3 bucket versioning
import_s3_versioning() {
    print_status "Importing S3 bucket versioning..."
    
    if terraform import aws_s3_bucket_versioning.study_planner "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket versioning imported successfully"
    else
        print_warning "S3 bucket versioning import failed or already exists in state"
    fi
}

# Function to import S3 bucket public access block
import_s3_public_access_block() {
    print_status "Importing S3 bucket public access block..."
    
    if terraform import aws_s3_bucket_public_access_block.study_planner "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket public access block imported successfully"
    else
        print_warning "S3 bucket public access block import failed or already exists in state"
    fi
}

# Function to import S3 bucket website configuration
import_s3_website_config() {
    print_status "Importing S3 bucket website configuration..."
    
    if terraform import aws_s3_bucket_website_configuration.study_planner "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket website configuration imported successfully"
    else
        print_warning "S3 bucket website configuration import failed or already exists in state"
    fi
}

# Function to import CloudFront distribution
import_cloudfront_distribution() {
    local distribution_id="$1"
    
    print_status "Importing CloudFront distribution..."
    
    if terraform import aws_cloudfront_distribution.study_planner "$distribution_id" 2>/dev/null; then
        print_success "CloudFront distribution imported successfully"
    else
        print_warning "CloudFront distribution import failed or already exists in state"
    fi
}

# Function to import CloudFront OAI
import_cloudfront_oai() {
    print_status "Getting CloudFront OAI ID..."
    
    # Get OAI ID from the distribution
    OAI_ID=$(aws cloudfront get-distribution \
        --id "$1" \
        --query "Distribution.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null | sed 's/.*origin-access-identity\/cloudfront\///')
    
    if [ -n "$OAI_ID" ]; then
        print_status "Importing CloudFront OAI: $OAI_ID"
        if terraform import aws_cloudfront_origin_access_identity.study_planner "$OAI_ID" 2>/dev/null; then
            print_success "CloudFront OAI imported successfully"
        else
            print_warning "CloudFront OAI import failed or already exists in state"
        fi
    else
        print_warning "Could not find CloudFront OAI ID"
    fi
}

# Function to import S3 bucket policy
import_s3_bucket_policy() {
    print_status "Importing S3 bucket policy..."
    
    if terraform import aws_s3_bucket_policy.study_planner "$BUCKET_NAME" 2>/dev/null; then
        print_success "S3 bucket policy imported successfully"
    else
        print_warning "S3 bucket policy import failed or already exists in state"
    fi
}

# Main import function
import_resources() {
    print_status "Starting resource import process..."
    
    # Check if resources exist
    local s3_exists=false
    local cloudfront_exists=false
    local distribution_id=""
    
    if check_s3_bucket; then
        s3_exists=true
    fi
    
    if distribution_id=$(check_cloudfront_distribution); then
        cloudfront_exists=true
    fi
    
    if [ "$s3_exists" = false ] && [ "$cloudfront_exists" = false ]; then
        print_warning "No existing resources found. Nothing to import."
        return 0
    fi
    
    # Import S3 resources
    if [ "$s3_exists" = true ]; then
        print_status "Importing S3 resources..."
        import_s3_bucket
        import_s3_versioning
        import_s3_public_access_block
        import_s3_website_config
        import_s3_bucket_policy
    fi
    
    # Import CloudFront resources
    if [ "$cloudfront_exists" = true ]; then
        print_status "Importing CloudFront resources..."
        import_cloudfront_distribution "$distribution_id"
        import_cloudfront_oai "$distribution_id"
    fi
    
    print_success "Resource import process completed"
}

# Function to show import commands
show_import_commands() {
    print_status "Import commands for manual execution:"
    echo ""
    echo "# S3 Bucket"
    echo "terraform import aws_s3_bucket.study_planner $BUCKET_NAME"
    echo ""
    echo "# S3 Bucket Versioning"
    echo "terraform import aws_s3_bucket_versioning.study_planner $BUCKET_NAME"
    echo ""
    echo "# S3 Bucket Public Access Block"
    echo "terraform import aws_s3_bucket_public_access_block.study_planner $BUCKET_NAME"
    echo ""
    echo "# S3 Bucket Website Configuration"
    echo "terraform import aws_s3_bucket_website_configuration.study_planner $BUCKET_NAME"
    echo ""
    echo "# S3 Bucket Policy"
    echo "terraform import aws_s3_bucket_policy.study_planner $BUCKET_NAME"
    echo ""
    
    # Get CloudFront distribution ID
    DISTRIBUTION_ID=$(aws cloudfront list-distributions \
        --query "DistributionList.Items[?Comment=='CloudFront distribution for Study Planner Application'].Id" \
        --output text \
        --region "$AWS_REGION" 2>/dev/null)
    
    if [ -n "$DISTRIBUTION_ID" ]; then
        echo "# CloudFront Distribution"
        echo "terraform import aws_cloudfront_distribution.study_planner $DISTRIBUTION_ID"
        echo ""
        
        # Get OAI ID
        OAI_ID=$(aws cloudfront get-distribution \
            --id "$DISTRIBUTION_ID" \
            --query "Distribution.DistributionConfig.Origins.Items[0].S3OriginConfig.OriginAccessIdentity" \
            --output text \
            --region "$AWS_REGION" 2>/dev/null | sed 's/.*origin-access-identity\/cloudfront\///')
        
        if [ -n "$OAI_ID" ]; then
            echo "# CloudFront OAI"
            echo "terraform import aws_cloudfront_origin_access_identity.study_planner $OAI_ID"
        fi
    fi
}

# Main execution
main() {
    check_prerequisites
    
    case "${1:-}" in
        --help|-h)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Import existing AWS resources into Terraform state"
            echo ""
            echo "Options:"
            echo "  --help, -h     Show this help message"
            echo "  --auto         Automatically import all existing resources"
            echo "  --show-cmds    Show import commands for manual execution"
            echo "  --check-only   Only check if resources exist, don't import"
            echo ""
            exit 0
            ;;
        --auto)
            import_resources
            ;;
        --show-cmds)
            show_import_commands
            ;;
        --check-only)
            check_s3_bucket
            check_cloudfront_distribution
            ;;
        "")
            print_status "No action specified. Use --help for options."
            echo ""
            echo "Available options:"
            echo "  --auto         Automatically import all existing resources"
            echo "  --show-cmds    Show import commands for manual execution"
            echo "  --check-only   Only check if resources exist, don't import"
            echo "  --help         Show detailed help"
            ;;
        *)
            print_error "Unknown option: $1"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
}

main "$@"