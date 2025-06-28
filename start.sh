#!/bin/bash

# Magnet Stream - Startup Script

echo "🎬 Starting Magnet Stream Application..."
echo "========================================"

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo "❌ Error: Node.js is not installed!"
    echo "Please install Node.js from https://nodejs.org/"
    exit 1
fi

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ Error: npm is not installed!"
    echo "Please install npm or use a Node.js installer that includes npm"
    exit 1
fi

# Check if package.json exists
if [ ! -f "package.json" ]; then
    echo "❌ Error: package.json not found!"
    echo "Please make sure you're in the correct directory"
    exit 1
fi

# Install dependencies if node_modules doesn't exist
if [ ! -d "node_modules" ]; then
    echo "📦 Installing dependencies..."
    npm install
    if [ $? -ne 0 ]; then
        echo "❌ Error: Failed to install dependencies!"
        exit 1
    fi
    echo "✅ Dependencies installed successfully!"
else
    echo "✅ Dependencies already installed"
fi

# Check if required files exist
required_files=("stream-server.js" "index.html" "styles.css" "script.js")
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: Required file '$file' not found!"
        exit 1
    fi
done

echo "✅ All required files found"

# Start the server
echo "🚀 Starting server on http://localhost:3000"
echo "📱 Open your browser and navigate to: http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop the server"
echo "========================================"

# Start the server
node stream-server.js 