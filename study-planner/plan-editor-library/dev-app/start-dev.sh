#!/bin/bash

# Start the plan editor development app
echo "Starting Plan Editor Development App..."
echo "This will start a development server at http://localhost:3001"
echo ""

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Start the development server
npm run dev




