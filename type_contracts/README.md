# Type Safety & Interface Compatibility

This directory contains tools and contracts to ensure static type safety across the multi-language architecture:

**Elm Frontend ↔ Python API ↔ Helios Haskell Engine**

## 🎯 Problem Statement

The system has three layers with different type systems:
1. **Elm Frontend**: Basic types (String, Int, Bool)
2. **Python API**: Rich Pydantic validation (EmailStr, patterns, constraints)  
3. **Helios Haskell**: Complex nested types (UIWizardData → StudentIntake)

Without static validation, type mismatches cause runtime errors and data corruption.

## 🔧 Solution Architecture

### 1. JSON Schema as Single Source of Truth
- `interface_schemas.json` - Canonical type definitions
- Validates all three layers against common schema
- Enables automatic code generation

### 2. Elm Type Generation
- `elm_type_generator.py` - Generates Elm types from JSON Schema
- Creates type aliases, JSON decoders, and encoders
- Ensures Elm frontend matches Python API exactly

### 3. Python-Helios Adapter
- `python_helios_adapter.py` - Type-safe conversion layer
- Pydantic models matching Haskell UIWizardData exactly
- Runtime validation with detailed error messages

### 4. Comprehensive Validation
- `validation_tests.py` - End-to-end compatibility tests
- Validates data flow: Elm → Python → Helios
- Catches type mismatches before deployment

## 🚀 Usage

### Generate Elm Types
```bash
make generate-elm
```
Creates `../mentora-ui/src/Generated/Types.elm` with type-safe definitions.

### Validate All Interfaces
```bash
make validate
```
Runs comprehensive compatibility tests across all layers.

### Update Python-Helios Integration
```python
from python_helios_adapter import PythonToHeliosAdapter

# Convert Python onboarding data to Helios format
helios_data = PythonToHeliosAdapter.convert_student_data(student_data)

# Validate structure matches Helios expectations
validated = PythonToHeliosAdapter.validate_helios_payload(helios_data.dict())
```

## 📋 Type Compatibility Matrix

| Layer | Input Type | Output Type | Validation |
|-------|------------|-------------|------------|
| Elm → Python | `BackgroundInput` | Pydantic `BackgroundInput` | JSON Schema |
| Python → Helios | `Dict[str, Any]` | `UIWizardData` | Pydantic Models |
| Helios Internal | `UIWizardData` | `StudentIntake` | Haskell Type System |

## 🔍 Static Guarantees

### Elm Frontend
- ✅ Type aliases match Python API schemas exactly
- ✅ JSON encoders produce valid Python input
- ✅ JSON decoders handle Python responses correctly

### Python API  
- ✅ Pydantic validation catches invalid Elm data
- ✅ Adapter ensures Helios compatibility
- ✅ Runtime type checking with detailed errors

### Helios Haskell
- ✅ Strong type system prevents invalid transformations
- ✅ Compile-time guarantees for data processing
- ✅ Structured confidence mapping and enum validation

## 🛠 Development Workflow

1. **Update Schema**: Modify `interface_schemas.json`
2. **Generate Types**: Run `make generate-elm`
3. **Update Adapters**: Modify `python_helios_adapter.py` if needed
4. **Validate**: Run `make validate` to ensure compatibility
5. **Deploy**: All interfaces guaranteed to be compatible

## 🎯 Benefits

- **Compile-Time Safety**: Catch type errors before runtime
- **Automatic Sync**: Schema changes propagate to all layers
- **Documentation**: Types serve as living documentation
- **Confidence**: Deploy knowing interfaces are compatible
- **Maintainability**: Single source of truth for all types

## 📁 Files

- `interface_schemas.json` - JSON Schema definitions
- `elm_type_generator.py` - Elm code generator
- `python_helios_adapter.py` - Python-Haskell adapter
- `validation_tests.py` - Comprehensive test suite
- `Makefile` - Build and validation commands
