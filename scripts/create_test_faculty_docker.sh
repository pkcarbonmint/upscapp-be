#!/bin/bash

# Docker-compatible script to create test faculty users
# Run with: ./scripts/create_test_faculty_docker.sh

echo "🐳 Creating test faculty users in Docker environment..."

# Check if Docker containers are running
if ! docker ps | grep -q "app"; then
    echo "❌ Docker container 'app' is not running!"
    echo "Please start your Docker containers first:"
    echo "  docker-compose up -d"
    exit 1
fi

echo "✅ Docker containers are running"

# Create the test faculty users by running the script inside the app container
echo "🚀 Running test faculty creation script inside Docker container..."

docker exec -it app python scripts/simple_test_faculty.py

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Test faculty users created successfully!"
    echo ""
    echo "📝 Testing Instructions:"
    echo "1. Phone: 8888888888 → OTP: 666666"
    echo "2. Phone: 6666666666 → OTP: 777777"
    echo "3. Or use email/password login"
    echo ""
    echo "🔗 Faculty UI: http://localhost:3000/login"
    echo "🔗 Backend API: http://localhost:8000/docs"
else
    echo "❌ Failed to create test faculty users"
    exit 1
fi



