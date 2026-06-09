#!/bin/bash
# =============================================================================
# VPS First-Time Setup Script
# Run this ONCE on your VPS before the first deployment
# Usage: bash vps-setup.sh
# =============================================================================

set -euo pipefail

echo "=== VPS Setup for Dummy Project ==="

# ─── 1. Install Docker ────────────────────────────────────────────────────────
if ! command -v docker &>/dev/null; then
  echo "Installing Docker..."
  curl -fsSL https://get.docker.com | sh
  sudo usermod -aG docker $USER
  echo "Docker installed"
else
  echo "Docker already installed: $(docker --version)"
fi

# ─── 2. Install Docker Compose plugin ────────────────────────────────────────
if ! docker compose version &>/dev/null; then
  echo "Installing Docker Compose plugin..."
  sudo apt-get update
  sudo apt-get install -y docker-compose-plugin
  echo "Docker Compose installed"
else
  echo "Docker Compose already installed: $(docker compose version)"
fi

# ─── 3. Create project directory ──────────────────────────────────────────────
echo "Creating project directory..."
sudo mkdir -p /opt/Dummy
sudo chown -R $USER:$USER /opt/Dummy

# ─── 4. Clone repository ──────────────────────────────────────────────────────
if [ ! -d "/opt/Dummy/.git" ]; then
  echo "Cloning repository..."
  # Replace with your actual repo URL
  git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git /opt/Dummy
else
  echo "Repository already cloned"
fi

cd /opt/Dummy

# ─── 5. Create .env.production ────────────────────────────────────────────────
if [ ! -f ".env.production" ]; then
  echo "Creating .env.production from template..."
  cp env.production.example .env.production
  echo ""
  echo "⚠️  IMPORTANT: Edit .env.production with your actual values:"
  echo "   nano /opt/Dummy/.env.production"
  echo ""
else
  echo ".env.production already exists"
fi

# ─── 6. Create livekit.yaml ───────────────────────────────────────────────────
if [ ! -f "livekit.yaml" ]; then
  echo "Creating livekit.yaml..."
  cat > livekit.yaml << 'LIVEKIT_CONFIG'
port: 7880
rtc:
  tcp_port: 7881
  port_range_start: 50000
  port_range_end: 50200
  use_external_ip: true
keys:
  your_api_key: your_api_secret
logging:
  level: info
  pion_level: error
room:
  empty_timeout: 300
  max_participants: 50
  enable_remote_ice_candidates: true
LIVEKIT_CONFIG
  echo "⚠️  Update livekit.yaml with your actual API key and secret"
else
  echo "livekit.yaml already exists"
fi

# ─── 7. Open firewall ports ───────────────────────────────────────────────────
echo "Opening firewall ports..."
sudo ufw allow 22/tcp    # SSH
sudo ufw allow 80/tcp    # HTTP (nginx)
sudo ufw allow 443/tcp   # HTTPS (for future SSL)
sudo ufw allow 3001/tcp  # Backend (direct access if needed)
sudo ufw allow 7880/tcp  # LiveKit HTTP/WebSocket
sudo ufw allow 7881/tcp  # LiveKit TCP WebRTC
sudo ufw allow 50000:50200/udp  # LiveKit UDP media
sudo ufw --force enable
echo "Firewall configured"

# ─── 8. Create uploads directory ─────────────────────────────────────────────
echo "Creating uploads directory..."
mkdir -p /opt/Dummy/backend/uploads/images
chmod 755 /opt/Dummy/backend/uploads

# ─── 9. Create backups directory ─────────────────────────────────────────────
mkdir -p /opt/Dummy/backups

echo ""
echo "=== Setup Complete ==="
echo ""
echo "Next steps:"
echo "1. Edit .env.production:  nano /opt/Dummy/.env.production"
echo "2. Edit livekit.yaml:     nano /opt/Dummy/livekit.yaml"
echo "3. Push to main branch to trigger deployment"
echo ""
echo "Key things to update in .env.production:"
echo "  - YOUR_VPS_IP → your actual VPS IP address"
echo "  - LIVEKIT_API_KEY and LIVEKIT_API_SECRET"
echo "  - All SECRET values"
echo ""
echo "Key things to update in livekit.yaml:"
echo "  - your_api_key: your_api_secret  (must match .env.production)"
