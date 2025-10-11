# Docker Build with Interface Validation

This project includes comprehensive interface validation that runs automatically during Docker builds to ensure type safety across Elm frontend, Python backend, and Haskell Helios engine.

## Quick Start

### Option 1: Use the docker-build.sh wrapper (Recommended)
```bash
./docker-build.sh
```

### Option 2: Use docker-compose directly
```bash
docker-compose build
```

## What Happens During Build

### Automatic Validation Steps

1. **Pre-build Validation** (docker-build.sh only)
   - JSON Schema syntax validation
   - Python imports and schema validation
   - Elm type generation test
   - Helios mapping compatibility test

2. **Per-Service Build Validation** (all methods)
   - **Python Backend**: Runs `ci-compatibility-check.sh` during Docker build
   - **Haskell Helios**: Runs `ci-compatibility-check.sh` during Docker build  
   - **Elm Frontend**: Runs `ci-compatibility-check.sh` during Docker build

3. **Build Failure on Incompatibility**
   - Build stops immediately if any validation fails
   - Clear error messages indicate which service/check failed
   - Prevents deployment of incompatible services

## Build Options

### Standard Build
```bash
./docker-build.sh
```

### Build Specific Services
```bash
./docker-build.sh app helios
```

### Build with No Cache
```bash
./docker-build.sh --no-cache
```

### Build in Parallel
```bash
./docker-build.sh --parallel
```

### Build with Custom Args
```bash
./docker-build.sh --build-arg ENV=production
```

## Validation Reports

During build, each service generates validation reports:
- `/tmp/python-compatibility-report.json`
- `/tmp/haskell-compatibility-report.json` 
- `/tmp/elm-compatibility-report.json`

Reports include:
- Timestamp and duration
- Schema version information
- Individual check results (pass/fail)
- Error details if validation fails

## Troubleshooting Build Failures

### Interface Compatibility Issues
```bash
# Run quick validation check
./scripts/quick-check.sh

# Run comprehensive validation
./scripts/sanity-check.sh
```

### Common Issues

1. **Schema Validation Failure**
   - Check `type_contracts/interface_schemas.json` syntax
   - Ensure schema version compatibility

2. **Python Import Errors**
   - Install dependencies: `./scripts/install-deps.sh`
   - Check virtual environment activation

3. **Elm Type Generation Failure**
   - Verify Elm installation in Docker image
   - Check `elm_type_generator.py` for errors

4. **Helios Mapping Issues**
   - Review `helios_mapper.py` for data structure mismatches
   - Check Haskell `UIWizardData` type compatibility

## Development Workflow

1. **Make Changes** to interface schemas or data structures
2. **Test Locally** with `./scripts/quick-check.sh`
3. **Build Services** with `./docker-build.sh`
4. **Deploy** with `docker-compose up`

## CI/CD Integration

For automated builds, use:
```bash
./scripts/ci-compatibility-check.sh
```

This generates machine-readable JSON reports suitable for CI/CD pipelines.

## Files Modified for Validation

- `Dockerfile` - Python backend validation
- `helios-hs/Dockerfile` - Haskell validation  
- `mentora-ui/Dockerfile` - Elm validation
- `docker-compose.yml` - Service orchestration
- `.dockerignore` files - Include validation assets
