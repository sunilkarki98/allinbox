#!/bin/bash

# GCP Deployment Script
# Run this ON the VM instance

echo "🚀 Starting Production Deployment..."

# 1. Validation
if [ ! -f .env ]; then
    echo "❌ Error: .env file missing!"
    echo "Please create .env with all production variables."
    exit 1
fi

# 2. Stop existing containers
echo "🛑 Stopping existing services..."
docker-compose -f docker-compose.prod.yml down

# 3. Prune unused images (Save disk space)
echo "🧹 Pruning old images..."
docker image prune -f

# 4. Build and Start
echo "🏗️ Building new images (this may take a while)..."
docker-compose -f docker-compose.prod.yml up -d --build

# 5. Health Check
echo "✅ deployment finished. Checking status..."
sleep 5
docker-compose -f docker-compose.prod.yml ps

echo "🎉 App should be live!"
