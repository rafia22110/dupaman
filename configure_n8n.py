import paramiko
import time

HOST = '72.62.60.234'
USER = 'root'
PASS = '221069aa$rr'

def run_commands():
    client = paramiko.SSHClient()
    client.set_missing_host_key_policy(paramiko.AutoAddPolicy())

    try:
        print(f'Attempting connection to {HOST}...')
        client.connect(HOST, username=USER, password=PASS, timeout=30)
        print('Connected successfully!')
        
        # Define setting changes
        # 1. Update .env
        env_cmd = (
            "cd /docker/n8n && "
            "sed -i '/^N8N_HOST=/d;/^WEBHOOK_URL=/d;/^N8N_EDITOR_BASE_URL=/d;/^N8N_PROTOCOL=/d;/^N8N_PROXY_HOPS=/d;/^GENERIC_TIMEZONE=/d;/^TZ=/d' .env && "
            "printf '\\nN8N_HOST=n8n.alveare-ai.com\\nWEBHOOK_URL=https://n8n.alveare-ai.com\\nN8N_EDITOR_BASE_URL=https://n8n.alveare-ai.com\\nN8N_PROTOCOL=https\\nN8N_PROXY_HOPS=1\\nGENERIC_TIMEZONE=Asia/Jerusalem\\nTZ=Asia/Jerusalem\\n' >> .env"
        )
        
        # 2. Update Caddyfile (if exists)
        caddy_cmd = (
            "CADF=$(find /docker /opt /root -name Caddyfile 2>/dev/null | head -1) && "
            "if [ -n \"$CADF\" ]; then sed -i \"1s|.*|n8n.alveare-ai.com {|\" \"$CADF\"; echo \"Updated $CADF\"; fi"
        )
        
        # 3. Restart Docker Compose
        restart_cmd = "cd /docker/n8n && docker compose pull && docker compose down && docker compose up -d"
        
        for cmd in [env_cmd, caddy_cmd, restart_cmd]:
            print(f'Running: {cmd}')
            stdin, stdout, stderr = client.exec_command(cmd)
            out = stdout.read().decode()
            err = stderr.read().decode()
            if out: print(f'STDOUT: {out}')
            if err: print(f'STDERR: {err}')
            
        print('All server commands executed.')
        client.close()
    except Exception as e:
        print(f'Error: {e}')

if __name__ == '__main__':
    run_commands()
