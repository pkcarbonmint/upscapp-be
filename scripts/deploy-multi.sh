#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
PROVIDER=${PROVIDER:-"digitalocean"}
TERRAFORM_DIR=""

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
    echo ""
    echo "2. AWS (More features, higher cost)"
    echo "   • ECS Fargate: ~$120-200/month"
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
    
    # Set terraform directory based on provider
    case $PROVIDER in
        "digitalocean")
            TERRAFORM_DIR="terraform-digitalocean"
            ;;
        "aws")
            TERRAFORM_DIR="terraform"
            ;;
    esac
    
    print_status "Selected provider: $PROVIDER"
    print_status "Using Terraform directory: $TERRAFORM_DIR"
}

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites for $PROVIDER..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
        print_error "Visit: https://developer.hashicorp.com/terraform/downloads"
        exit 1
    fi
    
    case $PROVIDER in
        "digitalocean")
            # Check doctl
            if ! command -v doctl &> /dev/null; then
                print_error "DigitalOcean CLI (doctl) is not installed."
                print_error "Please install it: https://docs.digitalocean.com/reference/doctl/how-to/install/"
                exit 1
            fi
            
            if ! doctl auth list | grep -q "default"; then
                print_error "DigitalOcean CLI is not authenticated."
                print_error "Please run: doctl auth init"
                exit 1
            fi
            ;;
        "aws")
            # Check AWS CLI
            if ! command -v aws &> /dev/null; then
                print_error "AWS CLI is not installed. Please install it first."
                exit 1
            fi
            
            if ! aws sts get-caller-identity &> /dev/null; then
                print_error "AWS CLI is not configured. Please run 'aws configure' first."
                exit 1
            fi
            ;;
    esac
    
    # Check if terraform.tfvars exists
    local tfvars_file="$TERRAFORM_DIR/terraform.tfvars"
    if [ ! -f "$tfvars_file" ]; then
        print_error "terraform.tfvars file not found!"
        print_error "Please create $tfvars_file from terraform.tfvars.example"
        print_error "Run: cp $TERRAFORM_DIR/terraform.tfvars.example $tfvars_file"
        exit 1
    fi
    
    print_success "All prerequisites met for $PROVIDER"
}

# Function to initialize Terraform
terraform_init() {
    print_status "Initializing Terraform for $PROVIDER..."
    
    cd $TERRAFORM_DIR
    
    if [ ! -d ".terraform" ]; then
        terraform init
    else
        terraform init -upgrade
    fi
    
    print_success "Terraform initialized successfully"
}

# Function to validate Terraform configuration
terraform_validate() {
    print_status "Validating Terraform configuration..."
    
    terraform validate
    
    print_success "Terraform configuration is valid"
}

# Function to plan Terraform deployment
terraform_plan() {
    print_status "Creating Terraform plan..."
    
    terraform plan -out=tfplan
    
    print_success "Terraform plan created successfully"
    
    # Show estimated costs for DigitalOcean
    if [ "$PROVIDER" = "digitalocean" ]; then
        print_status "Estimated Monthly Costs:"
        echo "  • App Platform instances: ~$15-45"
        echo "  • Database (PostgreSQL): ~$15"
        echo "  • Redis: ~$15"
        echo "  • Load Balancer: ~$12"
        echo "  • Container Registry: Free"
        echo "  • Total: ~$57-87/month"
    fi
}

# Function to apply Terraform deployment
terraform_apply() {
    print_status "Applying Terraform configuration for $PROVIDER..."
    
    read -p "Do you want to proceed with the deployment? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    terraform apply tfplan
    
    print_success "Infrastructure deployed successfully on $PROVIDER!"
    
    # Show important outputs
    print_status "Important Information:"
    echo "========================"
    
    case $PROVIDER in
        "digitalocean")
            echo "Application URL: $(terraform output -raw application_url 2>/dev/null || echo 'Not available yet')"
            echo "App Platform URL: $(terraform output -raw app_platform_live_url 2>/dev/null || echo 'Not using App Platform')"
            echo "Load Balancer IP: $(terraform output -raw load_balancer_ip 2>/dev/null || echo 'Not available')"
            echo "Registry: $(terraform output -raw registry_endpoint 2>/dev/null || echo 'Not available')"
            ;;
        "aws")
            echo "Load Balancer URL: $(terraform output -raw alb_url 2>/dev/null || echo 'Not available')"
            echo "ECR App Repository: $(terraform output -raw ecr_repository_app_url 2>/dev/null || echo 'Not available')"
            echo "ECS Cluster Name: $(terraform output -raw ecs_cluster_name 2>/dev/null || echo 'Not available')"
            ;;
    esac
    
    echo "========================"
    
    # Show next steps
    echo ""
    print_status "Next Steps:"
    echo "1. Build and push images: ./scripts/build-multi.sh $PROVIDER"
    echo "2. Monitor deployment: ./scripts/manage-multi.sh status"
    echo "3. View logs: ./scripts/manage-multi.sh logs"
}

# Function to destroy infrastructure
terraform_destroy() {
    print_warning "This will destroy all infrastructure created by Terraform on $PROVIDER!"
    read -p "Are you absolutely sure you want to destroy everything? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Destroy cancelled"
        exit 0
    fi
    
    print_status "Destroying infrastructure on $PROVIDER..."
    terraform destroy -auto-approve
    
    print_success "Infrastructure destroyed successfully"
}

# Function to show outputs
show_outputs() {
    cd $TERRAFORM_DIR
    
    print_status "Terraform Outputs for $PROVIDER:"
    terraform output
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND] [PROVIDER]"
    echo ""
    echo "Commands:"
    echo "  init      Initialize Terraform"
    echo "  plan      Create Terraform plan"
    echo "  apply     Apply Terraform configuration"
    echo "  destroy   Destroy infrastructure"
    echo "  validate  Validate Terraform configuration"
    echo "  output    Show Terraform outputs"
    echo "  help      Show this help message"
    echo ""
    echo "Providers:"
    echo "  digitalocean, do    Use DigitalOcean (default)"
    echo "  aws                 Use AWS"
    echo ""
    echo "Environment Variables:"
    echo "  PROVIDER            Override provider selection"
    echo ""
    echo "Examples:"
    echo "  $0 apply digitalocean    # Deploy to DigitalOcean"
    echo "  $0 apply aws            # Deploy to AWS"
    echo "  $0 destroy do           # Destroy DigitalOcean infrastructure"
    echo ""
    echo "If no command is provided, the script will run init, validate, plan, and apply in sequence."
}

# Main function
main() {
    local command=${1:-"deploy"}
    local provider_arg=${2:-}
    
    # Override provider if specified
    if [ -n "$provider_arg" ]; then
        case $provider_arg in
            "digitalocean"|"do")
                PROVIDER="digitalocean"
                PROVIDER_OVERRIDE=true
                ;;
            "aws")
                PROVIDER="aws"
                PROVIDER_OVERRIDE=true
                ;;
            *)
                print_error "Unknown provider: $provider_arg"
                show_help
                exit 1
                ;;
        esac
    fi
    
    case $command in
        "init")
            show_provider_selection
            check_prerequisites
            terraform_init
            ;;
        "validate")
            show_provider_selection
            check_prerequisites
            cd $TERRAFORM_DIR
            terraform_validate
            ;;
        "plan")
            show_provider_selection
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            ;;
        "apply")
            show_provider_selection
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            terraform_apply
            ;;
        "destroy")
            show_provider_selection
            check_prerequisites
            cd $TERRAFORM_DIR
            terraform_destroy
            ;;
        "output")
            show_provider_selection
            show_outputs
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "deploy")
            print_status "Starting full deployment process..."
            show_provider_selection
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            terraform_apply
            ;;
        "digitalocean"|"do"|"aws")
            # Handle case where provider is passed as first argument
            PROVIDER=$command
            PROVIDER_OVERRIDE=true
            main "deploy"
            ;;
        *)
            print_error "Unknown command: $command"
            show_help
            exit 1
            ;;
    esac
}

# Run main function
main "$@"