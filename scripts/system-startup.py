import subprocess
import time
import os
import sys
import signal
import urllib.request
import socket

# Configuration
NODE_ENV = "production"
ROOT = os.getcwd()
SERVICES = [
    {
        "name": "Socket Server",
        "cwd": "apps/api-gateway",
        "cmd": ["npx", "tsx", "-r", "tsconfig-paths/register", "services/socket.ts"],
        "health": "http://127.0.0.1:3011/health"
    },
    {
        "name": "Frontend",
        "cwd": "apps/frontend",
        "cmd": ["npx", "tsx", "-r", "tsconfig-paths/register", "src/index.ts"],
        "health": "http://localhost:3004"
    }
]

processes = []

def cleanup(sig=None, frame=None):
    print("\n🛑 Shutting down MultiAgent...")
    for proc in processes:
        try:
            # On Windows, we need to be aggressive with taskkill /T /F
            subprocess.run(["taskkill", "/F", "/T", "/PID", str(proc.pid)], 
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        except:
            proc.kill()
    sys.exit(0)

signal.signal(signal.SIGINT, cleanup)

def is_port_open(port):
    with socket.socket(socket.AF_INET, socket.SOCK_STREAM) as s:
        return s.connect_ex(('127.0.0.1', port)) == 0

def kill_port(port):
    if os.name == 'nt':
        try:
            # Surgical port killing via PowerShell
            cmd = f"Get-NetTCPConnection -LocalPort {port} -ErrorAction SilentlyContinue | Select-Object -ExpandProperty OwningProcess | ForEach-Object {{ Stop-Process -Id $_ -Force -ErrorAction SilentlyContinue }}"
            subprocess.run(["powershell", "-Command", cmd], capture_output=True)
        except:
            pass

def wait_for_health(name, url, timeout=60):
    print(f"⏳ Waiting for {name} health: {url}")
    start = time.time()
    while time.time() - start < timeout:
        try:
            with urllib.request.urlopen(url, timeout=2) as response:
                if response.status == 200:
                    print(f"\n✅ {name} is healthy!")
                    return True
        except:
            pass
        sys.stdout.write('.')
        sys.stdout.flush()
        time.sleep(2)
    print(f"\n❌ {name} health check timed out")
    return False

def boot():
    print("\n=== 🔮 MultiAgent Python Bootstrapper ===\n")
    
    # 1. Clean ports
    kill_port(3011)
    kill_port(3004)
    
    # 2. Start Socket Server
    s = SERVICES[0]
    print(f"🚀 Starting {s['name']}...")
    env = os.environ.copy()
    env["NODE_ENV"] = NODE_ENV
    env["SERVICE_NAME"] = s["name"]
    
    # Force absolute npx for safety
    npx_bin = "npx.cmd" if os.name == 'nt' else 'npx'
    
    proc = subprocess.Popen(
        [npx_bin, "tsx", "-r", "tsconfig-paths/register", "services/socket.ts"], 
        cwd=os.path.join(ROOT, s["cwd"]),
        env=env,
        shell=True # Required for .cmd binaries and space handling on Windows
    )
    processes.append(proc)
    
    if not wait_for_health(s["name"], s["health"]):
        cleanup()
        
    # 3. Start Frontend
    f = SERVICES[1]
    print(f"🚀 Starting {f['name']}...")
    proc_f = subprocess.Popen(
        [npx_bin, "tsx", "-r", "tsconfig-paths/register", "src/index.ts"],
        cwd=os.path.join(ROOT, f["cwd"]),
        env=env,
        shell=True
    )
    processes.append(proc_f)
    
    print("\n🎉 SYSTEM FULLY OPERATIONAL\n")
    
    # Keep main alive
    try:
        while True:
            if proc.poll() is not None:
                print(f"❌ {s['name']} exited unexpectedly")
                cleanup()
            if proc_f.poll() is not None:
                print(f"❌ {f['name']} exited unexpectedly")
                cleanup()
            time.sleep(5)
    except KeyboardInterrupt:
        cleanup()

if __name__ == "__main__":
    boot()
