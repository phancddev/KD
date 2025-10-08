#!/bin/bash

# Script to test Docker migration
# This script will:
# 1. Stop current containers
# 2. Rebuild app container
# 3. Start containers
# 4. Wait for migration to complete
# 5. Test migration results

set -e

echo "=========================================="
echo "TEST DOCKER MIGRATION"
echo "=========================================="
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Stop containers
echo "📦 Step 1: Stopping containers..."
docker-compose down
echo ""

# Step 2: Rebuild app container
echo "🔨 Step 2: Rebuilding app container..."
docker-compose build app
echo ""

# Step 3: Start containers
echo "🚀 Step 3: Starting containers..."
docker-compose up -d
echo ""

# Step 4: Wait for migration
echo "⏳ Step 4: Waiting for migration to complete..."
echo "   (This may take 30-60 seconds)"
echo ""

# Wait for app to be ready
MAX_WAIT=60
WAIT_COUNT=0

while [ $WAIT_COUNT -lt $MAX_WAIT ]; do
  if docker-compose logs app 2>&1 | grep -q "Database migration completed"; then
    echo -e "${GREEN}✅ Migration completed!${NC}"
    break
  fi
  
  if docker-compose logs app 2>&1 | grep -q "Database migration failed"; then
    echo -e "${RED}❌ Migration failed!${NC}"
    echo ""
    echo "Logs:"
    docker-compose logs app | tail -50
    exit 1
  fi
  
  WAIT_COUNT=$((WAIT_COUNT + 1))
  echo "   Waiting... ($WAIT_COUNT/$MAX_WAIT)"
  sleep 1
done

if [ $WAIT_COUNT -ge $MAX_WAIT ]; then
  echo -e "${RED}❌ Timeout waiting for migration!${NC}"
  echo ""
  echo "Logs:"
  docker-compose logs app | tail -50
  exit 1
fi

echo ""

# Step 5: Show migration logs
echo "📋 Step 5: Migration logs:"
echo "=========================================="
docker-compose logs app | grep -A 100 "Checking database schema"
echo "=========================================="
echo ""

# Step 6: Test migration
echo "🧪 Step 6: Testing migration..."
echo ""

# Run test inside container
docker-compose exec -T app node test-game-mode-migration.js

if [ $? -eq 0 ]; then
  echo ""
  echo -e "${GREEN}=========================================="
  echo "✅ ALL TESTS PASSED!"
  echo "==========================================${NC}"
  echo ""
  echo "Migration is working correctly!"
  echo ""
  echo "Next steps:"
  echo "  - Check application: http://localhost:2701"
  echo "  - Check Adminer: http://localhost:8080"
  echo "  - View logs: docker-compose logs -f app"
else
  echo ""
  echo -e "${RED}=========================================="
  echo "❌ TESTS FAILED!"
  echo "==========================================${NC}"
  echo ""
  echo "Please check the logs above for details."
  exit 1
fi

