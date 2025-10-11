#!/bin/bash

# Script để thêm avatar.js vào tất cả file HTML chưa có

FILES=(
    "views/history.html"
    "views/ranking.html"
    "views/admin/admin-panel-base.html"
    "views/admin/match-manage.html"
    "views/admin/reports.html"
    "views/admin/login-logs.html"
    "views/admin/match-upload.html"
    "views/admin/users.html"
)

for file in "${FILES[@]}"; do
    if [ -f "$file" ]; then
        # Check if avatar.js already exists
        if grep -q "avatar.js" "$file"; then
            echo "✓ $file already has avatar.js"
        else
            echo "Adding avatar.js to $file..."
            # Find </body> and add script before it
            sed -i.bak 's|</body>|    <script src="/js/avatar.js"></script>\n</body>|' "$file"
            echo "✓ Added to $file"
        fi
    else
        echo "✗ File not found: $file"
    fi
done

echo "Done!"

