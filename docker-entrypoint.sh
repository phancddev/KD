#!/bin/sh
set -e

echo "🚀 Starting KD Server..."
echo ""

# Wait for database to be ready
echo "⏳ Waiting for database to be ready..."
MAX_RETRIES=30
RETRY_COUNT=0

until nc -z mariadb 3306 2>/dev/null
do
  RETRY_COUNT=$((RETRY_COUNT+1))
  if [ $RETRY_COUNT -ge $MAX_RETRIES ]; then
    echo "❌ Database connection timeout after ${MAX_RETRIES} attempts!"
    exit 1
  fi
  echo "   Attempt ${RETRY_COUNT}/${MAX_RETRIES}: Waiting for database..."
  sleep 2
done

echo "✅ Database connection established!"
echo ""

# Wait a bit more to ensure database is fully initialized
echo "⏳ Waiting for database initialization..."
sleep 5

# Run database check and migration
echo "🔍 Checking and migrating database schema..."
echo ""

node db/check-and-migrate.js

if [ $? -eq 0 ]; then
  echo ""
  echo "✅ Database schema is up to date!"
  echo ""
else
  echo ""
  echo "❌ Database migration failed!"
  echo "   Please check the logs above for details."
  echo ""
  exit 1
fi

# Start the application
echo "🚀 Starting application..."
echo "=========================================="
echo ""

exec npm start

