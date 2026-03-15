import paramiko
import time

# Defining the server details
host = '72.62.60.234'
username = 'root'
password = '221069aa$rr'

def setup_server():
    try:
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        
        print(f"Connecting to {host}...")
        ssh.connect(host, username=username, password=password, timeout=10)
        print("Connected successfully!")
        
        # 1. Update .env
        print("Updating .env...")
        cmd_env = (
            "cd /docker/n8n && "
            "sed -i '/^N8N_HOST=/d;/^WEBHOOK_URL=/d;/^N8N_EDITOR_BASE_URL=/d;/^N8N_PROTOCOL=/d;/^N8N_PROXY_HOPS=/d;/^GENERIC_TIMEZONE=/d;/^TZ=/d' .env && "
            "printf '\\nN8N_HOST=n8n.alveare-ai.com\\nWEBHOOK_URL=https://n8n.alveare-ai.com\\nN8N_EDITOR_BASE_URL=https://n8n.alveare-ai.com\\nN8N_PROTOCOL=https\\nN8N_PROXY_HOPS=1\\nGENERIC_TIMEZONE=Asia/Jerusalem\\nTZ=Asia/Jerusalem\\n' >> .env"
        )
        stdin, stdout, stderr = ssh.exec_command(cmd_env)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        # 2. Update Caddyfile
        print("Updating Caddyfile...")
        cmd_caddy = (
            "CADF=$(find /docker /opt /root -name Caddyfile 2>/dev/null | head -1) && "
            "if [ -n \"$CADF\" ]; then sed -i \"1s|.*|n8n.alveare-ai.com {|\" \"$CADF\"; echo \"Updated $CADF\"; fi"
        )
        stdin, stdout, stderr = ssh.exec_command(cmd_caddy)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        # 3. Docker Compose restart
        print("Restarting Docker Compose...")
        cmd_docker = "cd /docker/n8n && docker compose pull && docker compose down && docker compose up -d"
        stdin, stdout, stderr = ssh.exec_command(cmd_docker)
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        # 4. Final check
        print("Verifying...")
        stdin, stdout, stderr = ssh.exec_command("docker ps && curl -sf http://localhost:5678/healthz && echo 'n8n is UP!'")
        print(stdout.read().decode())
        print(stderr.read().decode())
        
        ssh.close()
        print("Server setup complete.")
        
    except Exception as e:
        print(f"Error during setup: {e}")

if __name__ == "__main__":
    setup_server()
