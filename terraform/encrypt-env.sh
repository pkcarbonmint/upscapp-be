#!/bin/bash

# Utility script to encrypt .env files using OpenSSL
# Usage: ./encrypt-env.sh [source_file] [output_file]

set -e

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DEFAULT_SOURCE="${1:-$SCRIPT_DIR/../.env.local}"
DEFAULT_OUTPUT="${2:-$SCRIPT_DIR/.env.local.enc}"

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

# Function to check prerequisites
check_prerequisites() {
    if ! command -v openssl >/dev/null 2>&1; then
        print_error "OpenSSL is not installed. Please install it first."
        exit 1
    fi
}

# Function to get encryption key
get_encryption_key() {
    if [ -n "$ENCRYPTION_KEY" ]; then
        echo "$ENCRYPTION_KEY"
        return
    fi
    
    # Prompt for encryption key if not in environment
    print_status "Enter encryption key (will not be displayed):"
    read -s ENCRYPTION_KEY_INPUT
    echo ""
    
    print_status "Confirm encryption key:"
    read -s ENCRYPTION_KEY_CONFIRM
    echo ""
    
    if [ "$ENCRYPTION_KEY_INPUT" != "$ENCRYPTION_KEY_CONFIRM" ]; then
        print_error "Encryption keys do not match. Aborting."
        exit 1
    fi
    
    echo "$ENCRYPTION_KEY_INPUT"
}

# Function to encrypt the file
encrypt_file() {
    local source_file="$1"
    local output_file="$2"
    local encryption_key="$3"
    
    print_status "Encrypting $source_file..."
    
    if [ ! -f "$source_file" ]; then
        print_error "Source file not found: $source_file"
        exit 1
    fi
    
    # Encrypt the file using OpenSSL AES-256-CBC
    # -salt: Add salt to the encryption for better security
    # -pbkdf2: Use PBKDF2 key derivation (better than default for password-based encryption)
    if echo "$encryption_key" | openssl enc -aes-256-cbc -salt -pbkdf2 -in "$source_file" -out "$output_file" -pass stdin 2>/dev/null; then
        # Set secure permissions on the encrypted file
        chmod 600 "$output_file"
        print_success "File encrypted successfully: $output_file"
        
        # Get file sizes for comparison
        SOURCE_SIZE=$(stat -f%z "$source_file" 2>/dev/null || stat -c%s "$source_file" 2>/dev/null || echo "unknown")
        OUTPUT_SIZE=$(stat -f%z "$output_file" 2>/dev/null || stat -c%s "$output_file" 2>/dev/null || echo "unknown")
        
        print_status "Source file size: $SOURCE_SIZE bytes"
        print_status "Encrypted file size: $OUTPUT_SIZE bytes"
    else
        print_error "Encryption failed"
        exit 1
    fi
}

# Function to verify encryption
verify_encryption() {
    local encrypted_file="$1"
    local encryption_key="$2"
    
    print_status "Verifying encryption..."
    
    # Try to decrypt to a temporary file and verify it's not empty
    TEMP_VERIFY=$(mktemp)
    chmod 600 "$TEMP_VERIFY"
    
    if echo "$encryption_key" | openssl enc -d -aes-256-cbc -salt -pbkdf2 -in "$encrypted_file" -out "$TEMP_VERIFY" -pass stdin 2>/dev/null; then
        if [ -s "$TEMP_VERIFY" ]; then
            print_success "Encryption verified successfully"
            rm -f "$TEMP_VERIFY"
            return 0
        else
            print_error "Verification failed: Decrypted file is empty"
            rm -f "$TEMP_VERIFY"
            return 1
        fi
    else
        print_error "Verification failed: Could not decrypt file"
        rm -f "$TEMP_VERIFY"
        return 1
    fi
}

# Main execution
main() {
    print_status "Starting encryption process..."
    
    check_prerequisites
    
    SOURCE_FILE="$DEFAULT_SOURCE"
    OUTPUT_FILE="$DEFAULT_OUTPUT"
    
    print_status "Source file: $SOURCE_FILE"
    print_status "Output file: $OUTPUT_FILE"
    
    # Check if output file already exists
    if [ -f "$OUTPUT_FILE" ]; then
        print_warning "Output file already exists: $OUTPUT_FILE"
        print_status "Do you want to overwrite it? (y/N)"
        read -r response
        if [ "$response" != "y" ] && [ "$response" != "Y" ]; then
            print_status "Aborted by user"
            exit 0
        fi
    fi
    
    ENCRYPTION_KEY=$(get_encryption_key)
    
    encrypt_file "$SOURCE_FILE" "$OUTPUT_FILE" "$ENCRYPTION_KEY"
    
    if verify_encryption "$OUTPUT_FILE" "$ENCRYPTION_KEY"; then
        print_success "Encryption process completed successfully!"
        print_warning "IMPORTANT: Store your encryption key securely."
        print_warning "You will need it to decrypt and run the deployment script."
        print_warning "Set it as: DECRYPTION_KEY=your-key"
    else
        print_error "Encryption verification failed. Please try again."
        exit 1
    fi
}

# Handle script arguments
case "${1:-}" in
    --help|-h)
        echo "Usage: $0 [source_file] [output_file]"
        echo ""
        echo "Encrypt .env files using OpenSSL AES-256-CBC encryption"
        echo ""
        echo "Arguments:"
        echo "  source_file    Path to source .env file (default: ../.env.local)"
        echo "  output_file    Path to output encrypted file (default: .env.local.enc)"
        echo ""
        echo "Environment Variables:"
        echo "  ENCRYPTION_KEY Encryption key (if not provided, will prompt)"
        echo ""
        echo "Examples:"
        echo "  $0                                    # Encrypt ../.env.local to .env.local.enc"
        echo "  $0 .env.local .env.local.enc         # Encrypt .env.local to .env.local.enc"
        echo "  ENCRYPTION_KEY=my-key $0             # Use encryption key from environment"
        echo ""
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac

