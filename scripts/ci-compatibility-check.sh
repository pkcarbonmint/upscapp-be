#!/bin/bash

# CI/CD Compatibility Check - Optimized for automated builds
# Validates interface compatibility in CI environments

set -e

# Exit codes
EXIT_SUCCESS=0
EXIT_SCHEMA_ERROR=1
EXIT_PYTHON_ERROR=2
EXIT_ELM_ERROR=3
EXIT_HELIOS_ERROR=4
EXIT_E2E_ERROR=5

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
TYPE_CONTRACTS_DIR="$PROJECT_ROOT/type_contracts"
REPORT_FILE="${REPORT_FILE:-/tmp/compatibility-report.json}"

# Activate virtual environment if available
if [ -f "$PROJECT_ROOT/venv/bin/activate" ]; then
    source "$PROJECT_ROOT/venv/bin/activate"
elif [ -f "$PROJECT_ROOT/.venv/bin/activate" ]; then
    source "$PROJECT_ROOT/.venv/bin/activate"
fi

# JSON report structure
init_report() {
    cat > "$REPORT_FILE" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "status": "running",
  "checks": {},
  "errors": [],
  "schema_version": "unknown",
  "duration_seconds": 0
}
EOF
}

# Update report with check result
update_report() {
    local check_name="$1"
    local status="$2"
    local message="$3"
    
    python3 -c "
import json
with open('$REPORT_FILE', 'r') as f:
    report = json.load(f)
report['checks']['$check_name'] = {'status': '$status', 'message': '$message'}
with open('$REPORT_FILE', 'w') as f:
    json.dump(report, f, indent=2)
"
}

# Finalize report
finalize_report() {
    local overall_status="$1"
    local duration="$2"
    
    python3 -c "
import json
with open('$REPORT_FILE', 'r') as f:
    report = json.load(f)
report['status'] = '$overall_status'
report['duration_seconds'] = $duration
with open('$REPORT_FILE', 'w') as f:
    json.dump(report, f, indent=2)
"
}

# Validate JSON Schema
check_schema() {
    cd "$TYPE_CONTRACTS_DIR"
    
    if python3 -c "import json; schema=json.load(open('interface_schemas.json')); print(schema.get('version', 'unknown'))" 2>/dev/null; then
        local version=$(python3 -c "import json; print(json.load(open('interface_schemas.json')).get('version', 'unknown'))")
        update_report "schema_validation" "pass" "Schema version $version is valid"
        
        # Update schema version in report
        python3 -c "
import json
with open('$REPORT_FILE', 'r') as f:
    report = json.load(f)
report['schema_version'] = '$version'
with open('$REPORT_FILE', 'w') as f:
    json.dump(report, f, indent=2)
"
        return 0
    else
        update_report "schema_validation" "fail" "JSON Schema syntax error"
        return $EXIT_SCHEMA_ERROR
    fi
}

# Validate Python layer
check_python() {
    cd "$TYPE_CONTRACTS_DIR"
    
    # Test schema validator import
    if ! python3 -c "from schema_validator import SchemaValidator; SchemaValidator()" 2>/dev/null; then
        update_report "python_imports" "fail" "Schema validator import failed"
        return $EXIT_PYTHON_ERROR
    fi
    
    # Test sample validation
    local test_data='{"name":"CI Test","phone":"1234567890","email":"ci@test.com","city":"Test","state":"Test","graduation_stream":"Test","college":"Test","graduation_year":2024,"about":"CI test"}'
    if python3 schema_validator.py BackgroundInput "$test_data" >/dev/null 2>&1; then
        update_report "python_validation" "pass" "Python schema validation working"
        return 0
    else
        update_report "python_validation" "fail" "Python schema validation failed"
        return $EXIT_PYTHON_ERROR
    fi
}

# Validate Elm generation
check_elm() {
    cd "$TYPE_CONTRACTS_DIR"
    
    if python3 elm_type_generator.py >/dev/null 2>&1; then
        # Check if generated file exists
        if [ -f "$PROJECT_ROOT/mentora-ui/src/Generated/Types.elm" ]; then
            update_report "elm_generation" "pass" "Elm types generated successfully"
            return 0
        else
            update_report "elm_generation" "fail" "Elm types file not created"
            return $EXIT_ELM_ERROR
        fi
    else
        update_report "elm_generation" "fail" "Elm type generation failed"
        return $EXIT_ELM_ERROR
    fi
}

# Validate Helios mapping
check_helios() {
    cd "$TYPE_CONTRACTS_DIR"
    
    if python3 test_helios_mapping.py >/dev/null 2>&1; then
        update_report "helios_mapping" "pass" "Helios mapping validation successful"
        return 0
    else
        update_report "helios_mapping" "fail" "Helios mapping validation failed"
        return $EXIT_HELIOS_ERROR
    fi
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    init_report
    
    echo "🤖 CI/CD Interface Compatibility Check"
    echo "Report: $REPORT_FILE"
    
    # Run checks
    local exit_code=0
    
    check_schema || exit_code=$?
    [ $exit_code -eq 0 ] && check_python || exit_code=$?
    [ $exit_code -eq 0 ] && check_elm || exit_code=$?
    [ $exit_code -eq 0 ] && check_helios || exit_code=$?
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    
    if [ $exit_code -eq 0 ]; then
        finalize_report "pass" "$duration"
        echo "✅ All compatibility checks passed ($duration seconds)"
        echo "📊 Report: $REPORT_FILE"
    else
        finalize_report "fail" "$duration"
        echo "❌ Compatibility check failed (exit code: $exit_code)"
        echo "📊 Report: $REPORT_FILE"
        cat "$REPORT_FILE"
    fi
    
    exit $exit_code
}

main "$@"
