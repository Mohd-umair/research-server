#!/bin/bash

# Coolify Deployment Script for Research Decode API
# This script helps prepare and deploy the application to Coolify

echo "🚀 Starting Coolify Deployment Preparation..."

# Check if we're in the right directory
if [ ! -f "server.js" ]; then
    echo "❌ Error: Please run this script from the server directory"
    exit 1
fi

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed. Please install Docker first."
    exit 1
fi

# Check if git is available
if ! command -v git &> /dev/null; then
    echo "❌ Error: Git is not installed. Please install Git first."
    exit 1
fi

echo "✅ Prerequisites check passed"

# Test Docker build locally
echo "🔨 Testing Docker build..."
if docker build -t research-decode-api .; then
    echo "✅ Docker build successful"
else
    echo "❌ Docker build failed. Please check the Dockerfile and dependencies."
    exit 1
fi

# Check if all required files exist
echo "📁 Checking required files..."
required_files=("Dockerfile" "docker-compose.yml" ".dockerignore" "package.json" "server.js")
for file in "${required_files[@]}"; do
    if [ -f "$file" ]; then
        echo "✅ $file exists"
    else
        echo "❌ $file is missing"
        exit 1
    fi
done

# Check git status
echo "📊 Checking git status..."
if git status --porcelain | grep -q .; then
    echo "⚠️  Warning: You have uncommitted changes"
    echo "   Consider committing changes before deployment:"
    echo "   git add . && git commit -m 'Prepare for Coolify deployment'"
else
    echo "✅ No uncommitted changes"
fi

# Show deployment checklist
echo ""
echo "📋 Coolify Deployment Checklist:"
echo "1. ✅ Dockerfile created"
echo "2. ✅ docker-compose.yml created"
echo "3. ✅ .dockerignore created"
echo "4. ✅ Health check endpoints added"
echo "5. ✅ Environment variables template created"
echo ""
echo "🎯 Next Steps:"
echo "1. Commit and push your changes:"
echo "   git add ."
echo "   git commit -m 'Add Coolify deployment configuration'"
echo "   git push origin main"
echo ""
echo "2. In Coolify Dashboard:"
echo "   - Create new application"
echo "   - Select your repository"
echo "   - Configure environment variables"
echo "   - Set domain: prodapi.researchdecode.com"
echo "   - Deploy application"
echo ""
echo "3. Test deployment:"
echo "   curl https://prodapi.researchdecode.com/health"
echo "   curl https://prodapi.researchdecode.com/api/health"
echo ""
echo "📖 For detailed instructions, see: COOLIFY_DEPLOYMENT_GUIDE.md"
echo ""
echo "🎉 Deployment preparation complete!" 