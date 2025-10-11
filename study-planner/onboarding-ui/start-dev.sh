#!/bin/bash

# Development startup script for onboarding-ui with HMR
# This script starts the backend services in Docker and the frontend in HMR mode

set -e

# Start frontend in HMR mode
echo "⚡ Starting frontend in HMR mode..."
echo " Make sure docker containers are running"
echo ""
echo "🌐 Frontend will be available at: http://localhost:5173"
echo "🔧 Backend API available at: http://localhost:8000"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""

# Start frontend
npm run dev:hmr &
FRONTEND_PID=$!

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "🛑 Stopping services..."
    kill $FRONTEND_PID 2>/dev/null || true
    kill $BACKEND_PID 2>/dev/null || true
    cd .. && docker-compose down
    echo "✅ All services stopped"
    exit 0
}

# Trap Ctrl+C
trap cleanup SIGINT SIGTERM

# Wait for frontend process
wait $FRONTEND_PID
