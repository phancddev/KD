#!/bin/bash

# Dừng các container
echo "Đang dừng môi trường test..."
docker-compose -f docker-compose.local.yml down

echo ""
echo "=============================================="
echo "Môi trường test đã dừng thành công!"
echo "=============================================="