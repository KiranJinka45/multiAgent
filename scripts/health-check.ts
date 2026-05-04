import axios from "axios";

const ENDPOINTS = [
  { name: "Auth Service", url: "http://127.0.0.1:4005/health" },
  { name: "Core API", url: "http://127.0.0.1:3010/health" },
  { name: "Gateway", url: "http://127.0.0.1:3500/health" },
  { name: "Worker Ops", url: "http://127.0.0.1:8082/health" },
];

async function poll(name: string, url: string, retries = 60): Promise<boolean> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await axios.get(url, { timeout: 2000 });
      if (res.status === 200) {
        console.log(`  [+] ${name} is UP`);
        return true;
      }
    } catch (e) {
      // Silent retry
    }
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  console.error(`  [-] ${name} failed to stabilize after ${retries} retries.`);
  return false;
}

async function run() {
  console.log("\n📡 Waiting for System Stabilization (Mesh Handshake)...");
  
  const results = await Promise.all(
    ENDPOINTS.map(ep => poll(ep.name, ep.url))
  );

  if (results.every(r => r === true)) {
    console.log("\n✅ ALL SERVICES OPERATIONAL.");
    console.log("👉 Access Dashboard: http://127.0.0.1:3007\n");
  } else {
    console.error("\n❌ SYSTEM HEALTH CHECK FAILED. Some services did not start correctly.\n");
    process.exit(1);
  }
}

run();
