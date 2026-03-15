import requests
import json

API_TOKEN = "1nkWtYvFxR8p6Kha8T2jy0FFeGS72l80hodcWbZv8dd2c1f2"
BASE_URL = "https://api.hostinger.com/v1"

headers = {
    "Authorization": f"Bearer {API_TOKEN}",
    "Accept": "application/json",
    "Content-Type": "application/json",
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
}

def test_api():
    print("Testing Hostinger API access...")
    
    # 1. Get Domains
    print("\n--- Domains ---")
    response = requests.get(f"{BASE_URL}/domains", headers=headers)
    if response.status_code == 200:
        domains = response.json().get('data', [])
        print(json.dumps(domains, indent=2))
        for d in domains:
            if d.get('domain') == 'alveare-ai.com':
                print(f"MATCH FOUND: {d.get('domain')} (ID: {d.get('id')})")
    else:
        print(f"Error getting domains: {response.status_code} - {response.text}")

    # 2. Get VPS
    print("\n--- VPS Instances ---")
    response = requests.get(f"{BASE_URL}/vps", headers=headers)
    if response.status_code == 200:
        vps_list = response.json().get('data', [])
        print(json.dumps(vps_list, indent=2))
    else:
        print(f"Error getting VPS: {response.status_code} - {response.text}")

if __name__ == "__main__":
    test_api()
