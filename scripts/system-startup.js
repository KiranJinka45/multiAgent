"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// scripts/system-startup.ts
var import_child_process = require("child_process");
var import_net = __toESM(require("net"));
var import_fs = __toESM(require("fs"));
var import_path = __toESM(require("path"));
var import_os = __toESM(require("os"));
var import_dotenv = __toESM(require("dotenv"));
import_dotenv.default.config();
var envLocal = import_path.default.resolve(process.cwd(), ".env.local");
if (import_fs.default.existsSync(envLocal)) {
  import_dotenv.default.config({ path: envLocal, override: true });
}
var npmCmd = import_os.default.platform() === "win32" ? "npm.cmd" : "npm";
var DEFAULT_REDIS_URL = process.env.REDIS_URL || "redis://localhost:6379";
var REDIS_PORT = 6379;
async function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = import_net.default.createServer();
    server.once("error", (err) => {
      if (err.code === "EADDRINUSE") {
        resolve(true);
      } else {
        resolve(false);
      }
    });
    server.once("listening", () => {
      server.close();
      resolve(false);
    });
    server.listen(port);
  });
}
async function waitForSocketHealth(url, timeoutMs = 3e4) {
  console.log(`\u23F3 Waiting for Socket Server health at ${url}...`);
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const http = await import("http");
      const ok = await new Promise((resolve) => {
        const req = http.get(url, (res) => {
          resolve(res.statusCode === 200);
        });
        req.on("error", () => resolve(false));
        req.end();
      });
      if (ok) {
        console.log("\u2705 Socket Server is healthy!");
        return true;
      }
    } catch {
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 1e3));
  }
  console.warn("\n\u26A0\uFE0F Socket Server health check timed out. Proceeding anyway...");
  return false;
}
function checkDockerRunning() {
  return new Promise((resolve) => {
    (0, import_child_process.exec)("docker version --format '{{.Server.Version}}'", (error, stdout) => {
      if (error) {
        resolve({ ready: false, error: error.message });
      } else {
        resolve({ ready: true, version: stdout.trim() });
      }
    });
  });
}
function startRedis(isProduction) {
  console.log(`Starting Redis container or local service on port ${REDIS_PORT}...`);
  try {
    console.log("Attempting to start Redis via Docker Compose...");
    (0, import_child_process.execSync)("docker compose -f infra/docker-compose.yml up -d redis", { stdio: "pipe" });
    console.log("\u2705 Redis start command issued via Docker.");
  } catch (e) {
    const localRedisServer = import_path.default.join(process.cwd(), "Redis", "redis-server.exe");
    const localRedisConf = import_path.default.join(process.cwd(), "Redis", "redis.conf");
    if (import_fs.default.existsSync(localRedisServer)) {
      console.log("\u26A0\uFE0F Docker failed or unavailable. Attempting to start local Redis binary...");
      try {
        const redisProcess = (0, import_child_process.spawn)(localRedisServer, [localRedisConf], {
          cwd: import_path.default.dirname(localRedisServer),
          detached: true,
          stdio: "ignore"
        });
        redisProcess.unref();
        console.log("\u2705 Local Redis process spawned.");
      } catch (localErr) {
        const lErr = localErr;
        console.error("\u274C Failed to start local Redis:", lErr.message);
        if (isProduction) process.exit(1);
      }
    } else {
      if (isProduction) {
        console.error("\u274C Failed to start Redis in Production Mode:", e.message);
        process.exit(1);
      } else {
        console.warn("\u26A0\uFE0F  Redis could not be started.");
      }
    }
  }
}
function cleanNextCache() {
  console.log("\u{1F9F9} Cleaning Next.js cache (.next folder)...");
  const nextDir = import_path.default.join(process.cwd(), ".next");
  if (import_fs.default.existsSync(nextDir)) {
    try {
      if (process.platform === "win32") {
        (0, import_child_process.execSync)(`rmdir /s /q "${nextDir}"`, { stdio: "ignore" });
      } else {
        (0, import_child_process.execSync)(`rm -rf "${nextDir}"`, { stdio: "ignore" });
      }
      console.log("\u2705 Cache cleaned.");
    } catch {
      console.warn("\u26A0\uFE0F  Failed to clean .next folder (it might be in use). Skipping.");
    }
  } else {
    console.log("\u23ED\uFE0F No .next folder found. Skipping clean.");
  }
}
async function startup() {
  console.log("=== MultiAgent System Startup Validation ===");
  const buildMode = process.env.BUILD_MODE || "dev";
  const isProduction = buildMode === "production";
  if (!isProduction) {
    console.log("\u23ED\uFE0F Skipping Docker engine check (Dev Mode)");
  } else {
    console.log("\u23F3 Checking Docker engine availability...");
    let dockerInfo = { ready: false };
    for (let i = 0; i < 10; i++) {
      dockerInfo = await checkDockerRunning();
      if (dockerInfo.ready) break;
      if (i === 0) console.log("   Docker CLI or socket not responding yet. Retrying for up to 30s...");
      process.stdout.write(".");
      await new Promise((r) => setTimeout(r, 3e3));
    }
    if (!dockerInfo.ready) {
      console.error("\n\u274C Docker engine is not reachable.");
      console.error("   Diagnostics: " + (dockerInfo.error || "Unknown communication error"));
      process.exit(1);
    }
    console.log(`
\u2705 Docker engine is running (Version: ${dockerInfo.version}).`);
  }
  const redisPortInUse = await isPortInUse(REDIS_PORT);
  if (!redisPortInUse) {
    startRedis(isProduction);
  } else {
    console.log(`\u2705 Redis is serving on port ${REDIS_PORT}.`);
  }
  if (!isProduction) {
    cleanNextCache();
  }
  const activeProcesses = /* @__PURE__ */ new Set();
  const systemLog = import_fs.default.createWriteStream(import_path.default.join(process.cwd(), "system.log"), { flags: "a" });
  function startManagedProcess(name, command, args) {
    console.log(`\u{1F680} Starting ${name} in ${process.cwd()}...`);
    console.log(`   Command: ${command} ${args.join(" ")}`);
    const child = (0, import_child_process.spawn)(command, args, { shell: true });
    child.stdout.on("data", (data) => {
      const entry = `[${name}] ${data.toString().trim()}
`;
      systemLog.write(entry);
    });
    child.stderr.on("data", (data) => {
      const entry = `[${name} ERROR] ${data.toString().trim()}
`;
      systemLog.write(entry);
      console.error(entry.trim());
    });
    activeProcesses.add(child);
    child.on("exit", (code) => {
      activeProcesses.delete(child);
      if (!child.manualKill) {
        console.warn(`\u26A0\uFE0F  ${name} exited with code ${code}. Restarting in 5s...`);
        setTimeout(() => startManagedProcess(name, command, args), 5e3);
      }
    });
    return child;
  }
  console.log("\n=== Launching Application Stack ===");
  startManagedProcess("Socket Server (3011)", npmCmd, ["--prefix", "apps/api-gateway", "run", "start:socket"]);
  startManagedProcess("Watchdog", npmCmd, ["--prefix", "apps/api-gateway", "run", "start:watchdog"]);
  console.log("\u{1F525} Pre-warming Worker Pool...");
  const workerPoolSize = parseInt(process.env.WORKER_POOL_SIZE || "3");
  for (let i = 0; i < workerPoolSize; i++) {
    startManagedProcess(`Build Worker #${i + 1}`, npmCmd, ["--prefix", "apps/api-gateway", "run", "start:worker"]);
  }
  await waitForSocketHealth("http://localhost:3011/health");
  const webProcess = (0, import_child_process.spawn)(npmCmd, ["--prefix", "apps/frontend", "run", "dev"], { stdio: "inherit", shell: true });
  activeProcesses.add(webProcess);
  process.on("SIGINT", () => {
    console.log("\n\u{1F6D1} Stopping all services...");
    for (const child of activeProcesses) {
      child.manualKill = true;
      child.kill();
    }
    process.exit();
  });
  console.log(`
\u23F3 Waiting for Worker heartbeat (Redis ${REDIS_PORT})...`);
  const Redis = (await import("ioredis")).default;
  const redis = new Redis(DEFAULT_REDIS_URL);
  let workerHealthy = false;
  for (let i = 0; i < 15; i++) {
    try {
      const heartbeat = await redis.get("system:health:worker");
      if (heartbeat) {
        workerHealthy = true;
        break;
      }
    } catch {
    }
    process.stdout.write(".");
    await new Promise((r) => setTimeout(r, 1e3));
  }
  redis.quit();
  if (!workerHealthy) {
    console.warn("\n\u26A0\uFE0F  Worker heartbeat NOT detected. Pipeline may stay stuck.");
  } else {
    console.log("\n\u2705 Worker heartbeat detected!");
  }
  console.log("\n=== Final Health Check ===");
  try {
    (0, import_child_process.execSync)("node scripts/diagnostic.js", {
      stdio: "inherit",
      env: { ...process.env, REDIS_URL: DEFAULT_REDIS_URL }
    });
    console.log("\n\u{1F680} System is now fully operational.");
    console.log("\u{1F449} Press Ctrl+C to stop all services.");
  } catch {
    console.warn("\u26A0\uFE0F  Final diagnostic check failed.");
  }
}
startup().catch((err) => {
  console.error("FATAL: System startup failed.", err);
  process.exit(1);
});
//# sourceMappingURL=system-startup.js.map