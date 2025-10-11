#!/bin/bash

# Install Dependencies for Interface Compatibility Checks
# Ensures all required packages are available for validation

set -e

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"

echo "📦 Installing Interface Compatibility Dependencies"
echo "================================================"

# Activate virtual environment if available
if [ -f "$PROJECT_ROOT/venv/bin/activate" ]; then
    log_info "Activating virtual environment..."
    source "$PROJECT_ROOT/venv/bin/activate"
    log_success "Virtual environment activated"
elif [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    log_info "Activating virtual environment..."
    source "$PROJECT_ROOT/.venv/bin/activate"
    log_success "Virtual environment activated"
else
    log_info "No virtual environment found, using system Python"
fi

# Install Python dependencies
log_info "Installing Python packages..."
pip install jsonschema requests pydantic

log_success "Python dependencies installed"

# Check if installations work
log_info "Verifying installations..."
python3 -c "import jsonschema, requests; print('✅ All Python packages available')"

log_success "All dependencies ready for compatibility checks"
echo ""
echo "Run './scripts/quick-check.sh' to test interface compatibility"
