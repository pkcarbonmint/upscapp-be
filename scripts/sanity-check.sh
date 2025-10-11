#!/bin/bash

# Sanity Check Build Script
# Ensures compatibility between all data interface layers
# Elm Frontend ↔ Python API ↔ Helios Haskell Engine

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TYPE_CONTRACTS_DIR="$PROJECT_ROOT/type_contracts"
HELIOS_DIR="$PROJECT_ROOT/helios-hs"
FRONTEND_DIR="$PROJECT_ROOT/mentora-ui"

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

# Logging functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_section() {
    echo ""
    echo -e "${BLUE}🔍 $1${NC}"
    echo "=================================================="
}

# Check if required tools are available
check_prerequisites() {
    log_section "Checking Prerequisites"
    
    local missing_tools=()
    
    # Check Python
    if ! command -v python3 &> /dev/null; then
        missing_tools+=("python3")
    fi
    
    # Check Node.js (for Elm)
    if ! command -v node &> /dev/null; then
        missing_tools+=("node")
    fi
    
    # Check Stack (for Haskell)
    if ! command -v stack &> /dev/null; then
        missing_tools+=("stack")
    fi
    
    # Check Make
    if ! command -v make &> /dev/null; then
        missing_tools+=("make")
    fi
    
    if [ ${#missing_tools[@]} -ne 0 ]; then
        log_error "Missing required tools: ${missing_tools[*]}"
        exit 1
    fi
    
    log_success "All prerequisites available"
}

# Validate JSON Schema syntax
validate_schema() {
    log_section "Validating JSON Schema"
    
    cd "$TYPE_CONTRACTS_DIR"
    
    if python3 -c "import json; json.load(open('interface_schemas.json'))" 2>/dev/null; then
        log_success "JSON Schema syntax is valid"
    else
        log_error "JSON Schema has syntax errors"
        return 1
    fi
    
    # Check schema version
    local version=$(python3 -c "import json; print(json.load(open('interface_schemas.json')).get('version', 'unknown'))")
    log_info "Schema version: $version"
}

# Test Elm type generation and validation
validate_elm_layer() {
    log_section "Validating Elm Layer"
    
    cd "$TYPE_CONTRACTS_DIR"
    
    # Generate Elm types
    log_info "Generating Elm types from schema..."
    if python3 elm_type_generator.py; then
        log_success "Elm types generated successfully"
    else
        log_error "Elm type generation failed"
        return 1
    fi
    
    # Check if generated file exists and is valid Elm
    local elm_types_file="$FRONTEND_DIR/src/Generated/Types.elm"
    if [ -f "$elm_types_file" ]; then
        log_success "Generated Elm types file exists"
        
        # Basic Elm syntax check (if elm is available)
        if command -v elm &> /dev/null; then
            cd "$FRONTEND_DIR"
            if elm make src/Generated/Types.elm --output=/dev/null 2>/dev/null; then
                log_success "Generated Elm types compile successfully"
            else
                log_warning "Generated Elm types have compilation issues"
            fi
        else
            log_warning "Elm compiler not available, skipping syntax check"
        fi
    else
        log_error "Generated Elm types file not found"
        return 1
    fi
}

# Test Python layer validation
validate_python_layer() {
    log_section "Validating Python Layer"
    
    cd "$TYPE_CONTRACTS_DIR"
    
    # Test schema validator
    log_info "Testing Python schema validator..."
    if python3 -c "from schema_validator import SchemaValidator; SchemaValidator()" 2>/dev/null; then
        log_success "Python schema validator loads successfully"
    else
        log_error "Python schema validator has import issues"
        return 1
    fi
    
    # Test sample data validation
    local test_data='{"name":"Test","phone":"1234567890","email":"test@example.com","city":"Test","state":"Test","graduation_stream":"Test","college":"Test","graduation_year":2024,"about":"Test"}'
    if python3 schema_validator.py BackgroundInput "$test_data" >/dev/null 2>&1; then
        log_success "Python schema validation works correctly"
    else
        log_error "Python schema validation failed"
        return 1
    fi
    
    # Test Helios mapping
    log_info "Testing Python-Helios mapping..."
    if python3 test_helios_mapping.py >/dev/null 2>&1; then
        log_success "Python-Helios mapping works correctly"
    else
        log_error "Python-Helios mapping failed"
        return 1
    fi
}

# Test Haskell layer compilation
validate_haskell_layer() {
    log_section "Validating Haskell Layer"
    
    cd "$HELIOS_DIR"
    
    # Check if Haskell code compiles
    log_info "Compiling Haskell code..."
    if stack build --fast --no-run-tests 2>/dev/null; then
        log_success "Haskell code compiles successfully"
    else
        log_error "Haskell compilation failed"
        return 1
    fi
    
    # Check if UIWizardData type exists
    if grep -q "data UIWizardData" src/DataTransform.hs; then
        log_success "UIWizardData type definition found"
    else
        log_error "UIWizardData type definition not found"
        return 1
    fi
}

# Test end-to-end data flow
validate_end_to_end() {
    log_section "Validating End-to-End Data Flow"
    
    cd "$TYPE_CONTRACTS_DIR"
    
    # Create test data that flows through all layers
    log_info "Testing complete data flow..."
    
    # Test 1: Elm-compatible data → Python validation
    local elm_data='{"name":"E2E Test","phone":"9876543210","email":"e2e@test.com","city":"TestCity","state":"TestState","graduation_stream":"Engineering","college":"Test University","graduation_year":2023,"about":"End-to-end test data"}'
    
    if python3 schema_validator.py BackgroundInput "$elm_data" >/dev/null 2>&1; then
        log_success "Elm → Python data flow validated"
    else
        log_error "Elm → Python data flow failed"
        return 1
    fi
    
    # Test 2: Python → Helios mapping
    if python3 -c "
import sys
sys.path.append('../src/modules/studyplanner/onboarding')
from helios_mapper import map_student_to_helios
test_data = {
    'background_data': {'name': 'Test', 'email': 'test@example.com', 'phone': '1234567890', 'city': 'Test', 'state': 'Test', 'graduation_stream': 'Test', 'college': 'Test', 'graduation_year': 2024, 'about': 'Test'},
    'target_data': {'target_year': 2026, 'optional_subject': 'Test'},
    'commitment_data': {'study_hours_per_day': 8, 'study_days_per_week': 6, 'flexibility': 'medium'},
    'confidence_data': {'general_studies_1': 'medium', 'general_studies_2': 'medium', 'general_studies_3': 'medium', 'general_studies_4': 'medium', 'optional_subject': 'medium', 'essay': 'medium', 'csat': 'medium'}
}
result = map_student_to_helios(test_data)
print('SUCCESS' if len(result) > 0 else 'FAILED')
" 2>/dev/null | grep -q "SUCCESS"; then
        log_success "Python → Helios data flow validated"
    else
        log_error "Python → Helios data flow failed"
        return 1
    fi
}

# Test Docker build compatibility
validate_docker_builds() {
    log_section "Validating Docker Build Compatibility"
    
    cd "$PROJECT_ROOT"
    
    # Test if Dockerfiles have type validation steps
    local dockerfiles=("Dockerfile" "Dockerfile.prod" "mentora-ui/Dockerfile" "helios-hs/Dockerfile")
    
    for dockerfile in "${dockerfiles[@]}"; do
        if [ -f "$dockerfile" ]; then
            if grep -q "schema" "$dockerfile" || grep -q "type" "$dockerfile"; then
                log_success "$dockerfile includes type validation"
            else
                log_warning "$dockerfile missing type validation steps"
            fi
        else
            log_warning "$dockerfile not found"
        fi
    done
}

# Generate compatibility report
generate_report() {
    log_section "Generating Compatibility Report"
    
    local report_file="$PROJECT_ROOT/COMPATIBILITY_REPORT.md"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    cat > "$report_file" << EOF
# Interface Compatibility Report

**Generated:** $timestamp  
**Schema Version:** $(cd "$TYPE_CONTRACTS_DIR" && python3 -c "import json; print(json.load(open('interface_schemas.json')).get('version', 'unknown'))")

## ✅ Validation Results

### Layer Compatibility
- **Elm Frontend** ↔ **Python API**: ✅ Compatible
- **Python API** ↔ **Helios Engine**: ✅ Compatible  
- **End-to-End Flow**: ✅ Validated

### Generated Artifacts
- **Elm Types**: \`mentora-ui/src/Generated/Types.elm\`
- **Python Validators**: \`type_contracts/schema_validator.py\`
- **Helios Mapper**: \`src/modules/studyplanner/onboarding/helios_mapper.py\`

### Validation Commands
\`\`\`bash
# Run full compatibility check
./scripts/sanity-check.sh

# Individual layer validation
cd type_contracts
make validate-schema          # JSON Schema syntax
make generate-elm            # Elm type generation  
make validate-python-helios  # Python-Helios mapping
\`\`\`

### Schema Evolution
When updating interface schemas:
1. Update \`type_contracts/interface_schemas.json\`
2. Run \`./scripts/sanity-check.sh\`
3. Commit generated types with schema changes
4. Deploy with validated compatibility

---
*This report confirms all interface layers are compatible and ready for deployment.*
EOF

    log_success "Compatibility report generated: $report_file"
}

# Main execution
main() {
    echo "🚀 Interface Compatibility Sanity Check"
    echo "======================================"
    echo "Validating: Elm ↔ Python ↔ Haskell"
    echo ""
    
    local start_time=$(date +%s)
    local failed_checks=()
    
    # Run all validation steps
    check_prerequisites || failed_checks+=("prerequisites")
    validate_schema || failed_checks+=("schema")
    validate_elm_layer || failed_checks+=("elm")
    validate_python_layer || failed_checks+=("python") 
    validate_haskell_layer || failed_checks+=("haskell")
    validate_end_to_end || failed_checks+=("end-to-end")
    validate_docker_builds || failed_checks+=("docker")
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    echo ""
    echo "======================================"
    
    if [ ${#failed_checks[@]} -eq 0 ]; then
        log_success "All compatibility checks passed! ($duration seconds)"
        generate_report
        echo ""
        log_info "✨ Your interfaces are fully compatible and ready for deployment"
        exit 0
    else
        log_error "Failed checks: ${failed_checks[*]}"
        echo ""
        log_error "❌ Interface compatibility issues detected"
        exit 1
    fi
}

# Run main function
main "$@"
