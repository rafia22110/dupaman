import paramiko
import time
import sys

HOST = "72.62.60.234"
USER = "root"
PASS = "221069aa$rr"

print("\n" + "="*50)
print(" Connecting to VPS:", HOST)
print("="*50)

client = paramiko.SSHClient()
client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

# Try password auth, then keyboard-interactive
try:
    client.connect(
        HOST, username=USER, password=PASS,
        timeout=30, allow_agent=False, look_for_keys=False,
        auth_timeout=30
    )
    print("Connected via password auth!")
except paramiko.AuthenticationException:
    print("Trying keyboard-interactive auth...")
    try:
        transport = paramiko.Transport((HOST, 22))
        transport.connect()
        def handler(title, instructions, fields):
            return [PASS] * len(fields)
        transport.auth_interactive(USER, handler)
        client._transport = transport
        print("Connected via keyboard-interactive!")
    except Exception as e2:
        print(f"Both auth methods failed: {e2}")
        print(f"Please verify password: {PASS!r}")
        sys.exit(1)
print("Connected!\n")

def run(cmd, timeout=120):
    print(f"\n>>> {cmd[:80]}...")
    stdin, stdout, stderr = client.exec_command(cmd, timeout=timeout, get_pty=True)
    out = stdout.read().decode("utf-8", errors="replace")
    err = stderr.read().decode("utf-8", errors="replace")
    if out: print(out)
    if err: print("[STDERR]", err)
    return out

# ── STEP 1: Check current state ──────────────────────────────
print("\n" + "="*50)
print(" STEP 1 - Current VPS State")
print("="*50)
run("ls /docker/n8n/ 2>/dev/null || echo 'NOT FOUND'")
run("cat /docker/n8n/docker-compose.yml 2>/dev/null || echo 'NOT FOUND'")
run("cat /docker/n8n/.env 2>/dev/null || echo 'NOT FOUND'")
run("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")

# ── STEP 2: Firewall ─────────────────────────────────────────
print("\n" + "="*50)
print(" STEP 2 - Firewall")
print("="*50)
run("ufw allow 22 ; ufw allow 80 ; ufw allow 443 ; ufw --force enable ; ufw status")

# ── STEP 3: Update .env ──────────────────────────────────────
print("\n" + "="*50)
print(" STEP 3 - Update .env with domain")
print("="*50)
run("cd /docker/n8n && cp .env .env.backup 2>/dev/null ; true")
run(
    "cd /docker/n8n && "
    "sed -i '/^N8N_HOST=/d;/^WEBHOOK_URL=/d;/^N8N_EDITOR_BASE_URL=/d;"
    "/^N8N_PROTOCOL=/d;/^N8N_PROXY_HOPS=/d;/^GENERIC_TIMEZONE=/d;/^TZ=/d' .env"
)
env_append = (
    "printf '"
    "\\nN8N_HOST=n8n.alveare-ai.com"
    "\\nWEBHOOK_URL=https://n8n.alveare-ai.com"
    "\\nN8N_EDITOR_BASE_URL=https://n8n.alveare-ai.com"
    "\\nN8N_PROTOCOL=https"
    "\\nN8N_PROXY_HOPS=1"
    "\\nGENERIC_TIMEZONE=Asia/Jerusalem"
    "\\nTZ=Asia/Jerusalem"
    "\\n' >> /docker/n8n/.env"
)
run(env_append)
run("echo '--- Updated .env ---' && cat /docker/n8n/.env")

# ── STEP 4: Update Caddy ─────────────────────────────────────
print("\n" + "="*50)
print(" STEP 4 - Update Caddy Config")
print("="*50)
run("find /docker -name 'Caddyfile' 2>/dev/null && cat $(find /docker -name 'Caddyfile' 2>/dev/null | head -1) 2>/dev/null || echo 'No Caddyfile'")
run(
    "CADF=$(find /docker -name 'Caddyfile' 2>/dev/null | head -1) ; "
    "if [ -n \"$CADF\" ]; then "
    "  cp \"$CADF\" \"${CADF}.backup\" ; "
    "  sed -i '1s|.*|n8n.alveare-ai.com {|' \"$CADF\" ; "
    "  echo 'Caddyfile updated:' ; cat \"$CADF\" ; "
    "else echo 'No Caddyfile found' ; fi"
)

# ── STEP 5: Restart n8n ──────────────────────────────────────
print("\n" + "="*50)
print(" STEP 5 - Restart n8n")
print("="*50)
run("cd /docker/n8n && docker compose pull", timeout=180)
run("cd /docker/n8n && docker compose down", timeout=60)
run("cd /docker/n8n && docker compose up -d", timeout=60)
print("Waiting 15s for containers to start...")
time.sleep(15)
run("cd /docker/n8n && docker compose ps")
run("cd /docker/n8n && docker compose logs n8n --tail=30")

# ── STEP 6: Health check ─────────────────────────────────────
print("\n" + "="*50)
print(" STEP 6 - Health Check")
print("="*50)
result = run("curl -sf http://localhost:5678/healthz ; echo ''")
if "status" in result or result.strip():
    print("n8n is UP!")
else:
    print("n8n may still be starting, check logs above.")

# ── Done ─────────────────────────────────────────────────────
print("\n" + "="*50)
print(" SETUP COMPLETE!")
print("="*50)
print(" n8n URL:     https://n8n.alveare-ai.com")
print(" Webhook:     https://n8n.alveare-ai.com/webhook/subscribe")
print(" Website:     https://alveare-ai.com")
print("\n Add DNS in hPanel:")
print("   A  @    -> 72.62.60.234")
print("   A  n8n  -> 72.62.60.234")
print("   A  www  -> 72.62.60.234")

client.close()
