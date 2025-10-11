# Distributed Schema Validation Architecture

## 🎯 Design Philosophy

**Versioned JSON Schema as Shared Contract + Distributed Validation**

Instead of a centralized validator that creates development friction, each service validates against the shared schema independently while maintaining compatibility guarantees.

## 📋 Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                 interface_schemas.json                      │
│                 Version: 1.0.0                             │
│                 Single Source of Truth                     │
└─────────────────────┬───────────────────────────────────────┘
                      │
        ┌─────────────┼─────────────┐
        │             │             │
        ▼             ▼             ▼
┌─────────────┐ ┌─────────────┐ ┌─────────────┐
│ Elm Service │ │Python Service│ │Haskell Svc  │
│             │ │             │ │             │
│ • Generates │ │ • Validates │ │ • Validates │
│   types     │ │   at runtime│ │   at build  │
│ • Validates │ │ • Uses      │ │ • Uses      │
│   at build  │ │   schema    │ │   schema    │
└─────────────┘ └─────────────┘ └─────────────┘
```

## 🔧 Implementation

### **1. Versioned Schema Contract**
```json
{
  "version": "1.0.0",
  "schemaVersion": "2025-01-15",
  "compatibility": {
    "elm": ">=0.19.1",
    "python": ">=3.10", 
    "haskell": ">=9.10"
  }
}
```

### **2. Per-Service Validation**

**Elm Frontend:**
- Generates types from schema at build time
- Validates sample data during Docker build
- Uses generated types for compile-time safety

**Python Backend:**
- Imports `schema_validator.py` 
- Validates incoming requests against schema
- Runtime validation with detailed error messages

**Haskell Engine:**
- Validates schema compatibility at build time
- Ensures data structures match schema expectations
- Compile-time type safety within Haskell

### **3. Development Workflow**

```bash
# 1. Update schema version
vim type_contracts/interface_schemas.json

# 2. Each service validates independently
docker build -f Dockerfile .              # Python validates
docker build -f mentora-ui/Dockerfile .   # Elm validates + generates
docker build -f helios-hs/Dockerfile .    # Haskell validates

# 3. Services start with validated contracts
docker-compose up
```

## ✅ Benefits of Distributed Approach

### **Development Friendly**
- ✅ Each service builds independently
- ✅ No centralized bottleneck
- ✅ Faster development cycles
- ✅ Service-specific validation logic

### **Still Maintains Safety**
- ✅ Shared schema ensures compatibility
- ✅ Version tracking prevents drift
- ✅ Build-time validation catches errors
- ✅ Each service validates its own contracts

### **Operational Benefits**
- ✅ Services can start independently
- ✅ No dependency on validation service
- ✅ Simpler deployment architecture
- ✅ Better fault isolation

## 🔍 Validation Points

| Service | Validation Point | What's Validated |
|---------|------------------|------------------|
| **Elm** | Build Time | Schema syntax + Type generation + Sample data |
| **Python** | Build + Runtime | Schema syntax + Sample data + Request validation |
| **Haskell** | Build Time | Schema syntax + Sample data + Type compatibility |

## 📁 File Structure

```
type_contracts/
├── interface_schemas.json      # Versioned schema contract
├── schema_validator.py         # Shared validation utility
├── elm_type_generator.py       # Elm type generation
└── README_distributed.md       # This documentation

src/modules/studyplanner/onboarding/
└── schema_validation.py        # Python service validation

mentora-ui/src/Generated/
└── Types.elm                   # Generated Elm types
```

## 🚀 Usage Examples

### **Python Service Validation**
```python
from schema_validation import validate_onboarding_data

# Validate incoming request
if not validate_onboarding_data(request_data, "background"):
    return {"error": "Invalid background data"}
```

### **Elm Type Safety**
```elm
-- Generated from schema
type alias BackgroundInput = 
    { name : String
    , email : String
    , graduation_year : Int
    }
```

### **Schema Version Check**
```bash
python3 schema_validator.py BackgroundInput '{"name":"test",...}'
# Output: ✅ BackgroundInput validation passed
```

This approach provides **type safety without development friction** - each service validates independently while the shared schema ensures compatibility across all boundaries.
