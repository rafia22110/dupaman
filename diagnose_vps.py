import paramiko
import time
import socket

host = '72.62.60.234'
username = 'root'
password = '221069aa$rr'

def check_server():
    print(f"Checking connectivity to {host}...")
    
    # 1. Port 22 check
    sock = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
    sock.settimeout(5)
    result = sock.connect_ex((host, 22))
    if result == 0:
        print("Port 22 (SSH) is OPEN.")
    else:
        print("Port 22 (SSH) is CLOSED.")
        return

    # 2. SSH connection
    ssh = paramiko.SSHClient()
    ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
    
    try:
        print(f"Connecting to {host} via SSH...")
        ssh.connect(host, username=username, password=password, timeout=10)
        print("Connected successfully!")
        
        # Check running containers
        print("\n--- Running Docker Containers ---")
        stdin, stdout, stderr = ssh.exec_command("docker ps --format 'table {{.Names}}\t{{.Status}}\t{{.Ports}}'")
        print(stdout.read().decode())
        
        # Check n8n logs
        print("\n--- Last 10 n8n logs ---")
        stdin, stdout, stderr = ssh.exec_command("cd /docker/n8n && docker compose logs n8n --tail 10")
        print(stdout.read().decode())
        
        # Check Caddy logs (if exists)
        print("\n--- Last 10 caddy logs ---")
        stdin, stdout, stderr = ssh.exec_command("cd /docker/n8n && docker compose logs caddy --tail 10")
        print(stdout.read().decode())

        # Check website files in public_html
        # Note: public_html is usually in /home/<domain>/public_html or managed by the hosting panel.
        # Let's look for it.
        print("\n--- Website Files check ---")
        stdin, stdout, stderr = ssh.exec_command("find / -name public_html -type d 2>/dev/null | head -n 5")
        paths = stdout.read().decode().strip().split('\n')
        for path in paths:
            if path:
                print(f"\nContents of {path}:")
                stdin, stdout, stderr = ssh.exec_command(f"ls -lh {path}")
                print(stdout.read().decode())
        
        ssh.close()
    except Exception as e:
        print(f"Error during check: {e}")

if __name__ == "__main__":
    check_server()
