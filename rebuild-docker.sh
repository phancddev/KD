#!/bin/bash

echo "🔄 REBUILD DOCKER - KEEP DATABASE DATA"
echo "=========================================="
echo ""
echo "This will:"
echo "  ✅ Rebuild app container"
echo "  ✅ Keep database data (no data loss)"
echo "  ✅ Run migrations automatically"
echo ""

# Confirm
read -p "Continue? (y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]
then
    echo "❌ Cancelled"
    exit 1
fi

echo ""
echo "📦 Step 1: Stop all containers..."
docker-compose down

echo ""
echo "🏗️  Step 2: Rebuild app image (no cache)..."
docker-compose build --no-cache app

echo ""
echo "🚀 Step 3: Start all containers..."
docker-compose up -d

echo ""
echo "⏳ Step 4: Wait for services to be ready..."
sleep 15

echo ""
echo "📊 Step 5: Check container status..."
docker-compose ps

echo ""
echo "📝 Step 6: Check app logs (migration should run)..."
docker-compose logs app | tail -30

echo ""
echo "✅ REBUILD COMPLETED!"
echo ""
echo "🔍 Next steps:"
echo "1. Check full logs: docker-compose logs -f app"
echo "2. Test create match: http://localhost:2701/admin/matches"
echo "3. If migration failed, check: docker-compose logs app | grep -A 20 'Checking database'"
echo ""

