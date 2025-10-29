#!/bin/bash

# Script to stop EC2 instances, RDS database, and NAT Gateways managed by Terraform
# This script safely stops all resources without destroying the infrastructure

set -e

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

# Get EC2 instance IDs from Terraform state
get_instance_ids() {
    print_status "Getting EC2 instance IDs from Terraform state..."
    
    # Get instance IDs
    DOCKER_INSTANCE_ID=$(terraform output -raw docker_instance_id 2>/dev/null || echo "")
    STRAPI_INSTANCE_ID=$(terraform output -raw strapi_instance_id 2>/dev/null || echo "")
    
    if [ -z "$DOCKER_INSTANCE_ID" ] && [ -z "$STRAPI_INSTANCE_ID" ]; then
        print_warning "No EC2 instances found in Terraform state"
        return 1
    fi
    
    echo "$DOCKER_INSTANCE_ID $STRAPI_INSTANCE_ID"
}

# Get RDS instance identifier from Terraform state
get_rds_identifier() {
    PROJECT_NAME=$(terraform output -raw project_name 2>/dev/null || echo "")
    if [ -n "$PROJECT_NAME" ]; then
        echo "${PROJECT_NAME}-db"
    else
        echo ""
    fi
}

# Stop RDS instance
stop_rds_instance() {
    local db_identifier=$1
    
    if [ -z "$db_identifier" ]; then
        print_warning "Skipping RDS instance (no identifier found)"
        return
    fi
    
    print_status "Checking RDS instance: $db_identifier"
    
    # Get current state
    CURRENT_STATE=$(aws rds describe-db-instances \
        --db-instance-identifier "$db_identifier" \
        --query 'DBInstances[0].DBInstanceStatus' \
        --output text \
        --region ap-south-1 2>/dev/null || echo "unknown")
    
    if [ "$CURRENT_STATE" == "unknown" ]; then
        print_warning "RDS instance $db_identifier not found or not accessible"
        return 0
    fi
    
    if [ "$CURRENT_STATE" == "stopped" ]; then
        print_warning "RDS instance $db_identifier is already stopped"
        return 0
    fi
    
    if [ "$CURRENT_STATE" == "stopping" ]; then
        print_warning "RDS instance $db_identifier is already stopping"
        return 0
    fi
    
    if [ "$CURRENT_STATE" != "available" ]; then
        print_warning "RDS instance $db_identifier is in state: $CURRENT_STATE"
        return 0
    fi
    
    # Stop the RDS instance
    print_status "Stopping RDS instance..."
    aws rds stop-db-instance \
        --db-instance-identifier "$db_identifier" \
        --region ap-south-1 > /dev/null 2>&1
    
    # Wait for instance to stop (manually poll since there's no wait command for stopped)
    print_status "Waiting for RDS instance to stop..."
    MAX_WAIT=300  # 5 minutes
    ELAPSED=0
    while [ $ELAPSED -lt $MAX_WAIT ]; do
        CURRENT_STATE=$(aws rds describe-db-instances \
            --db-instance-identifier "$db_identifier" \
            --query 'DBInstances[0].DBInstanceStatus' \
            --output text \
            --region ap-south-1 2>/dev/null || echo "unknown")
        
        if [ "$CURRENT_STATE" == "stopped" ]; then
            break
        elif [ "$CURRENT_STATE" == "stopping" ]; then
            sleep 5
            ELAPSED=$((ELAPSED + 5))
            printf "."
        else
            sleep 2
            ELAPSED=$((ELAPSED + 2))
            printf "."
        fi
    done
    echo ""
    
    if [ "$CURRENT_STATE" == "stopped" ]; then
        print_success "RDS instance stopped: $db_identifier"
    else
        print_warning "RDS instance may still be stopping. Current state: $CURRENT_STATE"
    fi
}

# Stop EC2 instance
stop_instance() {
    local instance_id=$1
    local instance_type=$2
    
    if [ -z "$instance_id" ]; then
        print_warning "Skipping $instance_type (no instance ID found)"
        return
    fi
    
    print_status "Stopping $instance_type instance: $instance_id"
    
    # Get current state
    CURRENT_STATE=$(aws ec2 describe-instances \
        --instance-ids "$instance_id" \
        --query 'Reservations[0].Instances[0].State.Name' \
        --output text \
        --region ap-south-1 2>/dev/null || echo "unknown")
    
    if [ "$CURRENT_STATE" == "unknown" ]; then
        print_error "Could not get state for instance $instance_id"
        return 1
    fi
    
    if [ "$CURRENT_STATE" == "stopped" ]; then
        print_warning "Instance $instance_id is already stopped"
        return 0
    fi
    
    if [ "$CURRENT_STATE" == "stopping" ]; then
        print_warning "Instance $instance_id is already stopping"
        return 0
    fi
    
    if [ "$CURRENT_STATE" != "running" ]; then
        print_warning "Instance $instance_id is in state: $CURRENT_STATE"
        return 0
    fi
    
    # Stop the instance
    print_status "Stopping instance..."
    aws ec2 stop-instances \
        --instance-ids "$instance_id" \
        --region ap-south-1 > /dev/null 2>&1
    
    # Wait for instance to stop
    print_status "Waiting for instance to stop..."
    aws ec2 wait instance-stopped \
        --instance-ids "$instance_id" \
        --region ap-south-1
    
    print_success "$instance_type instance stopped: $instance_id"
}

# Disable NAT Gateways
disable_nat_gateways() {
    print_status "Checking NAT Gateway configuration..."
    
    # Check if NAT Gateways are enabled
    if [ -f "terraform.tfvars" ]; then
        NAT_ENABLED=$(grep -E "^enable_nat_gateway" terraform.tfvars | grep -oE "true|false" || echo "")
        
        if [ "$NAT_ENABLED" == "false" ]; then
            print_warning "NAT Gateways are already disabled"
            return 0
        fi
        
        if [ "$NAT_ENABLED" == "true" ]; then
            print_status "Disabling NAT Gateways..."
            
            # Backup the original file
            cp terraform.tfvars terraform.tfvars.backup
            
            # Update to disable NAT Gateway
            sed -i 's/^enable_nat_gateway = true/enable_nat_gateway = false/' terraform.tfvars
            
            # Apply the change using Terraform
            print_status "Applying Terraform changes to disable NAT Gateways..."
            if terraform apply -target=aws_nat_gateway.main -target=aws_eip.nat -auto-approve 2>&1; then
                print_success "NAT Gateways disabled successfully"
            else
                print_warning "Failed to disable NAT Gateways with Terraform, restoring backup..."
                mv terraform.tfvars.backup terraform.tfvars
                return 1
            fi
        fi
    else
        print_warning "terraform.tfvars not found, skipping NAT Gateway changes"
    fi
}

# Main execution
main() {
    print_status "Stopping EC2 instances, RDS database, and NAT Gateways..."
    
    # Check if terraform is in the current directory
    if [ ! -f "main.tf" ]; then
        print_error "Not in Terraform directory. Please run from terraform/"
        exit 1
    fi
    
    # Check if terraform is initialized
    if [ ! -f "terraform.tfstate" ]; then
        print_error "Terraform state not found. Please run 'terraform init' first"
        exit 1
    fi
    
    # Get instance IDs
    INSTANCE_IDS=$(get_instance_ids)
    if [ $? -ne 0 ]; then
        print_error "Failed to get instance IDs"
        exit 1
    fi
    
    # Check if AWS CLI is available
    if ! command -v aws &> /dev/null; then
        print_error "AWS CLI is not installed"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity >/dev/null 2>&1; then
        print_error "AWS credentials not configured"
        exit 1
    fi
    
    # Stop EC2 instances
    DOCKER_INSTANCE_ID=$(terraform output -raw docker_instance_id 2>/dev/null || echo "")
    STRAPI_INSTANCE_ID=$(terraform output -raw strapi_instance_id 2>/dev/null || echo "")
    
    if [ -n "$DOCKER_INSTANCE_ID" ]; then
        stop_instance "$DOCKER_INSTANCE_ID" "Docker"
    fi
    
    if [ -n "$STRAPI_INSTANCE_ID" ]; then
        stop_instance "$STRAPI_INSTANCE_ID" "Strapi"
    fi
    
    # Stop RDS instance
    RDS_IDENTIFIER=$(get_rds_identifier)
    if [ -n "$RDS_IDENTIFIER" ]; then
        stop_rds_instance "$RDS_IDENTIFIER"
    fi
    
    # Disable NAT Gateways
    disable_nat_gateways
    
    print_success "All EC2 instances, RDS database, and NAT Gateways stopped/disabled!"
    print_status "To start them again, run: ./start-instances.sh"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Stop EC2 instances, RDS database, and NAT Gateways managed by Terraform"
        echo ""
        echo "This script safely stops all EC2 instances and RDS database without destroying them."
        echo "NAT Gateways will be disabled by updating Terraform configuration."
        echo "The instances and database can be started again with start-instances.sh"
        echo ""
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

