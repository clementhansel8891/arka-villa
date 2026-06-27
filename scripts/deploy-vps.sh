#!/bin/bash
# ─── Arka Villa — VPS Deployment Script ───────────────────────
# 
# Run this on your VPS (150.109.15.108) as user 'ubuntu'
#
# SSH: ssh ubuntu@150.109.15.108
# Password: (use your SSH password)
#
# This script:
# 1. Creates a new project folder
# 2. Clones the repo from GitHub
# 3. Builds and runs with Docker on port 3100
# ──────────────────────────────────────────────────────────────

set -e

echo "═══════════════════════════════════════════════"
echo "  Arka Villa — VPS Deployment"
echo "═══════════════════════════════════════════════"

# ─── Configuration ────────────────────────────────────────────
APP_DIR="/home/ubuntu/arka-villa"
PORT=3100  # Using port 3100 to avoid conflicts
REPO="https://github.com/clementhansel8891/arka-villa.git"

# ─── Step 1: Install Docker if not present ────────────────────
if ! command -v docker &> /dev/null; then
    echo "→ Installing Docker..."
    curl -fsSL https://get.docker.com | sh
    sudo usermod -aG docker ubuntu
    echo "→ Docker installed. You may need to log out and back in."
fi

if ! command -v docker compose &> /dev/null; then
    echo "→ Installing Docker Compose plugin..."
    sudo apt-get update
    sudo apt-get install -y docker-compose-plugin
fi

# ─── Step 2: Clone or pull the repo ──────────────────────────
if [ -d "$APP_DIR" ]; then
    echo "→ Project directory exists. Pulling latest changes..."
    cd "$APP_DIR"
    git pull origin main
else
    echo "→ Cloning repository..."
    git clone "$REPO" "$APP_DIR"
    cd "$APP_DIR"
fi

# ─── Step 3: Create production docker-compose ─────────────────
cat > docker-compose.prod.yml << 'EOF'
version: "3.9"

services:
  arka-villa:
    build: .
    container_name: arka-villa-app
    ports:
      - "3100:3000"
    environment:
      - NODE_ENV=production
      - NEXT_TELEMETRY_DISABLED=1
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "--no-verbose", "--tries=1", "--spider", "http://localhost:3000"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 40s
EOF

# ─── Step 4: Build and start ──────────────────────────────────
echo "→ Building Docker image (this may take 3-5 minutes)..."
docker compose -f docker-compose.prod.yml build --no-cache

echo "→ Stopping existing container if running..."
docker compose -f docker-compose.prod.yml down 2>/dev/null || true

echo "→ Starting application..."
docker compose -f docker-compose.prod.yml up -d

# ─── Step 5: Verify ──────────────────────────────────────────
echo ""
echo "→ Waiting for app to start..."
sleep 10

if curl -s -o /dev/null -w "%{http_code}" http://localhost:3100 | grep -q "200\|304"; then
    echo ""
    echo "═══════════════════════════════════════════════"
    echo "  ✓ Deployment successful!"
    echo ""
    echo "  Access the app at:"
    echo "  → http://150.109.15.108:3100"
    echo ""
    echo "  Container status:"
    docker ps --filter name=arka-villa-app --format "  {{.Names}}: {{.Status}}"
    echo "═══════════════════════════════════════════════"
else
    echo ""
    echo "  ⚠ App may still be starting up."
    echo "  Check logs with: docker logs arka-villa-app"
    echo "  Try accessing: http://150.109.15.108:3100"
fi
