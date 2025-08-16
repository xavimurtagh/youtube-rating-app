#!/bin/bash
# Deployment script for YouTube Rating App

echo "🚀 Deploying YouTube Rating App..."

# Build the application
echo "📦 Building application..."
npm run build

echo "✅ Build completed successfully!"
echo "🌐 Ready for deployment to Vercel"
echo ""
echo "To deploy to Vercel:"
echo "1. Install Vercel CLI: npm i -g vercel"
echo "2. Run: vercel"
echo "3. Follow the prompts"
echo ""
echo "Or connect your GitHub repository to Vercel for automatic deployments"
