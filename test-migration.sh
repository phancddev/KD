#!/bin/bash

echo "🧪 TEST MIGRATION (IDEMPOTENT)"
echo "=========================================="
echo ""
echo "This script will:"
echo "  1. Run migration (safe - can run multiple times)"
echo "  2. Show before/after state"
echo "  3. Verify idempotency"
echo ""

CONTAINER_NAME="kd-app-1"

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo "❌ Container $CONTAINER_NAME is not running!"
  echo ""
  echo "Please start it first:"
  echo "  cd KD"
  echo "  docker-compose up -d"
  exit 1
fi

echo "✅ Container is running"
echo ""

# Run migration first time
echo "=========================================="
echo "🔄 RUN 1: First migration run"
echo "=========================================="
docker exec $CONTAINER_NAME node db/check-and-migrate.js

echo ""
echo "Press Enter to run migration AGAIN (test idempotency)..."
read

# Run migration second time (should skip everything)
echo ""
echo "=========================================="
echo "🔄 RUN 2: Second migration run (should SKIP)"
echo "=========================================="
docker exec $CONTAINER_NAME node db/check-and-migrate.js

echo ""
echo "=========================================="
echo "✅ IDEMPOTENCY TEST COMPLETED"
echo "=========================================="
echo ""
echo "Expected behavior:"
echo "  RUN 1: Should add column (if not exists) and update NULL values"
echo "  RUN 2: Should SKIP everything (already exists)"
echo ""
echo "If both runs show 'already exists' or 'SKIP', migration is idempotent! ✅"
echo ""

