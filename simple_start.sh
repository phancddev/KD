#!/bin/bash

# simple_start.sh - Script đơn giản để start app port 2701
# Sử dụng: ./simple_start.sh [command]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Function to print colored output
print_status() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

print_header() {
    echo -e "${BLUE}[SIMPLE APP]${NC} $1"
}

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
COMMAND=${1:-"start"}

# Help function
show_help() {
    echo "Simple NQD App Manager"
    echo
    echo "Sử dụng: $0 <command>"
    echo
    echo "Commands:"
    echo "  start      - Start app (default)"
    echo "  stop       - Stop app"
    echo "  restart    - Restart app"
    echo "  status     - Show status"
    echo "  logs       - Show logs"
    echo "  build      - Rebuild app"
    echo "  clean      - Clean và rebuild"
    echo "  info       - Show connection info"
    echo "  help       - Show this help"
    echo
    echo "Ví dụ:"
    echo "  $0 start"
    echo "  $0 logs"
    echo "  $0 restart"
}

# Get VPS IP
get_vps_ip() {
    if command -v curl >/dev/null 2>&1; then
        curl -s ifconfig.me 2>/dev/null || hostname -I | awk '{print $1}' || echo "YOUR_VPS_IP"
    else
        hostname -I | awk '{print $1}' || echo "YOUR_VPS_IP"
    fi
}

# Start app
start_app() {
    print_header "Starting NQD App"
    
    cd "$SCRIPT_DIR"
    
    if [ ! -f "docker-compose.yml" ]; then
        print_error "docker-compose.yml không tồn tại!"
        exit 1
    fi
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Waiting for services..."
    sleep 10
    
    show_status
}

# Stop app
stop_app() {
    print_header "Stopping NQD App"
    
    cd "$SCRIPT_DIR"
    docker-compose down
    
    print_status "✅ App stopped"
}

# Restart app
restart_app() {
    print_header "Restarting NQD App"
    
    cd "$SCRIPT_DIR"
    docker-compose restart
    
    print_status "Waiting for services..."
    sleep 5
    
    show_status
}

# Show status
show_status() {
    print_header "App Status"
    
    cd "$SCRIPT_DIR"
    echo "Docker services:"
    docker-compose ps
    
    echo
    VPS_IP=$(get_vps_ip)
    echo "🔗 Access URLs:"
    echo "  App: http://${VPS_IP}:2701"
    echo "  Adminer: http://${VPS_IP}:8080"
    
    # Test connectivity
    echo
    echo "🔍 Connectivity test:"
    if curl -s -o /dev/null -w "%{http_code}" "http://localhost:2701" | grep -q "200\|301\|302\|404"; then
        print_status "✅ App is responding on port 2701"
    else
        print_warning "⚠️ App might not be responding on port 2701"
    fi
    
    # Check ports
    echo
    echo "📊 Port status:"
    if netstat -tlnp 2>/dev/null | grep -q :2701; then
        print_status "✅ Port 2701 is active"
    else
        print_warning "⚠️ Port 2701 not bound"
    fi
    
    if netstat -tlnp 2>/dev/null | grep -q :3307; then
        print_status "✅ Database port 3307 is active"
    else
        print_warning "⚠️ Database port 3307 not bound"
    fi
}

# Show logs
show_logs() {
    print_header "App Logs"
    
    cd "$SCRIPT_DIR"
    echo "Showing logs (Ctrl+C to exit)..."
    echo
    docker-compose logs -f
}

# Build app
build_app() {
    print_header "Building App"
    
    cd "$SCRIPT_DIR"
    
    print_status "Building Docker images..."
    docker-compose build --no-cache
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Waiting for services..."
    sleep 10
    
    show_status
}

# Clean and rebuild
clean_app() {
    print_header "Clean & Rebuild App"
    
    cd "$SCRIPT_DIR"
    
    print_status "Stopping containers..."
    docker-compose down --remove-orphans
    
    print_status "Cleaning Docker system..."
    docker system prune -f
    
    print_status "Rebuilding..."
    docker-compose build --no-cache
    
    print_status "Starting services..."
    docker-compose up -d
    
    print_status "Waiting for services..."
    sleep 15
    
    show_status
}

# Show connection info
show_info() {
    print_header "Connection Information"
    
    VPS_IP=$(get_vps_ip)
    
    echo
    echo "=================================="
    echo "📋 NQD APP CONNECTION INFO:"
    echo "=================================="
    echo "🌐 VPS IP: ${VPS_IP}"
    echo "🔗 App URL: http://${VPS_IP}:2701"
    echo "🔗 Database Admin: http://${VPS_IP}:8080"
    echo
    echo "📊 Port mapping:"
    echo "  - App: 2701 (HTTP)"
    echo "  - Database: 3307 (MySQL)"
    echo "  - Adminer: 8080 (DB Admin)"
    echo
    echo "🔧 Database connection:"
    echo "  - Host: ${VPS_IP}"
    echo "  - Port: 3307"
    echo "  - Database: nqd_database"
    echo "  - Username: nqd_user"
    echo "  - Password: nqd_password"
    echo
    echo "📋 Useful commands:"
    echo "  ./simple_start.sh status    # Check status"
    echo "  ./simple_start.sh logs      # View logs"
    echo "  ./simple_start.sh restart   # Restart app"
    echo "  ./simple_start.sh clean     # Clean rebuild"
    echo
    echo "📝 Files:"
    echo "  - App code: $(pwd)"
    echo "  - Uploads: $(pwd)/uploads"
    echo "  - Database: Docker volume"
    echo
    
    # Show current status
    echo "📊 Current status:"
    cd "$SCRIPT_DIR"
    docker-compose ps | head -1
    docker-compose ps | grep -E "(app|mariadb|adminer)" | awk '{print "  " $0}'
}

# Main logic
case "$COMMAND" in
    "start")
        start_app
        ;;
    "stop")
        stop_app
        ;;
    "restart")
        restart_app
        ;;
    "status")
        show_status
        ;;
    "logs")
        show_logs
        ;;
    "build")
        build_app
        ;;
    "clean")
        clean_app
        ;;
    "info")
        show_info
        ;;
    "help"|*)
        show_help
        ;;
esac