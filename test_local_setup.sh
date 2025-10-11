#!/bin/bash

# Quick test script for local development setup

echo "🧪 Testing local development setup..."

# Test Python backend
echo "Testing Python backend..."
curl -f http://localhost:8000/docs > /dev/null 2>&1 && echo "✅ Python backend OK" || echo "❌ Python backend failed"

# Test Helios engine
echo "Testing Helios engine..."
curl -f http://localhost:8080/health && echo "✅ Helios engine OK" || echo "❌ Helios engine failed"

# Test database connection (via a working endpoint)
echo "Testing database connection..."
curl -f "http://localhost:8000/api/studyplanner/onboarding/students/test-id/preview" > /dev/null 2>&1 && echo "✅ Database OK" || echo "❌ Database connection failed (expected for non-existent student)"

# Test preview endpoint
echo "Testing preview endpoint..."
curl -f "http://localhost:8000/api/studyplanner/onboarding/students/6e424d8c-0594-412d-b2ca-c3dd52b018d3/preview" > /dev/null && echo "✅ Preview endpoint OK" || echo "❌ Preview endpoint failed"

echo "🏁 Test complete"
