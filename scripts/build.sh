#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
AWS_REGION=${AWS_REGION:-"us-west-2"}
PROJECT_NAME=${PROJECT_NAME:-"upscpro"}
IMAGE_TAG=${IMAGE_TAG:-"latest"}

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

# Function to check if AWS CLI is configured
check_aws_cli() {
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    print_success "AWS CLI is configured"
}

# Function to check if Docker is running
check_docker() {
    if ! command -v docker &> /dev/null; then
        print_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    if ! docker info &> /dev/null; then
        print_error "Docker daemon is not running. Please start Docker first."
        exit 1
    fi
    
    print_success "Docker is available"
}

# Function to get ECR login token
ecr_login() {
    print_status "Logging into ECR..."
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    # Login to ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    print_success "Logged into ECR successfully"
}

# Function to build and push Docker images
build_and_push_images() {
    print_status "Building and pushing Docker images..."
    
    # Get AWS account ID
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build and push app image
    print_status "Building app image..."
    docker build -f Dockerfile.prod -t $PROJECT_NAME-app:$IMAGE_TAG .
    docker tag $PROJECT_NAME-app:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-app:$IMAGE_TAG
    
    print_status "Pushing app image to ECR..."
    docker push $ECR_REGISTRY/$PROJECT_NAME-app:$IMAGE_TAG
    print_success "App image pushed successfully"
    
    # Build and push helios image (assuming it uses the TypeScript/Haskell Dockerfile)
    print_status "Building helios image..."
    docker build -f study-planner/Dockerfile --target runtime -t $PROJECT_NAME-helios:$IMAGE_TAG .
    docker tag $PROJECT_NAME-helios:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-helios:$IMAGE_TAG
    
    print_status "Pushing helios image to ECR..."
    docker push $ECR_REGISTRY/$PROJECT_NAME-helios:$IMAGE_TAG
    print_success "Helios image pushed successfully"
    
    # Build and push frontend image
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t $PROJECT_NAME-frontend:$IMAGE_TAG .
    docker tag $PROJECT_NAME-frontend:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG
    
    print_status "Pushing frontend image to ECR..."
    docker push $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG
    print_success "Frontend image pushed successfully"
    
    print_success "All images built and pushed successfully!"
}

# Main function
main() {
    print_status "Starting Docker image build and push process..."
    
    # Check prerequisites
    check_aws_cli
    check_docker
    
    # Login to ECR
    ecr_login
    
    # Build and push images
    build_and_push_images
    
    print_success "Build and push completed successfully!"
    print_status "Images tagged with: $IMAGE_TAG"
    print_status "AWS Region: $AWS_REGION"
}

# Run main function
main "$@"