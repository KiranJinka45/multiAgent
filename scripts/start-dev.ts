import { spawn, ChildProcess } from "child_process";

const services = [
  { name: "Core API", filter: "@apps/core-api", script: "dev", delay: 0 },
  { name: "Auth Service", filter: "@apps/auth-service", script: "dev", delay: 10000 },
  { name: "Worker", filter: "@apps/worker", script: "dev", delay: 20000 },
  { name: "Gateway", filter: "@apps/gateway", script: "dev", delay: 30000 },
  { name: "Frontend", filter: "frontend", script: "start", delay: 45000 },
];

const children: ChildProcess[] = [];

function startService(service: typeof services[0]) {
  setTimeout(() => {
    console.log(`\n[BOOT] Starting ${service.name}...`);
    const child = spawn("pnpm", ["--filter", service.filter, "run", service.script], {
      shell: true,
      stdio: ["ignore", "pipe", "pipe"],
      env: { ...process.env },
    });

    children.push(child);

    child.stdout?.on("data", (data: Buffer) => {
      process.stdout.write(data);
    });

    child.stderr?.on("data", (data: Buffer) => {
      process.stderr.write(data);
    });

    child.on("error", (err) => {
      console.error(`❌ Failed to start ${service.name}:`, err);
    });

    child.on("exit", (code) => {
      if (code !== null && code !== 0) {
        console.error(`⚠️ ${service.name} exited with code ${code}`);
      }
    });
  }, service.delay);
}

console.log("🚀 Orchestrating Deterministic Startup Sequence...");
services.forEach(startService);

// Cleanup handler
process.on("SIGINT", () => {
  console.log("\n🛑 Shutting down all services...");
  children.forEach(c => c.kill());
  process.exit(0);
});

// Run health check after the last service has had time to warm up
const totalWait = 65000;
setTimeout(() => {
  console.log("\n🧪 Initiating Health Verification Phase...");
  const hc = spawn("pnpm", ["exec", "tsx", "scripts/health-check.ts"], {
    shell: true,
    stdio: ["ignore", "pipe", "pipe"],
    env: { ...process.env },
  });
  hc.stdout?.on("data", (data: Buffer) => process.stdout.write(data));
  hc.stderr?.on("data", (data: Buffer) => process.stderr.write(data));
}, totalWait);
