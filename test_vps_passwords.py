import paramiko

host = '72.62.60.234'
username = 'root'
passwords = ['221069aa$rr', 'r9T9JhjvJQYu#6x']

for pwd in passwords:
    try:
        print(f"Trying password: {pwd}")
        ssh = paramiko.SSHClient()
        ssh.set_missing_host_key_policy(paramiko.AutoAddPolicy())
        ssh.connect(host, username=username, password=pwd, timeout=10)
        print(f"SUCCESS with password: {pwd}")
        ssh.close()
        break
    except paramiko.AuthenticationException:
        print(f"FAILED with password: {pwd}")
    except Exception as e:
        print(f"ERROR: {e}")
