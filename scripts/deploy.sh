#!/bin/bash

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
TERRAFORM_DIR="terraform"
TFVARS_FILE="$TERRAFORM_DIR/terraform.tfvars"

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

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if Terraform is installed
    if ! command -v terraform &> /dev/null; then
        print_error "Terraform is not installed. Please install it first."
        print_error "Visit: https://developer.hashicorp.com/terraform/downloads"
        exit 1
    fi
    
    # Check if AWS CLI is configured
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    if ! aws sts get-caller-identity &> /dev/null; then
        print_error "AWS CLI is not configured. Please run 'aws configure' first."
        exit 1
    fi
    
    # Check if terraform.tfvars exists
    if [ ! -f "$TFVARS_FILE" ]; then
        print_error "terraform.tfvars file not found!"
        print_error "Please create $TFVARS_FILE from terraform.tfvars.example"
        print_error "Run: cp $TERRAFORM_DIR/terraform.tfvars.example $TFVARS_FILE"
        exit 1
    fi
    
    print_success "All prerequisites met"
}

# Function to initialize Terraform
terraform_init() {
    print_status "Initializing Terraform..."
    
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
}

# Function to apply Terraform deployment
terraform_apply() {
    print_status "Applying Terraform configuration..."
    
    read -p "Do you want to proceed with the deployment? (y/N): " confirm
    if [[ $confirm != [yY] && $confirm != [yY][eE][sS] ]]; then
        print_warning "Deployment cancelled"
        exit 0
    fi
    
    terraform apply tfplan
    
    print_success "Infrastructure deployed successfully!"
    
    # Show important outputs
    print_status "Important Information:"
    echo "========================"
    echo "Load Balancer URL: $(terraform output -raw alb_url 2>/dev/null || echo 'Not available')"
    echo "ECR App Repository: $(terraform output -raw ecr_repository_app_url 2>/dev/null || echo 'Not available')"
    echo "ECR Helios Repository: $(terraform output -raw ecr_repository_helios_url 2>/dev/null || echo 'Not available')"
    echo "ECR Frontend Repository: $(terraform output -raw ecr_repository_frontend_url 2>/dev/null || echo 'Not available')"
    echo "ECS Cluster Name: $(terraform output -raw ecs_cluster_name 2>/dev/null || echo 'Not available')"
    echo "========================"
}

# Function to destroy infrastructure
terraform_destroy() {
    print_warning "This will destroy all infrastructure created by Terraform!"
    read -p "Are you absolutely sure you want to destroy everything? (yes/no): " confirm
    
    if [ "$confirm" != "yes" ]; then
        print_warning "Destroy cancelled"
        exit 0
    fi
    
    print_status "Destroying infrastructure..."
    terraform destroy -auto-approve
    
    print_success "Infrastructure destroyed successfully"
}

# Function to show help
show_help() {
    echo "Usage: $0 [COMMAND]"
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
    echo "If no command is provided, the script will run init, validate, plan, and apply in sequence."
}

# Function to show outputs
show_outputs() {
    cd $TERRAFORM_DIR
    
    print_status "Terraform Outputs:"
    terraform output
}

# Main function
main() {
    local command=${1:-"deploy"}
    
    case $command in
        "init")
            check_prerequisites
            terraform_init
            ;;
        "validate")
            check_prerequisites
            cd $TERRAFORM_DIR
            terraform_validate
            ;;
        "plan")
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            ;;
        "apply")
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            terraform_apply
            ;;
        "destroy")
            check_prerequisites
            cd $TERRAFORM_DIR
            terraform_destroy
            ;;
        "output")
            show_outputs
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        "deploy")
            print_status "Starting full deployment process..."
            check_prerequisites
            terraform_init
            terraform_validate
            terraform_plan
            terraform_apply
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