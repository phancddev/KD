#!/bin/bash

# make_executable.sh - Script để đảm bảo tất cả scripts có thể execute
# Sử dụng: ./make_executable.sh

echo "🔧 Making all scripts executable..."

# List of script files
SCRIPTS=(
    "auto_setup.sh"
    "quick_deploy.sh"
    "touch_domain.sh"
    "setup_nginx_proxy.sh"
    "domain_manager.sh"
    "ssl_setup.sh"
    "debug_nginx.sh"
    "fix_nginx.sh"
    "make_executable.sh"
)

# Make scripts executable
for script in "${SCRIPTS[@]}"; do
    if [ -f "$script" ]; then
        chmod +x "$script"
        echo "✅ $script"
    else
        echo "❌ $script (not found)"
    fi
done

echo
echo "📋 Script permissions:"
ls -la *.sh | grep -E '^-rwx'

echo
echo "🎉 All scripts are now executable!"
echo
echo "📖 Quick start:"
echo "  sudo ./auto_setup.sh kd.tiepluatrithuc.com    # Full setup"
echo "  ./quick_deploy.sh kd.tiepluatrithuc.com       # Quick deploy"
echo "  ./domain_manager.sh status                    # Check status"
echo
echo "📚 See DEPLOY_GUIDE.md for detailed instructions"