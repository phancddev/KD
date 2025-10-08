#!/bin/bash

echo "🔄 REBUILD DOCKER - FRESH START (DELETE ALL DATA)"
echo "=========================================="
echo ""
echo "⚠️  WARNING: This will:"
echo "  ❌ DELETE ALL DATABASE DATA"
echo "  ❌ DELETE ALL UPLOADED FILES"
echo "  ✅ Create fresh database with all migrations"
echo "  ✅ Rebuild all containers"
echo ""

# Confirm
read -p "Are you SURE you want to delete all data? (yes/no) " -r
echo ""
if [[ ! $REPLY =~ ^yes$ ]]
then
    echo "❌ Cancelled (you must type 'yes' to confirm)"
    exit 1
fi

echo ""
echo "📦 Step 1: Stop all containers..."
docker-compose down

echo ""
echo "🗑️  Step 2: Remove database volume (DELETE DATA)..."
docker volume rm kd-mariadb_data 2>/dev/null || echo "   Volume already removed or doesn't exist"

echo ""
echo "🗑️  Step 3: Remove uploaded files..."
rm -rf uploads/*
echo "   ✅ Uploads directory cleaned"

echo ""
echo "🏗️  Step 4: Rebuild all images (no cache)..."
docker-compose build --no-cache

echo ""
echo "🚀 Step 5: Start all containers..."
docker-compose up -d

echo ""
echo "⏳ Step 6: Wait for database initialization..."
echo "   This may take 30-60 seconds for first-time setup..."
sleep 30

echo ""
echo "📊 Step 7: Check container status..."
docker-compose ps

echo ""
echo "📝 Step 8: Check database logs..."
docker-compose logs mariadb | tail -20

echo ""
echo "📝 Step 9: Check app logs..."
docker-compose logs app | tail -30

echo ""
echo "✅ FRESH REBUILD COMPLETED!"
echo ""
echo "🔍 Next steps:"
echo "1. Check logs: docker-compose logs -f app"
echo "2. Login: http://localhost:2701/login"
echo "   Username: admin"
echo "   Password: admin123"
echo "3. Create match: http://localhost:2701/admin/matches"
echo ""
echo "📊 Database should have all tables including 'storage_folder' column"
echo ""

