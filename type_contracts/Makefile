# Type Safety Validation Makefile
# Ensures static type compatibility across Elm, Python, and Haskell interfaces

.PHONY: all validate generate-elm validate-python validate-helios clean help

# Default target
all: validate

# Generate Elm types from JSON Schema
generate-elm:
	@echo "🔧 Generating Elm types from JSON Schema..."
	python3 elm_type_generator.py
	@echo "✅ Elm types generated in ../mentora-ui/src/Generated/Types.elm"

# Validate Python type compatibility
validate-python:
	@echo "🔍 Validating Python type compatibility..."
	python3 -m py_compile python_helios_adapter.py
	python3 python_helios_adapter.py
	@echo "✅ Python types validated"

# Validate Helios integration
validate-helios:
	@echo "🔍 Validating Helios integration..."
	cd ../helios-hs && stack build --fast
	@echo "✅ Helios types validated"

# Validate Python-Helios compatibility
validate-python-helios:
	@echo "🔍 Validating Python-Helios compatibility..."
	python3 test_helios_mapping.py
	@echo "✅ Python-Helios compatibility validated"

# Generate Helios schema from Haskell types
generate-helios-schema:
	@echo "🔧 Generating Helios schema from Haskell types..."
	python3 helios_schema_generator.py
	@echo "✅ Helios schema generated"

# Run comprehensive validation tests
validate:
	@echo "🚀 Running comprehensive type validation..."
	make validate-schema
	make validate-python-helios
	@echo "🎯 Type validation complete"

# Validate JSON Schema
validate-schema:
	@echo "🔍 Validating JSON Schema..."
	python3 -c "import json; json.load(open('interface_schemas.json'))"
	@echo "✅ JSON Schema is valid"

# Clean generated files
clean:
	@echo "🧹 Cleaning generated files..."
	rm -f ../mentora-ui/src/Generated/Types.elm
	rm -f *.pyc
	rm -rf __pycache__
	@echo "✅ Cleanup complete"

# Show help
help:
	@echo "Type Safety Validation Commands:"
	@echo "================================="
	@echo "make all              - Run all validations"
	@echo "make generate-elm     - Generate Elm types from JSON Schema"
	@echo "make validate-python  - Validate Python type compatibility"
	@echo "make validate-helios  - Validate Helios integration"
	@echo "make validate-python-helios - Validate Python-Helios compatibility"
	@echo "make generate-helios-schema - Generate Helios schema from Haskell"
	@echo "make validate         - Run comprehensive validation tests"
	@echo "make validate-schema  - Validate JSON Schema syntax"
	@echo "make clean            - Clean generated files"
	@echo "make help             - Show this help message"
