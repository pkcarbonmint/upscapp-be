#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROVIDER=${PROVIDER:-"digitalocean"}  # Default to DigitalOcean (cheaper)
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

# Function to show provider selection
show_provider_selection() {
    echo -e "${BLUE}=== Cloud Provider Selection ===${NC}"
    echo "1. DigitalOcean (Recommended - More affordable)"
    echo "   • App Platform: ~$48-78/month"
    echo "   • Droplets: ~$33-63/month"
    echo "   • Simpler setup, managed services"
    echo ""
    echo "2. AWS (More features, higher cost)"
    echo "   • ECS Fargate: ~$120-200/month"
    echo "   • More services and features"
    echo "   • Better for enterprise/scale"
    echo ""
    
    if [ -z "$PROVIDER_OVERRIDE" ]; then
        read -p "Choose provider (1 for DigitalOcean, 2 for AWS): " choice
        case $choice in
            1) PROVIDER="digitalocean" ;;
            2) PROVIDER="aws" ;;
            *) 
                print_error "Invalid choice. Using DigitalOcean as default."
                PROVIDER="digitalocean"
                ;;
        esac
    fi
    
    print_status "Selected provider: $PROVIDER"
}

# Function to check DigitalOcean CLI
check_doctl() {
    if ! command -v doctl &> /dev/null; then
        print_error "DigitalOcean CLI (doctl) is not installed."
        print_status "Installing doctl..."
        
        # Install doctl
        if [[ "$OSTYPE" == "darwin"* ]]; then
            brew install doctl
        elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
            cd ~
            wget https://github.com/digitalocean/doctl/releases/download/v1.98.0/doctl-1.98.0-linux-amd64.tar.gz
            tar xf doctl-1.98.0-linux-amd64.tar.gz
            sudo mv doctl /usr/local/bin
        else
            print_error "Please install doctl manually: https://docs.digitalocean.com/reference/doctl/how-to/install/"
            exit 1
        fi
    fi
    
    if ! doctl auth list | grep -q "default"; then
        print_error "DigitalOcean CLI is not authenticated."
        print_status "Please run: doctl auth init"
        exit 1
    fi
    
    print_success "DigitalOcean CLI is configured"
}

# Function to check AWS CLI
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

# Function to check Docker
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

# Function to login to DigitalOcean Container Registry
do_registry_login() {
    print_status "Logging into DigitalOcean Container Registry..."
    doctl registry login
    print_success "Logged into DigitalOcean Container Registry"
}

# Function to login to AWS ECR
aws_ecr_login() {
    print_status "Logging into AWS ECR..."
    
    # Get region from AWS config or use default
    AWS_REGION=$(aws configure get region || echo "us-west-2")
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    print_success "Logged into AWS ECR"
}

# Function to build images for DigitalOcean
build_do_images() {
    print_status "Building images for DigitalOcean..."
    
    # Get registry endpoint
    REGISTRY_NAME=$(doctl registry get --format Name --no-header 2>/dev/null || echo "$PROJECT_NAME")
    
    if [ "$REGISTRY_NAME" = "" ] || ! doctl registry get $REGISTRY_NAME &>/dev/null; then
        print_status "Creating DigitalOcean Container Registry..."
        doctl registry create $PROJECT_NAME --region nyc3
        REGISTRY_NAME=$PROJECT_NAME
    fi
    
    REGISTRY_ENDPOINT="registry.digitalocean.com/$REGISTRY_NAME"
    
    # Build and push app image
    print_status "Building app image..."
    docker build -f Dockerfile.prod -t $REGISTRY_ENDPOINT/app:$IMAGE_TAG .
    docker push $REGISTRY_ENDPOINT/app:$IMAGE_TAG
    print_success "App image pushed to DigitalOcean"
    
    # Build and push helios image
    print_status "Building helios image..."
    docker build -f study-planner/Dockerfile --target runtime -t $REGISTRY_ENDPOINT/helios:$IMAGE_TAG .
    docker push $REGISTRY_ENDPOINT/helios:$IMAGE_TAG
    print_success "Helios image pushed to DigitalOcean"
    
    # Build and push frontend image (if using droplets)
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t $REGISTRY_ENDPOINT/frontend:$IMAGE_TAG .
    docker push $REGISTRY_ENDPOINT/frontend:$IMAGE_TAG
    print_success "Frontend image pushed to DigitalOcean"
}

# Function to build images for AWS
build_aws_images() {
    print_status "Building images for AWS..."
    
    AWS_REGION=$(aws configure get region || echo "us-west-2")
    AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)
    ECR_REGISTRY="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    
    # Build and push app image
    print_status "Building app image..."
    docker build -f Dockerfile.prod -t $PROJECT_NAME-app:$IMAGE_TAG .
    docker tag $PROJECT_NAME-app:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-app:$IMAGE_TAG
    docker push $ECR_REGISTRY/$PROJECT_NAME-app:$IMAGE_TAG
    print_success "App image pushed to AWS ECR"
    
    # Build and push helios image
    print_status "Building helios image..."
    docker build -f study-planner/Dockerfile --target runtime -t $PROJECT_NAME-helios:$IMAGE_TAG .
    docker tag $PROJECT_NAME-helios:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-helios:$IMAGE_TAG
    docker push $ECR_REGISTRY/$PROJECT_NAME-helios:$IMAGE_TAG
    print_success "Helios image pushed to AWS ECR"
    
    # Build and push frontend image
    print_status "Building frontend image..."
    docker build -f Dockerfile.frontend -t $PROJECT_NAME-frontend:$IMAGE_TAG .
    docker tag $PROJECT_NAME-frontend:$IMAGE_TAG $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG
    docker push $ECR_REGISTRY/$PROJECT_NAME-frontend:$IMAGE_TAG
    print_success "Frontend image pushed to AWS ECR"
}

# Function to show cost comparison
show_cost_comparison() {
    echo -e "${BLUE}=== Monthly Cost Comparison ===${NC}"
    echo ""
    echo "🟢 DigitalOcean (Recommended for most users):"
    echo "   App Platform (PaaS):     ~$48-78/month"
    echo "   Droplets (IaaS):         ~$33-63/month"
    echo "   ✅ Simpler setup and management"
    echo "   ✅ Predictable pricing"
    echo "   ✅ Good performance for small-medium apps"
    echo ""
    echo "🔵 AWS (Enterprise/Scale):"
    echo "   ECS Fargate:             ~$120-200/month"
    echo "   ✅ More services and integrations"
    echo "   ✅ Better for high-scale applications"
    echo "   ⚠️  More complex setup and pricing"
    echo ""
    echo "💡 Recommendation: Start with DigitalOcean, migrate to AWS later if needed"
    echo ""
}

# Main function
main() {
    print_status "Multi-Cloud Docker Image Build Script"
    print_status "======================================"
    
    # Show cost comparison
    show_cost_comparison
    
    # Provider selection
    show_provider_selection
    
    # Check prerequisites based on provider
    case $PROVIDER in
        "digitalocean")
            check_doctl
            check_docker
            do_registry_login
            build_do_images
            ;;
        "aws")
            check_aws_cli
            check_docker
            aws_ecr_login
            build_aws_images
            ;;
        *)
            print_error "Unknown provider: $PROVIDER"
            exit 1
            ;;
    esac
    
    print_success "Build completed successfully for $PROVIDER!"
    print_status "Images tagged with: $IMAGE_TAG"
    
    # Show next steps
    echo ""
    print_status "Next steps:"
    case $PROVIDER in
        "digitalocean")
            echo "1. Run: ./scripts/deploy-multi.sh"
            echo "2. Or: cd terraform-digitalocean && terraform apply"
            ;;
        "aws")
            echo "1. Run: ./scripts/deploy-multi.sh"
            echo "2. Or: cd terraform && terraform apply"
            ;;
    esac
}

# Handle command line arguments
case "${1:-}" in
    "aws")
        PROVIDER="aws"
        PROVIDER_OVERRIDE=true
        ;;
    "do"|"digitalocean")
        PROVIDER="digitalocean"
        PROVIDER_OVERRIDE=true
        ;;
    "help"|"--help"|"-h")
        echo "Usage: $0 [PROVIDER]"
        echo ""
        echo "Providers:"
        echo "  digitalocean, do    Build for DigitalOcean (default)"
        echo "  aws                 Build for AWS"
        echo ""
        echo "Environment variables:"
        echo "  PROVIDER            Override provider (digitalocean|aws)"
        echo "  PROJECT_NAME        Project name (default: upscpro)"
        echo "  IMAGE_TAG           Image tag (default: latest)"
        exit 0
        ;;
    "")
        # No argument, use interactive selection
        ;;
    *)
        print_error "Unknown provider: $1"
        echo "Use '$0 help' for usage information"
        exit 1
        ;;
esac

# Run main function
main "$@"