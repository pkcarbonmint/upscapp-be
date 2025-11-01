#!/bin/bash

# Secure wrapper for deploy-study-planner.sh
# This script decrypts an encrypted .env file and runs the deployment script
# Usage: DECRYPTION_KEY=your-key ./deploy-study-planner-secure.sh [OPTIONS]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENCRYPTED_ENV_FILE="${ENCRYPTED_ENV_FILE:-$SCRIPT_DIR/env.local.enc}"
DEPLOY_SCRIPT="$SCRIPT_DIR/deploy-study-planner.sh"

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

# Function to cleanup temporary files
cleanup() {
    if [ -n "$TEMP_ENV_FILE" ] && [ -f "$TEMP_ENV_FILE" ]; then
        print_status "Cleaning up temporary files..."
        # Securely remove the temp file (overwrite with zeros before deletion)
        if command -v shred >/dev/null 2>&1; then
            shred -u -z "$TEMP_ENV_FILE" 2>/dev/null || rm -f "$TEMP_ENV_FILE"
        else
            # Fallback: overwrite with zeros then remove
            dd if=/dev/zero of="$TEMP_ENV_FILE" bs=1M count=1 2>/dev/null || true
            rm -f "$TEMP_ENV_FILE"
        fi
        print_success "Cleanup completed"
    fi
}

# Set trap to cleanup on exit
trap cleanup EXIT INT TERM

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    if ! command -v openssl >/dev/null 2>&1; then
        print_error "OpenSSL is not installed. Please install it first."
        exit 1
    fi
    
    if [ -z "$DECRYPTION_KEY" ]; then
        print_error "DECRYPTION_KEY environment variable is not set."
        print_error "Usage: DECRYPTION_KEY=your-key $0 [OPTIONS]"
        exit 1
    fi
    
    if [ ! -f "$ENCRYPTED_ENV_FILE" ]; then
        print_error "Encrypted env file not found: $ENCRYPTED_ENV_FILE"
        print_error "Please ensure the encrypted file exists or set ENCRYPTED_ENV_FILE environment variable."
        exit 1
    fi
    
    if [ ! -f "$DEPLOY_SCRIPT" ]; then
        print_error "Deployment script not found: $DEPLOY_SCRIPT"
        exit 1
    fi
    
    if [ ! -x "$DEPLOY_SCRIPT" ]; then
        print_warning "Deployment script is not executable. Making it executable..."
        chmod +x "$DEPLOY_SCRIPT"
    fi
    
    print_success "Prerequisites check passed"
}

# Function to decrypt the env file
decrypt_env_file() {
    print_status "Decrypting environment file..."
    
    # Create temporary file with secure permissions
    TEMP_ENV_FILE=$(mktemp "$SCRIPT_DIR/.env.decrypted.XXXXXX")
    chmod 600 "$TEMP_ENV_FILE"
    
    # Decrypt the file using OpenSSL AES-256-CBC
    # The encrypted file should have been created with: openssl enc -aes-256-cbc -salt -pbkdf2 -in .env.local -out .env.local.enc
    if echo "$DECRYPTION_KEY" | openssl enc -d -aes-256-cbc -salt -pbkdf2 -in "$ENCRYPTED_ENV_FILE" -out "$TEMP_ENV_FILE" -pass stdin 2>/dev/null; then
        print_success "Environment file decrypted successfully"
    else
        print_error "Failed to decrypt environment file. Please check your DECRYPTION_KEY."
        exit 1
    fi
    
    # Verify the decrypted file is not empty
    if [ ! -s "$TEMP_ENV_FILE" ]; then
        print_error "Decrypted file is empty. Decryption may have failed."
        exit 1
    fi
}

# Function to load environment variables
load_env_variables() {
    print_status "Loading environment variables..."
    
    # Export variables from the decrypted file
    # Use set -a to automatically export all variables
    set -a
    # Source the decrypted env file
    # shellcheck source=/dev/null
    source "$TEMP_ENV_FILE"
    set +a
    
    print_success "Environment variables loaded"
}

# Main execution
main() {
    print_status "Starting secure deployment process..."
    
    check_prerequisites
    decrypt_env_file
    load_env_variables
    
    print_status "Executing deployment script: $DEPLOY_SCRIPT"
    print_status "Arguments passed: $*"
    
    # Execute the deployment script with all passed arguments
    exec "$DEPLOY_SCRIPT" "$@"
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: DECRYPTION_KEY=your-key $0 [OPTIONS]"
        echo ""
        echo "Secure wrapper for deploy-study-planner.sh"
        echo "This script decrypts an encrypted .env file and runs the deployment script"
        echo ""
        echo "Environment Variables:"
        echo "  DECRYPTION_KEY      Decryption key for the encrypted env file (required)"
        echo "  ENCRYPTED_ENV_FILE  Path to encrypted env file (default: .env.local.enc)"
        echo ""
        echo "Options:"
        echo "  All options are passed through to deploy-study-planner.sh"
        echo "  --help, -h          Show this help message"
        echo "  --build-only        Only build the application, don't deploy"
        echo "  --sync-only         Only sync to S3, don't invalidate CloudFront"
        echo "  --invalidate-only   Only invalidate CloudFront cache"
        echo ""
        echo "Example:"
        echo "  DECRYPTION_KEY=my-secret-key $0"
        echo "  DECRYPTION_KEY=my-secret-key $0 --build-only"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

