#!/bin/bash
# ============================================
# SSR News VPS Setup - runs ON the VPS
# ============================================

set -e
echo ""
echo "======================================"
echo " STEP 1 - Current VPS State"
echo "======================================"
echo "--- /docker/n8n contents ---"
ls /docker/n8n/ 2>/dev/null || echo "NOT FOUND"
echo "--- docker-compose.yml ---"
cat /docker/n8n/docker-compose.yml 2>/dev/null || echo "NOT FOUND"
echo "--- .env ---"
cat /docker/n8n/.env 2>/dev/null || echo "NOT FOUND"
echo "--- Running containers ---"
docker ps --format "table {{.Names}}\t{{.Status}}\t{{.Ports}}"

echo ""
echo "======================================"
echo " STEP 2 - Firewall"
echo "======================================"
ufw allow 22
ufw allow 80
ufw allow 443
ufw --force enable
ufw status

echo ""
echo "======================================"
echo " STEP 3 - Update .env with domain"
echo "======================================"
cd /docker/n8n
cp .env .env.backup 2>/dev/null || true

# Remove old domain settings
sed -i '/^N8N_HOST=/d'             .env 2>/dev/null || true
sed -i '/^WEBHOOK_URL=/d'          .env 2>/dev/null || true
sed -i '/^N8N_EDITOR_BASE_URL=/d'  .env 2>/dev/null || true
sed -i '/^N8N_PROTOCOL=/d'         .env 2>/dev/null || true
sed -i '/^N8N_PROXY_HOPS=/d'       .env 2>/dev/null || true
sed -i '/^GENERIC_TIMEZONE=/d'     .env 2>/dev/null || true
sed -i '/^TZ=/d'                   .env 2>/dev/null || true

# Add new domain settings
cat >> .env << 'ENVEOF'

N8N_HOST=n8n.alveare-ai.com
WEBHOOK_URL=https://n8n.alveare-ai.com
N8N_EDITOR_BASE_URL=https://n8n.alveare-ai.com
N8N_PROTOCOL=https
N8N_PROXY_HOPS=1
GENERIC_TIMEZONE=Asia/Jerusalem
TZ=Asia/Jerusalem
ENVEOF

echo "Updated .env:"
cat .env

echo ""
echo "======================================"
echo " STEP 4 - Update Caddy / Reverse Proxy"
echo "======================================"
CADDYFILE=$(find /docker /root /opt -name "Caddyfile" 2>/dev/null | head -1)
if [ -n "$CADDYFILE" ]; then
    echo "Found Caddyfile at: $CADDYFILE"
    cat "$CADDYFILE"
    cp "$CADDYFILE" "${CADDYFILE}.backup"
    # Replace any existing domain line with our domain
    FIRST_LINE=$(head -1 "$CADDYFILE")
    if echo "$FIRST_LINE" | grep -q "{"; then
        sed -i "1s|.*|n8n.alveare-ai.com {|" "$CADDYFILE"
    fi
    echo "Updated Caddyfile:"
    cat "$CADDYFILE"
else
    echo "No Caddyfile found - checking nginx..."
    find /docker /root /opt -name "*.conf" 2>/dev/null | head -5
fi

echo ""
echo "======================================"
echo " STEP 5 - Restart n8n"
echo "======================================"
cd /docker/n8n
echo "Pulling latest images..."
docker compose pull
echo "Stopping containers..."
docker compose down
echo "Starting containers..."
docker compose up -d
sleep 10
echo "Container status:"
docker compose ps

echo ""
echo "======================================"
echo " STEP 6 - Health Check"
echo "======================================"
sleep 5
curl -sf http://localhost:5678/healthz && echo "n8n is UP!" || echo "n8n may still be starting..."
echo ""
echo "Last 20 log lines:"
docker compose logs n8n --tail=20

echo ""
echo "======================================"
echo " SETUP COMPLETE!"
echo "======================================"
echo " n8n:     https://n8n.alveare-ai.com"
echo " Webhook: https://n8n.alveare-ai.com/webhook/subscribe"
echo " Website: https://alveare-ai.com"
echo ""
echo " Remember to add DNS in hPanel:"
echo "   A record: @   -> 72.62.60.234"
echo "   A record: n8n -> 72.62.60.234"
echo "   A record: www -> 72.62.60.234"
