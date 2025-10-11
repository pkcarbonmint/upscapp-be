# Helios FFI Integration Guide

This guide explains how to set up and use the FFI (Foreign Function Interface) integration between Python and the Haskell Helios engine.

## Overview

The FFI integration provides direct communication between Python and Haskell without HTTP overhead, resulting in:
- **Better Performance**: ~10x faster than HTTP communication
- **Lower Latency**: No network stack overhead
- **Reduced Resource Usage**: No HTTP server required
- **Simplified Deployment**: Single shared library instead of separate services

## Architecture

```
Python Application
       ↓
   Adaptive Client (adaptive_client.py)
       ↓
   FFI Client (ffi_client.py)
       ↓
   ctypes → Haskell Shared Library (.so/.dll)
       ↓
   Haskell Engine (Engine.hs)
```

## Prerequisites

1. **GHC (Glasgow Haskell Compiler)** 8.10 or later
2. **cabal-install** 3.0 or later
3. **Python** 3.8 or later with ctypes support

### Installing Haskell Tools

```bash
# Ubuntu/Debian
sudo apt-get install ghc cabal-install

# macOS (with Homebrew)
brew install ghc cabal-install

# Or use GHCup (recommended)
curl --proto '=https' --tlsv1.2 -sSf https://get-ghcup.haskell.org | sh
```

## Building the Shared Library

### 1. Navigate to Haskell Directory
```bash
cd helios-hs
```

### 2. Run Build Script
```bash
./build-ffi.sh
```

This script will:
- Clean previous builds
- Configure the project for shared library generation
- Build the `helios-ffi` foreign library
- Copy the library to `./lib/` directory
- Set up environment variables

### 3. Manual Build (Alternative)
```bash
# Clean and configure
cabal clean
cabal configure --enable-shared --enable-executable-dynamic

# Build the foreign library
cabal build helios-ffi

# Find and copy the library
find dist-newstyle -name "libhelios-ffi.*" -type f
```

## Configuration

### Environment Variables

Set the following environment variables:

```bash
# Integration mode (ffi or http)
export HELIOS_INTEGRATION_MODE=ffi

# Path to shared library (optional - auto-detected if not set)
export HELIOS_FFI_LIBRARY_PATH=/path/to/libhelios-ffi.so
```

### Python Configuration

The integration mode is controlled in `src/modules/helios/config.py`:

```python
HELIOS_INTEGRATION_MODE = HeliosIntegrationMode(
    os.getenv("HELIOS_INTEGRATION_MODE", "ffi")  # Default to FFI
)
```

## Usage

### Basic Usage

```python
from src.modules.helios.adaptive_client import get_helios_adaptive_client

# Get client (automatically uses FFI if available)
client = await get_helios_adaptive_client()

# Health check
is_healthy = await client.health_check()

# Generate plan
wizard_data = {...}  # Your wizard data
plan = await client.generate_plan(wizard_data)
```

### Direct FFI Usage

```python
from src.modules.helios.ffi_client import HeliosFFIClient

# Direct FFI client
client = HeliosFFIClient()

# Synchronous calls (no async/await needed)
is_healthy = client.health_check()
plan = client.generate_plan(wizard_data)
```

## API Reference

### FFI Functions Exported from Haskell

| Function | Signature | Description |
|----------|-----------|-------------|
| `helios_init` | `() -> int` | Initialize Haskell runtime |
| `helios_health_check` | `() -> int` | Check engine health |
| `helios_generate_plan` | `(char*) -> char*` | Generate study plan |
| `helios_review_plan` | `(char*) -> char*` | Review study plan |
| `helios_free_string` | `(char*) -> void` | Free allocated memory |
| `helios_version` | `() -> char*` | Get engine version |

### Python FFI Client Methods

```python
class HeliosFFIClient:
    def health_check() -> bool
    def get_version() -> str
    def generate_plan(wizard_data: Dict[str, Any]) -> Dict[str, Any]
    def review_plan(plan_data: Dict[str, Any], intake: Dict[str, Any]) -> Dict[str, Any]
```

## Data Format

### Input: Wizard Data (Python → Haskell)

```json
{
  "personal_and_academic_details": {
    "full_name": "Student Name",
    "email": "student@example.com",
    "target_year": "2025"
  },
  "subject_confidence": {
    "prelims_confidence": {...},
    "mains_gs1_confidence": {...}
  },
  "study_strategy": {
    "weekly_study_hours": "40 hours",
    "study_approach": "Balanced"
  }
}
```

### Output: Study Plan (Haskell → Python)

```json
{
  "study_plan_id": "uuid",
  "user_id": "user123",
  "plan_title": "Comprehensive UPSC Plan",
  "blocks": [
    {
      "subjects": ["Polity", "Economy"],
      "duration_weeks": 4,
      "weekly_plan": {...}
    }
  ],
  "curated_resources": {...}
}
```

## Testing

### Run FFI Integration Tests

```bash
# Basic integration test
python test_helios_ffi_integration.py

# Performance comparison
python test_helios_ffi_integration.py --performance

# Full test suite including HTTP fallback
python test_helios_integration.py
```

### Test Output Example

```
🚀 Starting Comprehensive Helios FFI Integration Tests
🔧 Integration mode: ffi
============================================================

🧪 Running FFI Library Loading...
✅ FFI library loaded successfully
📋 Engine version: Helios Engine v1.0.0 (FFI)
💚 Health check: PASS

🧪 Running Adaptive Client...
✅ Adaptive client health check: PASS
✅ Adaptive client plan generation successful
⏱️  Generation time: 0.045 seconds

📊 FFI Performance:
  Average time: 0.043 seconds
  Best time: 0.041 seconds
  Worst time: 0.047 seconds

🎯 Overall: 4/4 tests passed
🎉 All FFI tests passed! Integration is working correctly.
```

## Troubleshooting

### Common Issues

#### 1. Library Not Found
```
HeliosFFIError: Could not find Helios shared library
```

**Solution:**
- Ensure the library is built: `cd helios-hs && ./build-ffi.sh`
- Set `HELIOS_FFI_LIBRARY_PATH` environment variable
- Check library permissions

#### 2. Haskell Runtime Initialization Failed
```
HeliosFFIError: Failed to initialize Haskell runtime
```

**Solution:**
- Ensure GHC and dependencies are properly installed
- Check that the library was built with the correct GHC version
- Verify system architecture compatibility

#### 3. JSON Parsing Errors
```
HeliosFFIError: Invalid JSON response from Haskell engine
```

**Solution:**
- Validate input wizard data format
- Check Haskell engine logs for parsing errors
- Ensure data transformation is working correctly

#### 4. Memory Issues
```
Segmentation fault or memory errors
```

**Solution:**
- Ensure proper memory management (strings are freed)
- Check for threading issues
- Verify library was built with correct flags

### Debugging

#### Enable Debug Logging
```python
import logging
logging.basicConfig(level=logging.DEBUG)
```

#### Check Library Dependencies
```bash
# Linux
ldd libhelios-ffi.so

# macOS  
otool -L libhelios-ffi.dylib

# Windows
dumpbin /dependents helios-ffi.dll
```

#### Verify Library Symbols
```bash
# Linux/macOS
nm -D libhelios-ffi.so | grep helios

# Should show exported functions like:
# helios_init
# helios_generate_plan
# helios_health_check
```

## Performance Optimization

### Build Optimizations

```bash
# Build with optimizations
cabal configure --enable-optimization=2 --enable-shared
cabal build helios-ffi
```

### Runtime Optimizations

1. **Reuse Client Instance**: Use the singleton pattern to avoid repeated library loading
2. **Memory Management**: Ensure proper cleanup of allocated strings
3. **Threading**: FFI calls are thread-safe but avoid concurrent calls from multiple threads

## Deployment

### Production Deployment

1. **Build Optimized Library**:
   ```bash
   cabal configure --enable-optimization=2 --enable-shared --disable-debug-info
   cabal build helios-ffi
   ```

2. **Package Library**: Include the shared library in your deployment package

3. **Set Environment Variables**:
   ```bash
   export HELIOS_INTEGRATION_MODE=ffi
   export HELIOS_FFI_LIBRARY_PATH=/opt/helios/lib/libhelios-ffi.so
   ```

4. **Fallback Configuration**: Configure HTTP fallback for reliability:
   ```python
   # In config.py - will fall back to HTTP if FFI fails
   HELIOS_INTEGRATION_MODE = HeliosIntegrationMode.FFI
   ```

### Docker Deployment

```dockerfile
# Multi-stage build
FROM haskell:8.10 as builder
WORKDIR /app
COPY helios-hs/ .
RUN ./build-ffi.sh

FROM python:3.9
COPY --from=builder /app/lib/libhelios-ffi.so /usr/local/lib/
COPY src/ /app/src/
ENV HELIOS_INTEGRATION_MODE=ffi
ENV HELIOS_FFI_LIBRARY_PATH=/usr/local/lib/libhelios-ffi.so
```

## Migration from HTTP

### Gradual Migration

1. **Set Fallback Mode**: Keep HTTP as fallback
2. **Test FFI**: Verify FFI works in your environment
3. **Switch Default**: Change default mode to FFI
4. **Remove HTTP**: Eventually remove HTTP server dependency

### Configuration Changes

```python
# Before (HTTP only)
from src.modules.helios.client import get_helios_client

# After (Adaptive - FFI with HTTP fallback)
from src.modules.helios.adaptive_client import get_helios_adaptive_client
```

## Support

For issues and questions:
1. Check this documentation
2. Run the test suite to identify issues
3. Check Haskell build logs
4. Verify environment configuration
5. Test with HTTP fallback to isolate FFI issues
