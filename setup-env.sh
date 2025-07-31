#!/bin/bash

# Environment Setup Script for Research Decode API
# This script helps set up environment variables on the server

echo "🔧 Setting up environment variables for Research Decode API..."

# Check if .env file exists
if [ ! -f ".env" ]; then
    echo "📝 Creating .env file..."
    cat > .env << 'EOF'
# Database Configuration
MONGODB_PROD=mongodb+srv://shayezkarimcide:Kzf9BToFNc3ZHcHG@researchdecode.09dvtd1.mongodb.net/

# JWT Configuration
JWT_SECRET=your_super_secret_jwt_key_change_this_in_production_research_decode_2024
JWT_EXPIRES_IN=24h
JWT_ADMIN_EXPIRES_IN=24h

# Admin System Configuration
INITIAL_SUPER_ADMIN_EMAIL=superadmin@research.com
INITIAL_SUPER_ADMIN_PASSWORD=SuperAdmin123!
INITIAL_SUPER_ADMIN_NAME=System Administrator

# Security Settings
BCRYPT_ROUNDS=12
MAX_LOGIN_ATTEMPTS=5
LOCK_TIME=15

# Server Configuration
PORT=5002
SOCKET_PORT=5001
NODE_ENV=prod

# Payment Gateway Configuration (Razorpay)
RAZORPAY_KEY_ID=rzp_test_jLhZZYBPKlMBn9
RAZORPAY_SECRET=zEhFSyPXABeTkMMClwK9LxIn
RAZORPAYX_ACCOUNT_NUMBER=2323230025954705

# Cloud Storage Configuration (Cloudinary)
CLOUDINARY_CLOUD_NAME=dydmzp82t
CLOUDINARY_API_KEY=573256125428726
CLOUDINARY_API_SECRET=ZxVgyMOzXuHjHqwHLbavF94iOf4

# Application URLs
BASE_URL=https://prodapi.researchdecode.com
FRONTEND_URL=https://researchdecode.com
ADMIN_PANEL_URL=https://admin.researchdecode.com

# CORS Configuration
CORS_ORIGINS=https://researchdecode.com,https://www.researchdecode.com,https://admin.researchdecode.com
EOF
    echo "✅ .env file created"
else
    echo "✅ .env file already exists"
fi

# Check if required environment variables are set
echo "🔍 Checking environment variables..."

# Check Razorpay variables
if [ -z "$RAZORPAY_KEY_ID" ] && [ -f ".env" ]; then
    echo "⚠️  RAZORPAY_KEY_ID not set in environment"
    echo "   It should be set in your .env file or environment"
fi

if [ -z "$RAZORPAY_SECRET" ] && [ -f ".env" ]; then
    echo "⚠️  RAZORPAY_SECRET not set in environment"
    echo "   It should be set in your .env file or environment"
fi

# Check MongoDB variables
if [ -z "$MONGODB_PROD" ] && [ -f ".env" ]; then
    echo "⚠️  MONGODB_PROD not set in environment"
    echo "   It should be set in your .env file or environment"
fi

# Check JWT variables
if [ -z "$JWT_SECRET" ] && [ -f ".env" ]; then
    echo "⚠️  JWT_SECRET not set in environment"
    echo "   It should be set in your .env file or environment"
fi

echo ""
echo "📋 Environment Variables Status:"
echo "   RAZORPAY_KEY_ID: ${RAZORPAY_KEY_ID:-'NOT SET'}"
echo "   RAZORPAY_SECRET: ${RAZORPAY_SECRET:-'NOT SET'}"
echo "   MONGODB_PROD: ${MONGODB_PROD:-'NOT SET'}"
echo "   JWT_SECRET: ${JWT_SECRET:-'NOT SET'}"
echo "   NODE_ENV: ${NODE_ENV:-'NOT SET'}"
echo "   PORT: ${PORT:-'NOT SET'}"

echo ""
echo "🎯 Next Steps:"
echo "1. If variables are NOT SET, you need to:"
echo "   - Set them in your .env file"
echo "   - Or export them in your shell:"
echo "     export RAZORPAY_KEY_ID=your_key_id"
echo "     export RAZORPAY_SECRET=your_secret"
echo "     export NODE_ENV=prod"
echo ""
echo "2. Test the server:"
echo "   node server.js"
echo ""
echo "3. If you're using PM2:"
echo "   pm2 start server.js --name research-api"
echo ""
echo "✅ Environment setup complete!" 