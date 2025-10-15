#!/bin/bash

# Cleanup script for partial Terraform resources
# This script helps clean up resources created in the wrong region

set -e

echo "🧹 Terraform Resource Cleanup"
echo "============================="

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Error: AWS credentials not found in environment variables"
    echo "Please set the following environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-access-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    exit 1
fi

# Set region to us-west-2 for cleanup
export AWS_DEFAULT_REGION=us-west-2
echo "📍 Cleaning up resources in region: $AWS_DEFAULT_REGION"

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Error: Terraform is not installed"
    exit 1
fi

echo "✅ Terraform found: $(terraform version | head -n1)"

# Check if terraform.tfstate exists
if [ -f "terraform.tfstate" ]; then
    echo "📋 Found existing Terraform state file"
    
    # Show what resources exist in state
    echo ""
    echo "📊 Resources in current state:"
    terraform state list | head -10
    echo "..."
    
    # Ask for confirmation
    echo ""
    echo "⚠️  This will destroy ALL resources in the current state."
    echo "💰 This will stop all AWS charges for these resources."
    echo ""
    read -p "Do you want to proceed with cleanup? (yes/no): " -r
    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        echo "❌ Cleanup cancelled"
        exit 0
    fi
    
    # Destroy resources
    echo "🗑️  Destroying resources..."
    terraform destroy -auto-approve
    
    echo "✅ Resources destroyed successfully!"
    
else
    echo "⚠️  No terraform.tfstate file found"
    echo "   This means either:"
    echo "   1. No resources were created yet, or"
    echo "   2. State file was already removed"
fi

# Clean up local state files
echo ""
echo "🧹 Cleaning up local state files..."

# Backup state file if it exists
if [ -f "terraform.tfstate" ]; then
    mv terraform.tfstate terraform.tfstate.backup.$(date +%Y%m%d_%H%M%S)
    echo "✅ Backed up terraform.tfstate"
fi

# Remove other state files
rm -f terraform.tfstate.backup
rm -f .terraform.lock.hcl

echo "✅ Local state files cleaned up"

# Reinitialize Terraform for fresh deployment
echo ""
echo "🔄 Reinitializing Terraform for fresh deployment..."
terraform init

echo ""
echo "🎉 Cleanup completed successfully!"
echo "=================================="
echo ""
echo "📝 Next steps:"
echo "1. Update your terraform.tfvars with the correct region (ap-south-1)"
echo "2. Run: ./setup.sh"
echo ""
echo "✅ Ready for fresh deployment!"
