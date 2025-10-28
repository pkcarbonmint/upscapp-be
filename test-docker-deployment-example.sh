#!/bin/bash

# Example script showing how to test Docker deployment
# This demonstrates the complete workflow:
# 1. Start Docker containers
# 2. Wait for services to be ready
# 3. Run deployment tests
# 4. Report results

set -e  # Exit on error

echo "=========================================="
echo "Docker Deployment Test Example"
echo "=========================================="
echo ""

# Step 1: Start Docker services
echo "📦 Starting Docker services..."
docker-compose up -d

echo "⏳ Waiting for services to start (30 seconds)..."
sleep 30

# Step 2: Check container status
echo ""
echo "📊 Container Status:"
docker-compose ps

# Step 3: Wait for backend to be healthy
echo ""
echo "🏥 Checking backend health..."
max_attempts=30
attempt=0
backend_healthy=false

while [ $attempt -lt $max_attempts ]; do
  if docker-compose exec -T app curl -s http://localhost:8000/api/health > /dev/null 2>&1; then
    echo "✅ Backend is healthy!"
    backend_healthy=true
    break
  fi
  echo "⏳ Attempt $((attempt + 1))/$max_attempts - waiting for backend..."
  sleep 2
  attempt=$((attempt + 1))
done

if [ "$backend_healthy" = false ]; then
  echo "❌ Backend failed to become healthy"
  docker-compose logs app
  exit 1
fi

# Step 4: Run deployment tests
echo ""
echo "🧪 Running deployment tests..."
echo ""

if node test_docker_deployment.js; then
  echo ""
  echo "=========================================="
  echo "✅ All deployment tests passed!"
  echo "=========================================="
  exit 0
else
  echo ""
  echo "=========================================="
  echo "❌ Deployment tests failed!"
  echo "=========================================="
  echo ""
  echo "Container logs:"
  echo "----------------"
  docker-compose logs --tail=50 app
  exit 1
fi
