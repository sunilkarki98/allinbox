#!/bin/bash

# Deployment Script for Allinbox (Single VM Option)
# Usage: ./deploy.sh

echo "🚀 Starting Allinbox Deployment..."

# 1. Check for .env file
if [ ! -f .env ]; then
    echo "❌ Error: .env file not found!"
    echo "Please create a .env file with production variables."
    exit 1
fi

# 2. Check for Docker
if ! command -v docker &> /dev/null; then
    echo "❌ Error: Docker is not installed."
    echo "Please install Docker: sudo apt install docker.io docker-compose"
    exit 1
fi

# 3. Pull latest changes (if using git)
# git pull origin main

# 4. Build and Start Services
echo "📦 Building and starting services..."
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Check Status
echo "✅ Deployment complete! Checking status..."
docker-compose -f docker-compose.prod.yml ps

echo "🌐 Access your app at http://YOUR_SERVER_IP"
