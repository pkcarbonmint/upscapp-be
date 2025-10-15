#!/bin/bash

# Graceful Resource Cleanup Script
# Handles region mismatches and credential issues

set -e

echo "🧹 Graceful Terraform Resource Cleanup"
echo "======================================"

# Check if AWS credentials are set
if [ -z "$AWS_ACCESS_KEY_ID" ] || [ -z "$AWS_SECRET_ACCESS_KEY" ]; then
    echo "❌ Error: AWS credentials not found in environment variables"
    echo "Please set the following environment variables:"
    echo "  export AWS_ACCESS_KEY_ID=your-access-key"
    echo "  export AWS_SECRET_ACCESS_KEY=your-secret-key"
    echo "  export AWS_DEFAULT_REGION=us-west-2  # For cleanup"
    exit 1
fi

# Check if Terraform is installed
if ! command -v terraform &> /dev/null; then
    echo "❌ Error: Terraform is not installed"
    exit 1
fi

echo "✅ Terraform found: $(terraform version | head -n1)"

# Check if terraform.tfstate exists
if [ ! -f "terraform.tfstate" ]; then
    echo "⚠️  No terraform.tfstate file found - nothing to clean up"
    exit 0
fi

echo "📋 Found existing Terraform state file"

# Show what resources exist in state
echo ""
echo "📊 Resources in current state:"
terraform state list | head -10
echo "..."

# Detect region from state
STATE_REGION=$(terraform show -json | jq -r '.values.root_module.resources[] | select(.type == "data.aws_availability_zones") | .values.id' 2>/dev/null || echo "unknown")
echo "📍 Resources were created in region: $STATE_REGION"

# Set the correct region for cleanup
if [ "$STATE_REGION" != "unknown" ] && [ "$STATE_REGION" != "$AWS_DEFAULT_REGION" ]; then
    echo "⚠️  Region mismatch detected!"
    echo "   State region: $STATE_REGION"
    echo "   Current region: $AWS_DEFAULT_REGION"
    echo "🔄 Setting region to $STATE_REGION for cleanup..."
    export AWS_DEFAULT_REGION=$STATE_REGION
fi

# Ask for confirmation
echo ""
echo "⚠️  This will destroy ALL resources in the current state."
echo "💰 This will stop all AWS charges for these resources."
echo "📍 Region: $AWS_DEFAULT_REGION"
echo ""
read -p "Do you want to proceed with cleanup? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    echo "❌ Cleanup cancelled"
    exit 0
fi

# Try to destroy resources
echo "🗑️  Attempting to destroy resources..."

# First, try a normal destroy
if terraform destroy -auto-approve; then
    echo "✅ Resources destroyed successfully!"
else
    echo "⚠️  Normal destroy failed, trying alternative approaches..."
    
    # Try to remove problematic resources from state first
    echo "🔧 Attempting to remove problematic resources from state..."
    
    # Remove resources that might be causing issues
    PROBLEMATIC_RESOURCES=(
        "aws_ecs_cluster.main"
        "aws_lb.main"
        "aws_lb_target_group.app"
        "aws_lb_target_group.frontend"
        "aws_lb_target_group.helios"
        "aws_lb_listener.main"
        "aws_lb_listener_rule.app"
        "aws_lb_listener_rule.helios"
    )
    
    for resource in "${PROBLEMATIC_RESOURCES[@]}"; do
        if terraform state list | grep -q "^$resource$"; then
            echo "   Removing $resource from state..."
            terraform state rm "$resource" 2>/dev/null || echo "   Failed to remove $resource (may not exist)"
        fi
    done
    
    # Try destroy again
    echo "🔄 Retrying destroy after state cleanup..."
    if terraform destroy -auto-approve; then
        echo "✅ Resources destroyed successfully after state cleanup!"
    else
        echo "❌ Destroy still failed. Manual cleanup may be required."
        echo "📋 Remaining resources in state:"
        terraform state list
        echo ""
        echo "💡 You may need to:"
        echo "   1. Remove remaining resources from state: terraform state rm <resource>"
        echo "   2. Or manually delete resources in AWS Console"
        echo "   3. Or use the manual cleanup guide: MANUAL_CLEANUP.md"
        exit 1
    fi
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
echo "2. Set your AWS credentials for the new region:"
echo "   export AWS_DEFAULT_REGION=ap-south-1"
echo "3. Run: ./setup.sh"
echo ""
echo "✅ Ready for fresh deployment!"
