import net from "net";

const REQUIRED_PORTS = [
  { port: 3007, name: "Frontend" },
  { port: 4081, name: "Gateway" },
  { port: 4002, name: "Auth Service" },
  { port: 8082, name: "Worker Ops" },
  { port: 3002, name: "Core Socket" },
];

async function checkPort(port: number): Promise<boolean> {
  return new Promise((resolve) => {
    const server = net.createServer();
    server.once("error", () => resolve(false));
    server.once("listening", () => {
      server.close();
      resolve(true);
    });
    server.listen(port, "127.0.0.1");
  });
}

async function run() {
  console.log("🔍 Checking port availability...");
  const occupied: string[] = [];

  for (const { port, name } of REQUIRED_PORTS) {
    const isAvailable = await checkPort(port);
    if (!isAvailable) {
      occupied.push(`${name} (Port ${port})`);
    }
  }

  if (occupied.length > 0) {
    console.error("\n❌ Port Collision Detected! The following ports are already in use:");
    occupied.forEach(p => console.error(`  - ${p}`));
    console.error("\nPlease kill the processes holding these ports (e.g., using taskkill or fuser) before restarting.\n");
    process.exit(1);
  }

  console.log("✅ All required ports are available.\n");
}

run();
