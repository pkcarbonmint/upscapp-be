#!/bin/bash

# Script to create test faculty users
# Run with: ./scripts/create_test_faculty.sh

echo "🚀 Creating test faculty users..."

# Change to project root
cd "$(dirname "$0")/.."

# Activate virtual environment
source venv/bin/activate

# Run the Python script
python scripts/create_test_faculty.py

echo "✅ Test faculty users created!"
echo ""
echo "📝 Testing Instructions:"
echo "1. Phone: 8888888888 → OTP: 666666"
echo "2. Phone: 6666666666 → OTP: 777777"
echo "3. Or use email/password login"
echo ""
echo "🔗 Faculty UI: http://localhost:3000/login"
