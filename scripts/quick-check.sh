#!/bin/bash

# Quick Compatibility Check - Fast validation for development
# Runs essential checks without full compilation

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TYPE_CONTRACTS_DIR="$PROJECT_ROOT/type_contracts"

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

echo "🚀 Quick Interface Compatibility Check"
echo "====================================="

cd "$TYPE_CONTRACTS_DIR"

# 1. Schema syntax check
log_info "Checking JSON Schema syntax..."
if python3 -c "import json; json.load(open('interface_schemas.json'))" 2>/dev/null; then
    log_success "Schema syntax valid"
else
    log_error "Schema syntax invalid"
    exit 1
fi

# 2. Python imports check
log_info "Checking Python imports..."
if python3 -c "from schema_validator import SchemaValidator; SchemaValidator()" 2>/dev/null; then
    log_success "Python imports working"
else
    log_error "Python import issues (install: pip install jsonschema)"
    exit 1
fi

# 3. Elm type generation check
log_info "Testing Elm type generation..."
if python3 elm_type_generator.py >/dev/null 2>&1; then
    log_success "Elm type generation working"
else
    log_error "Elm type generation failed"
    exit 1
fi

# 4. Helios mapping check
log_info "Testing Helios mapping..."
if python3 test_helios_mapping.py >/dev/null 2>&1; then
    log_success "Helios mapping working"
else
    log_error "Helios mapping failed"
    exit 1
fi

echo ""
log_success "Quick check passed! All interfaces compatible."
echo "Run './scripts/sanity-check.sh' for full validation."
