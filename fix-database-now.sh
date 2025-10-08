#!/bin/bash

echo "🔧 Fixing database schema NOW (without rebuilding Docker)..."
echo ""

# Get container name
CONTAINER_NAME="kd-app-1"

# Check if container is running
if ! docker ps | grep -q $CONTAINER_NAME; then
  echo "❌ Container $CONTAINER_NAME is not running!"
  echo "Please start it first: docker-compose up -d"
  exit 1
fi

echo "✅ Container is running"
echo ""

# Run migration inside container
echo "🔄 Running migration inside container..."
docker exec $CONTAINER_NAME node db/check-and-migrate.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Migration completed successfully!"
  echo ""
  echo "🎉 You can now create matches!"
  echo ""
else
  echo ""
  echo "❌ Migration failed!"
  echo ""
  echo "Try manual fix:"
  echo "1. docker exec -it $CONTAINER_NAME sh"
  echo "2. node db/check-and-migrate.js"
  exit 1
fi

