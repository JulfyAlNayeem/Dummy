#!/bin/bash
# Complete fix for uploads and socket.io issues

set -e  # Exit on error

echo "🚀 Starting comprehensive deployment fix..."

cd /opt/Dummy

# Step 1: Pull latest code
echo "📥 Pulling latest code from GitHub..."
git pull origin main

# Step 2: Stop all running services
echo "🛑 Stopping all services..."
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production down -v

# Step 3: Clean up old images and volumes
echo "🗑️  Cleaning up old Docker resources..."
sudo docker system prune -af --volumes

# Step 4: Remove specific images to force rebuild
echo "🗑️  Removing old images..."
sudo docker rmi dummy-backend-prod 2>/dev/null || true
sudo docker rmi dummy-frontend-prod 2>/dev/null || true
sudo docker rmi $(docker images 'julfyalnayeem/*' -q) 2>/dev/null || true

# Step 5: Rebuild from scratch with no cache
echo "🔨 Building frontend (with updated nginx.conf)..."
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache frontend

echo "🔨 Building backend..."
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production build --no-cache backend

# Step 6: Start all services
echo "🚀 Starting all services..."
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production up -d

# Step 7: Wait for services to be healthy
echo "⏳ Waiting 15 seconds for services to start..."
sleep 15

# Step 8: Verify services are running
echo "✅ Checking service status..."
sudo docker-compose -f docker-compose.prod.yml --env-file .env.production ps

echo ""
echo "📋 ==== BACKEND LOGS ===="
sudo docker logs --tail 30 dummy-backend-prod

echo ""
echo "📋 ==== FRONTEND LOGS ===="
sudo docker logs --tail 30 dummy-frontend-prod 2>&1 | head -50

echo ""
echo "✅ Deployment complete!"
echo ""
echo "🔍 To check logs in real-time:"
echo "   Backend:  sudo docker logs -f --tail 50 dummy-backend-prod"
echo "   Frontend: sudo docker logs -f --tail 50 dummy-frontend-prod"
echo ""
echo "🧪 To test connectivity:"
echo "   curl http://localhost/health"
echo "   curl http://localhost:3001/health"
