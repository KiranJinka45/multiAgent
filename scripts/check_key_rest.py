import urllib.request
import json
import os

# Load key manually to avoid dotenv dependency issues if any
# (though dotenv seemed to work fine)
try:
    from dotenv import load_dotenv
    load_dotenv()
    api_key = os.getenv("GOOGLE_API_KEY")
except:
    # Fallback if dotenv not found
    with open(".env", "r") as f:
        for line in f:
            if line.startswith("GOOGLE_API_KEY="):
                api_key = line.strip().split("=", 1)[1]
                break

if not api_key:
    print("Error: Could not find GOOGLE_API_KEY")
    exit(1)

print(f"Checking key: {api_key[:5]}...{api_key[-5:]}")

url = f"https://generativelanguage.googleapis.com/v1beta/models?key={api_key}"

try:
    with urllib.request.urlopen(url) as response:
        data = json.loads(response.read().decode())
        print("✅ Success! API Key is valid.")
        print("Available Models:")
        if "models" in data:
            for m in data["models"]:
                print(f"- {m['name']}")
        else:
            print("No models found in response.")
            print(data)
except urllib.error.HTTPError as e:
    print(f"❌ HTTP Error {e.code}: {e.reason}")
    print(e.read().decode())
except Exception as e:
    print(f"❌ Error: {e}")
