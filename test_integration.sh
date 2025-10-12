#!/bin/bash

# Integration Test Script for Onboarding-UI and Faculty-UI
echo "🚀 Starting Integration Tests..."
echo "=================================="

# Test 1: Check if shared-ui-library builds successfully
echo "📦 Test 1: Building shared-ui-library..."
cd study-planner/shared-ui-library
if npm run build; then
    echo "✅ Shared library build successful"
else
    echo "❌ Shared library build failed"
    exit 1
fi

# Test 2: Check if onboarding-ui builds with shared library
echo "🎯 Test 2: Building onboarding-ui..."
cd ../onboarding-ui
if npm run build; then
    echo "✅ Onboarding-UI build successful"
else
    echo "❌ Onboarding-UI build failed"
    exit 1
fi

# Test 3: Check if faculty-ui builds with shared library  
echo "👨‍🏫 Test 3: Building faculty-ui..."
cd ../faculty-ui
if npm run build; then
    echo "✅ Faculty-UI build successful"
else
    echo "❌ Faculty-UI build failed"
    exit 1
fi

# Test 4: Type checking for TypeScript integration
echo "🔍 Test 4: Type checking..."
cd ../onboarding-ui
if npm run check-types; then
    echo "✅ Onboarding-UI types valid"
else
    echo "⚠️  Onboarding-UI type issues detected"
fi

cd ../faculty-ui
if npm run type-check 2>/dev/null || tsc --noEmit; then
    echo "✅ Faculty-UI types valid"
else
    echo "⚠️  Faculty-UI type issues detected"
fi

echo "=================================="
echo "🎉 Integration tests completed!"
echo ""
echo "Next steps:"
echo "1. Start the backend server"
echo "2. Run 'npm run dev' in onboarding-ui"
echo "3. Run 'npm run dev' in faculty-ui"
echo "4. Test cross-app navigation manually"
echo "5. Verify shared authentication works"