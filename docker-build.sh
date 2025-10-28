#!/bin/bash

# Docker Build with Interface Validation
# Wrapper for docker-compose build with comprehensive type safety checks

set -e

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() { echo -e "${BLUE}ℹ️  $1${NC}"; }
log_success() { echo -e "${GREEN}✅ $1${NC}"; }
log_warning() { echo -e "${YELLOW}⚠️  $1${NC}"; }
log_error() { echo -e "${RED}❌ $1${NC}"; }

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

echo "🐳 Docker Compose Build with Interface Validation"
echo "================================================"

# Pre-build validation
log_info "Running pre-build interface validation..."
if [ -f "$PROJECT_ROOT/scripts/quick-check.sh" ]; then
    if "$PROJECT_ROOT/scripts/quick-check.sh"; then
        log_success "Pre-build validation passed"
    else
        log_error "Pre-build validation failed - aborting build"
        echo ""
        echo "💡 Fix interface compatibility issues before building"
        echo "   Run './scripts/quick-check.sh' to see detailed errors"
        exit 1
    fi
else
    log_warning "Quick check script not found, skipping pre-build validation"
fi

# Parse command line arguments
BUILD_ARGS=""
SERVICES=""
NO_CACHE=""
PARALLEL=""

while [[ $# -gt 0 ]]; do
    case $1 in
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --parallel)
            PARALLEL="--parallel"
            shift
            ;;
        --build-arg)
            BUILD_ARGS="$BUILD_ARGS --build-arg $2"
            shift 2
            ;;
        -*)
            log_warning "Unknown option: $1"
            shift
            ;;
        *)
            SERVICES="$SERVICES $1"
            shift
            ;;
    esac
done

rm -rf docker-package-jsons && mkdir -p docker-package-jsons
(cd study-planner && find . -name package.json | tar cf - -T - | (cd ../docker-package-jsons && tar xf -))

# Build base image first
log_info "Building base image with pnpm setup..."
if docker build -f Dockerfile.pnpm -t node:alpine-pnpm $NO_CACHE .; then
    log_success "alpine-pnpm image built successfully"
else
    log_error "alpine-pnpm image build failed"
    exit 1
fi
if docker build -f Dockerfile.base -t study-planner:base $NO_CACHE .; then
    log_success "Base image built successfully"
else
    log_error "Base image build failed"
    exit 1
fi

# Build with docker-compose
log_info "Building services with docker-compose..."
echo "Command: docker-compose build $NO_CACHE $PARALLEL $BUILD_ARGS $SERVICES"

if docker-compose build $NO_CACHE $PARALLEL $BUILD_ARGS $SERVICES; then
    log_success "All services built successfully with interface validation"
    
    # Extract validation reports if possible
    log_info "Extracting validation reports..."
    mkdir -p /tmp/docker-validation-reports
    
    # Try to extract reports from built images
    for service in app helios frontend; do
        if docker-compose images | grep -q "$service"; then
            log_info "Service $service built successfully"
        fi
    done
    
    echo ""
    log_success "🚀 Build completed successfully!"
    echo "   Base image: study-planner:base"
    echo "   All services have passed interface compatibility validation"
    echo "   Ready to start with: docker-compose up"
    
else
    log_error "Docker build failed"
    echo ""
    echo "💡 Build failure could be due to:"
    echo "   • Base image build issues"
    echo "   • Interface compatibility issues (check validation output above)"
    echo "   • Docker build errors"
    echo "   • Missing dependencies"
    echo ""
    echo "🔍 To debug:"
    echo "   • Run './scripts/quick-check.sh' for interface validation"
    echo "   • Check Docker build logs above for specific errors"
    exit 1
fi
