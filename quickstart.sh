#!/bin/bash

echo "🎬 YouTube Rating App - Quick Start"
echo "=================================="

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo "❌ npm is not installed. Please install Node.js first."
    exit 1
fi

echo "📦 Installing dependencies..."
npm install

echo "🚀 Starting development server..."
echo "💻 Open http://localhost:3000 in your browser"
echo "🛑 Press Ctrl+C to stop the server"
echo ""

npm run dev
