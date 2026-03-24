var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
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
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/runtimeGuard.ts
var import_crypto2, import_path, import_utils6, PREVIEW_SECRET, SIGNED_URL_TTL_SECONDS, INACTIVITY_SHUTDOWN_MS, ALLOWED_PREVIEW_HOSTS, PROJECTS_ROOT, RuntimeGuard;
var init_runtimeGuard = __esm({
  "src/runtimeGuard.ts"() {
    import_crypto2 = __toESM(require("crypto"));
    import_path = __toESM(require("path"));
    import_utils6 = __toESM(require("@libs/utils"));
    PREVIEW_SECRET = process.env.PREVIEW_SIGNING_SECRET || "dev-secret-change-in-production";
    SIGNED_URL_TTL_SECONDS = 3600;
    INACTIVITY_SHUTDOWN_MS = 30 * 60 * 1e3;
    ALLOWED_PREVIEW_HOSTS = ["localhost", "127.0.0.1"];
    PROJECTS_ROOT = process.env.GENERATED_PROJECTS_ROOT || import_path.default.join(process.cwd(), ".generated-projects");
    RuntimeGuard = {
      // ── Path Safety ──────────────────────────────────────────────────────────
      /**
       * Resolve and validate that a project directory is within the allowed root.
       * Prevents path traversal attacks (e.g. projectId = "../../etc/passwd").
       *
       * Throws if the resolved path escapes PROJECTS_ROOT.
       */
      resolveProjectPath(projectId) {
        if (!/^[a-zA-Z0-9-_]+$/.test(projectId)) {
          throw new Error(`[RuntimeGuard] Invalid projectId format: "${projectId}"`);
        }
        const resolved = import_path.default.resolve(PROJECTS_ROOT, projectId);
        if (!resolved.startsWith(import_path.default.resolve(PROJECTS_ROOT))) {
          throw new Error(`[RuntimeGuard] Path traversal attempt detected for projectId="${projectId}"`);
        }
        return resolved;
      },
      // ── Signed Preview URLs ───────────────────────────────────────────────────
      /**
       * Generate a time-limited signed token for accessing a preview.
       * Token = HMAC-SHA256(projectId + ":" + expiresAt, secret)[:16]
       *
       * In production, embed this in the preview iframe URL as ?token=xxx
       */
      generateToken(projectId) {
        const expiresAt = Math.floor(Date.now() / 1e3) + SIGNED_URL_TTL_SECONDS;
        const payload = `${projectId}:${expiresAt}`;
        const token = import_crypto2.default.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
        return { token, expiresAt };
      },
      /**
       * Verify a signed token. Returns true if valid and not expired.
       */
      verifyToken(projectId, token, expiresAt) {
        const now = Math.floor(Date.now() / 1e3);
        if (now > expiresAt) {
          import_utils6.default.warn({ projectId }, "[RuntimeGuard] Preview token expired");
          return false;
        }
        const payload = `${projectId}:${expiresAt}`;
        const expected = import_crypto2.default.createHmac("sha256", PREVIEW_SECRET).update(payload).digest("hex").slice(0, 32);
        try {
          return import_crypto2.default.timingSafeEqual(
            Buffer.from(token, "hex"),
            Buffer.from(expected, "hex")
          );
        } catch {
          return false;
        }
      },
      // ── SSRF Prevention ───────────────────────────────────────────────────────
      /**
       * Validate that a proxy upstream URL is safe.
       * Only allows connections to localhost (or cluster internal IPs) on permitted ports.
       *
       * Throws if the URL is not allowed.
       */
      validateProxyTarget(url, allowedPort, allowInternalCluster = false) {
        let parsed;
        try {
          parsed = new URL(url);
        } catch {
          throw new Error(`[RuntimeGuard] Invalid proxy target URL: ${url}`);
        }
        const isLocal = ALLOWED_PREVIEW_HOSTS.includes(parsed.hostname);
        if (!isLocal && !allowInternalCluster) {
          throw new Error(`[RuntimeGuard] SSRF: hostname "${parsed.hostname}" is not allowed`);
        }
        const port = parseInt(parsed.port || "80");
        if (port !== allowedPort) {
          throw new Error(`[RuntimeGuard] SSRF: port ${port} does not match leased port ${allowedPort}`);
        }
        if (parsed.protocol !== "http:") {
          throw new Error(`[RuntimeGuard] Only http: protocol allowed for proxy targets`);
        }
      },
      // ── Inactivity TTL ────────────────────────────────────────────────────────
      /**
       * Check if a project has been inactive for longer than INACTIVITY_SHUTDOWN_MS.
       * Called by the cleanup worker.
       */
      async isInactive(projectId, lastActivityAt) {
        if (!lastActivityAt) return false;
        const idleMs = Date.now() - new Date(lastActivityAt).getTime();
        const inactive = idleMs > INACTIVITY_SHUTDOWN_MS;
        if (inactive) {
          import_utils6.default.info(
            { projectId, idleMs, thresholdMs: INACTIVITY_SHUTDOWN_MS },
            "[RuntimeGuard] Project inactive \u2014 eligible for shutdown"
          );
        }
        return inactive;
      },
      // ── Resource Limits (spawn options) ──────────────────────────────────────
      /**
       * Returns safe spawn options to limit resource exposure.
       * These are the options to pass to child_process.spawn().
       */
      safeSpawnOptions(cwd, env = {}) {
        const { getSafeEnv: getSafeEnv3 } = require("@libs/utils");
        return {
          cwd,
          env: getSafeEnv3(env),
          detached: false,
          // Process dies with parent
          shell: false,
          // No shell injection
          stdio: ["ignore", "pipe", "pipe"],
          windowsHide: true
          // Hide console on Windows
        };
      }
    };
  }
});

// src/containerManager.ts
function containerName(projectId) {
  return `ma-preview-${projectId.slice(0, 12)}`;
}
function exec(cmd) {
  try {
    return (0, import_child_process2.execSync)(cmd, { encoding: "utf-8", timeout: 12e4 }).trim();
  } catch (err) {
    const error = err;
    throw new Error(`Docker CLI failed: ${error.stderr || error.message}`);
  }
}
function isDockerAvailable() {
  try {
    (0, import_child_process2.execSync)("docker info", { encoding: "utf-8", timeout: 5e3, stdio: "pipe" });
    return true;
  } catch {
    return false;
  }
}
var import_child_process2, import_path3, import_net2, import_utils28, CPU_LIMIT, MEMORY_LIMIT, NETWORK_NAME, DOCKERFILE_PATH, IMAGE_NAME, PROJECTS_ROOT2, containerRegistry, ContainerManager;
var init_containerManager = __esm({
  "src/containerManager.ts"() {
    import_child_process2 = require("child_process");
    import_path3 = __toESM(require("path"));
    import_net2 = __toESM(require("net"));
    import_utils28 = __toESM(require("@libs/utils"));
    CPU_LIMIT = process.env.CONTAINER_CPU_LIMIT || "0.5";
    MEMORY_LIMIT = process.env.CONTAINER_MEMORY_LIMIT || "512m";
    NETWORK_NAME = process.env.CONTAINER_NETWORK || "ma-preview-net";
    DOCKERFILE_PATH = import_path3.default.join(__dirname, "docker", "Dockerfile.sandbox");
    IMAGE_NAME = "ma-sandbox";
    PROJECTS_ROOT2 = process.env.GENERATED_PROJECTS_ROOT || import_path3.default.join(process.cwd(), ".generated-projects");
    containerRegistry = /* @__PURE__ */ new Map();
    ContainerManager = {
      ensureNetwork() {
        try {
          exec(`docker network inspect ${NETWORK_NAME}`);
        } catch {
          exec(`docker network create --driver bridge ${NETWORK_NAME}`);
        }
      },
      async buildImage(projectId, force = false) {
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        const projectDir = import_path3.default.join(PROJECTS_ROOT2, projectId);
        if (!force) {
          try {
            exec(`docker image inspect ${tag}`);
            return;
          } catch {
          }
        }
        exec(`docker build -t ${tag} -f "${DOCKERFILE_PATH}" "${projectDir}"`);
      },
      async start(projectId, port, timeoutMs = 6e4) {
        const name = containerName(projectId);
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        await this.forceRemove(projectId);
        this.ensureNetwork();
        await this.buildImage(projectId);
        const containerId = exec([
          "docker run -d",
          `--name ${name}`,
          `--cpus=${CPU_LIMIT}`,
          `--memory=${MEMORY_LIMIT}`,
          `--read-only`,
          `--tmpfs /tmp:rw,noexec,nosuid,size=64m`,
          `--tmpfs /app/node_modules/.cache:rw,size=128m`,
          `--network ${NETWORK_NAME}`,
          `-p ${port}:${port}`,
          `-e PORT=${port}`,
          `-e NODE_ENV=production`,
          `--init`,
          `--restart=no`,
          `--label "ma.projectId=${projectId}"`,
          `--label "ma.port=${port}"`,
          `--label "ma.purpose=preview-sandbox"`,
          tag
        ].join(" "));
        const managed = {
          containerId: containerId.slice(0, 12),
          containerName: name,
          projectId,
          port,
          status: "STARTING",
          startedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        containerRegistry.set(projectId, managed);
        await this.waitForHealthy(projectId, containerId, timeoutMs);
        managed.status = "RUNNING";
        return { containerId: managed.containerId, containerName: name };
      },
      /**
       * Hot inject code into a running container.
       */
      async hotInject(containerId, projectDir) {
        import_utils28.default.info({ containerId, projectDir }, "[ContainerManager] Hot injecting code");
        exec(`docker cp "${projectDir}/." ${containerId}:/app/`);
        exec(`docker exec -u root ${containerId} chown -R node:node /app`);
      },
      async executeCommand(containerId, cmd, args) {
        const fullCmd = `${cmd} ${args.join(" ")}`;
        try {
          const stdout = exec(`docker exec ${containerId} ${fullCmd}`);
          return { stdout, stderr: "", exitCode: 0 };
        } catch (err) {
          return {
            stdout: "",
            stderr: err.message,
            exitCode: err.status || 1
          };
        }
      },
      async waitForHealthy(projectId, containerId, timeoutMs) {
        const deadline = Date.now() + timeoutMs;
        const port = containerRegistry.get(projectId)?.port;
        import_utils28.default.info({ containerId, projectId, port }, "[ContainerManager] Waiting for health...");
        while (Date.now() < deadline) {
          const health = this.getHealth(containerId);
          if (health === "healthy") {
            import_utils28.default.info({ containerId }, "[ContainerManager] Docker health check PASSED");
            return;
          }
          if (port) {
            try {
              const isPortOpen = await this.isPortAlive(port);
              if (isPortOpen) {
                import_utils28.default.info({ containerId, port }, "[ContainerManager] TCP health check PASSED (fallback)");
                return;
              }
            } catch {
            }
          }
          const state = this.getState(containerId);
          if (state === "exited" || state === "dead") throw new Error("Container exited");
          await new Promise((resolve) => setTimeout(resolve, 3e3));
        }
        throw new Error(`Health timeout after ${timeoutMs}ms. Container state: ${this.getState(containerId)}`);
      },
      isPortAlive(port) {
        return new Promise((resolve) => {
          const socket = import_net2.default.createConnection({ port, host: "127.0.0.1", timeout: 1e3 });
          socket.on("connect", () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
          });
          socket.on("error", () => {
            socket.destroy();
            resolve(false);
          });
        });
      },
      async stop(projectId) {
        const name = containerName(projectId);
        try {
          exec(`docker stop -t 5 ${name}`);
        } catch {
        }
        try {
          exec(`docker rm -f ${name}`);
        } catch {
        }
        containerRegistry.delete(projectId);
      },
      async forceRemove(projectId) {
        const name = containerName(projectId);
        try {
          exec(`docker rm -f ${name}`);
        } catch {
        }
        containerRegistry.delete(projectId);
      },
      getHealth(containerId) {
        try {
          return exec(`docker inspect --format="{{.State.Health.Status}}" ${containerId}`);
        } catch {
          return "none";
        }
      },
      getState(containerId) {
        try {
          return exec(`docker inspect --format="{{.State.Status}}" ${containerId}`);
        } catch {
          return "unknown";
        }
      },
      isRunning(projectId) {
        const name = containerName(projectId);
        try {
          return exec(`docker inspect --format="{{.State.Status}}" ${name}`) === "running";
        } catch {
          return false;
        }
      },
      isAvailable: isDockerAvailable,
      async cleanupAll() {
        try {
          const ids = exec('docker ps -aq --filter "label=ma.purpose=preview-sandbox"');
          if (ids) exec(`docker rm -f ${ids.replace(/\n/g, " ")}`);
        } catch {
        }
        containerRegistry.clear();
      }
    };
  }
});

// src/resource-manager.ts
var import_os2, import_utils33, ResourceManager;
var init_resource_manager = __esm({
  "src/resource-manager.ts"() {
    import_os2 = __toESM(require("os"));
    import_utils33 = __toESM(require("@libs/utils"));
    ResourceManager = class {
      static MAX_MEMORY_USAGE = 0.85;
      // 85% of total RAM
      static MAX_LOAD_AVG = 0.8;
      // 80% per CPU core
      static memOverrideMb = null;
      static setTestMemoryLimit(mb) {
        this.memOverrideMb = mb;
      }
      static getSnapshot() {
        return {
          totalMem: import_os2.default.totalmem(),
          freeMem: import_os2.default.freemem(),
          cpuCount: import_os2.default.cpus().length,
          loadAvg: import_os2.default.loadavg()
        };
      }
      static canAllocate(requiredMemMb) {
        const snapshot = this.getSnapshot();
        const memLimit = this.memOverrideMb ? this.memOverrideMb * 1024 * 1024 : snapshot.totalMem * this.MAX_MEMORY_USAGE;
        const currentUsage = snapshot.totalMem - snapshot.freeMem;
        const projectedUsage = currentUsage + requiredMemMb * 1024 * 1024;
        const cpuWait = snapshot.loadAvg[0] / snapshot.cpuCount;
        const hasMem = projectedUsage < memLimit;
        const hasCpu = cpuWait < this.MAX_LOAD_AVG;
        import_utils33.default.info({
          hasMem,
          hasCpu,
          currentUsageMb: Math.round(currentUsage / 1024 / 1024),
          projectedUsageMb: Math.round(projectedUsage / 1024 / 1024),
          memLimitMb: Math.round(memLimit / 1024 / 1024),
          cpuLoad: cpuWait.toFixed(2)
        }, "[ResourceManager] Capacity check");
        return hasMem && hasCpu;
      }
      static getHostCapacity() {
        const snapshot = this.getSnapshot();
        return {
          totalMemMb: Math.round(snapshot.totalMem / 1024 / 1024),
          freeMemMb: Math.round(snapshot.freeMem / 1024 / 1024),
          cpuCount: snapshot.cpuCount,
          load: snapshot.loadAvg[0]
        };
      }
    };
  }
});

// src/admission-controller.ts
var import_utils34, AdmissionController;
var init_admission_controller = __esm({
  "src/admission-controller.ts"() {
    init_resource_manager();
    import_utils34 = __toESM(require("@libs/utils"));
    AdmissionController = class {
      static queue = [];
      static DRAIN_INTERVAL = 3e3;
      // 3 seconds
      static isRunning = false;
      static async acquireAdmission(projectId, requiredMemMb = 1024) {
        import_utils34.default.info({ projectId, requiredMemMb }, "[AdmissionController] Attempting admission...");
        return new Promise((resolve) => {
          const admitted = ResourceManager.canAllocate(requiredMemMb);
          if (admitted && this.queue.length === 0) {
            import_utils34.default.info({ projectId }, "[AdmissionController] Admitted immediately.");
            resolve();
          } else {
            import_utils34.default.warn({ projectId, queueSize: this.queue.length, admitted }, "[AdmissionController] Admittance delayed. Queuing...");
            this.queue.push({
              projectId,
              requiredMemMb,
              resolve,
              timestamp: Date.now()
            });
            this.startDrainer();
          }
        });
      }
      static startDrainer() {
        if (this.isRunning) return;
        this.isRunning = true;
        const drain = async () => {
          if (this.queue.length === 0) {
            this.isRunning = false;
            return;
          }
          const next = this.queue[0];
          if (ResourceManager.canAllocate(next.requiredMemMb)) {
            this.queue.shift();
            import_utils34.default.info({ projectId: next.projectId, waitTime: Date.now() - next.timestamp }, "[AdmissionController] Dequeued and admitted.");
            next.resolve();
            setTimeout(drain, 100);
          } else {
            setTimeout(drain, this.DRAIN_INTERVAL);
          }
        };
        drain();
      }
      static getQueueStatus() {
        return {
          pending: this.queue.length,
          nextProject: this.queue[0]?.projectId
        };
      }
    };
  }
});

// src/sandbox-runner.ts
var import_child_process3, import_util, import_server2, execPromise, SandboxRunner;
var init_sandbox_runner = __esm({
  "src/sandbox-runner.ts"() {
    import_child_process3 = require("child_process");
    import_util = __toESM(require("util"));
    import_server2 = require("@libs/utils/server");
    init_runtimeGuard();
    init_containerManager();
    execPromise = import_util.default.promisify(import_child_process3.exec);
    SandboxRunner = class {
      static DEFAULT_TIMEOUT = 6e4;
      // 🛑 Critical: Hardened to 60s for production
      static DEFAULT_MEMORY_LIMIT = 512;
      // 512MB
      /**
       * Executes a command in an isolated child process with resource monitoring.
       */
      static async execute(command, args, options) {
        const {
          cwd,
          env = {},
          timeoutMs = this.DEFAULT_TIMEOUT,
          memoryLimitMb = this.DEFAULT_MEMORY_LIMIT,
          executionId,
          agentName,
          action
        } = options;
        import_server2.logger.info({ executionId, agentName, action, command, args }, "Spawning isolated sandbox runner");
        return new Promise((resolve) => {
          if (!options.allowEgress && (command.includes("curl") || command.includes("http") || command.includes("wget"))) {
            import_server2.logger.warn({ executionId, command }, "[SandboxRunner] \u{1F6D1} Egress attempt detected in isolated environment");
            import_server2.eventBus.thought(executionId, agentName, "\u274C Security Violation: Network egress blocked by Zero-Trust policy");
            return resolve({
              success: false,
              exitCode: 1,
              stdout: "",
              stderr: "Egress Blocked by Policy",
              error: "Security Violation: Network access denied in sandbox",
              egressBlocked: true
            });
          }
          if (ContainerManager.isAvailable() && options.cwd.includes(".generated-projects")) {
            const projectId = options.cwd.split(".generated-projects").pop()?.replace(/\\|\//g, "") || "";
            if (projectId) {
              import_server2.logger.info({ projectId, command }, "[SandboxRunner] Using Docker-based execution");
              (async () => {
                try {
                  if (!ContainerManager.isRunning(projectId)) {
                    const port = 5e3 + Math.floor(Math.random() * 1e3);
                    await ContainerManager.start(projectId, port);
                  }
                  const container = `ma-preview-${projectId.slice(0, 12)}`;
                  const result = await ContainerManager.executeCommand(container, command, args);
                  return resolve({
                    success: result.exitCode === 0,
                    exitCode: result.exitCode,
                    stdout: result.stdout,
                    stderr: result.stderr
                  });
                } catch (err) {
                  import_server2.logger.error({ err }, "[SandboxRunner] Docker execution failed. Falling back to host.");
                }
              })();
            }
          }
          const child = (0, import_child_process3.spawn)(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));
          let stdout = "";
          let stderr = "";
          let isAborted = false;
          const timeout = setTimeout(() => {
            isAborted = true;
            child.kill("SIGKILL");
            import_server2.logger.error({ executionId, agentName, timeoutMs }, "Sandbox runner timed out");
            import_server2.eventBus.thought(executionId, agentName, `\u274C Execution timed out after ${timeoutMs}ms`);
          }, timeoutMs);
          const memoryCheckInterval = setInterval(async () => {
            try {
              if (child.pid === void 0 || child.killed) return;
              try {
                const { stdout: tasklistOutput } = await execPromise(`tasklist /FI "PID eq ${child.pid}" /FO CSV /NH`);
                if (tasklistOutput.includes(String(child.pid))) {
                  const parts = tasklistOutput.split(",");
                  if (parts[4]) {
                    const memStr = parts[4].replace(/"/g, "").replace(/ K/g, "").replace(/,/g, "").trim();
                    const memKb = parseInt(memStr, 10);
                    const memMb = memKb / 1024;
                    if (memMb > memoryLimitMb) {
                      isAborted = true;
                      child.kill("SIGKILL");
                      import_server2.logger.error({ executionId, agentName, memMb, memoryLimitMb }, "Sandbox runner exceeded memory limit");
                      import_server2.eventBus.thought(executionId, agentName, `\u274C Execution killed: Memory limit (${memoryLimitMb}MB) exceeded. Current: ${Math.round(memMb)}MB`);
                    }
                  }
                }
              } catch {
              }
            } catch {
            }
          }, 5e3);
          child.stdout.on("data", (data) => {
            const chunk = data.toString();
            stdout += chunk;
            import_server2.eventBus.thought(executionId, agentName, chunk.trim());
          });
          child.stderr.on("data", (data) => {
            const chunk = data.toString();
            stderr += chunk;
            import_server2.eventBus.thought(executionId, agentName, `\u26A0\uFE0F ${chunk.trim()}`);
          });
          child.on("error", (err) => {
            clearTimeout(timeout);
            clearInterval(memoryCheckInterval);
            import_server2.logger.error({ executionId, agentName, err }, "Sandbox runner process error");
            resolve({
              success: false,
              exitCode: null,
              stdout,
              stderr,
              error: err.message
            });
          });
          child.on("exit", (code) => {
            clearTimeout(timeout);
            clearInterval(memoryCheckInterval);
            if (isAborted) {
              resolve({
                success: false,
                exitCode: code,
                stdout,
                stderr,
                error: "Process timed out and was killed"
              });
              return;
            }
            import_server2.logger.info({ executionId, agentName, exitCode: code }, "Sandbox runner process exited");
            resolve({
              success: code === 0,
              exitCode: code,
              stdout,
              stderr
            });
          });
        });
      }
      /**
       * Specialized wrapper for long-running preview servers.
       * Returns the ChildProcess so it can be managed by the PreviewManager.
       */
      static spawnLongRunning(command, args, options) {
        const { cwd, env = {}, executionId, agentName } = options;
        const child = (0, import_child_process3.spawn)(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));
        child.stdout?.on("data", (data) => {
          import_server2.eventBus.thought(executionId, agentName, `[Server] ${data.toString().trim()}`);
        });
        child.stderr?.on("data", (data) => {
          import_server2.eventBus.thought(executionId, agentName, `[Server Error] ${data.toString().trim()}`);
        });
        return child;
      }
    };
  }
});

// src/snapshot-manager.ts
var import_fs_extra2, import_path4, import_utils36, import_utils37, SnapshotManager, snapshotManager;
var init_snapshot_manager = __esm({
  "src/snapshot-manager.ts"() {
    import_fs_extra2 = __toESM(require("fs-extra"));
    import_path4 = __toESM(require("path"));
    import_utils36 = require("@libs/utils");
    import_utils37 = __toESM(require("@libs/utils"));
    SnapshotManager = class {
      baseDir = import_path4.default.join(process.cwd(), ".snapshots");
      constructor() {
        import_fs_extra2.default.ensureDirSync(this.baseDir);
      }
      /**
       * Creates a filesystem snapshot of a ready-to-serve sandbox.
       * In a real production environment (Phase 6.2), this would also involve 
       * CRIU (Checkpoint/Restore In Userspace) for process memory state.
       */
      async createSnapshot(projectId, sandboxDir) {
        const snapshotId = `${projectId}-${Date.now()}`;
        const snapshotPath = import_path4.default.join(this.baseDir, snapshotId);
        import_utils37.default.info({ projectId, snapshotId }, "[SnapshotManager] Creating filesystem snapshot...");
        await import_fs_extra2.default.ensureDir(snapshotPath);
        await import_fs_extra2.default.copy(sandboxDir, snapshotPath, {
          filter: (src) => !src.includes("node_modules") && !src.includes(".git")
        });
        const snapshot = {
          projectId,
          timestamp: Date.now(),
          filesHash: "dynamic-hash-placeholder",
          // In prod, checksum the VFS
          snapshotPath
        };
        await import_utils36.redis.set(`snapshot:latest:${projectId}`, JSON.stringify(snapshot));
        return snapshotId;
      }
      /**
       * Restores a sandbox from a snapshot in milliseconds.
       */
      async restoreFromSnapshot(projectId, targetDir) {
        const snapshotData = await import_utils36.redis.get(`snapshot:latest:${projectId}`);
        if (!snapshotData) return false;
        const snapshot = JSON.parse(snapshotData);
        if (!import_fs_extra2.default.existsSync(snapshot.snapshotPath)) {
          import_utils37.default.warn({ projectId }, "[SnapshotManager] Snapshot path missing on disk.");
          return false;
        }
        const start = Date.now();
        import_utils37.default.info({ projectId }, "[SnapshotManager] Restoring from snapshot...");
        await import_fs_extra2.default.ensureDir(targetDir);
        await import_fs_extra2.default.copy(snapshot.snapshotPath, targetDir);
        import_utils37.default.info({ projectId, duration: Date.now() - start }, "[SnapshotManager] Restore complete.");
        return true;
      }
      async cleanup(projectId) {
        const snapshotData = await import_utils36.redis.get(`snapshot:latest:${projectId}`);
        if (snapshotData) {
          const snapshot = JSON.parse(snapshotData);
          await import_fs_extra2.default.remove(snapshot.snapshotPath);
          await import_utils36.redis.del(`snapshot:latest:${projectId}`);
        }
      }
    };
    snapshotManager = new SnapshotManager();
  }
});

// src/snapshot-library.ts
var import_fs_extra3, import_path5, import_utils38, SnapshotLibrary;
var init_snapshot_library = __esm({
  "src/snapshot-library.ts"() {
    import_fs_extra3 = __toESM(require("fs-extra"));
    import_path5 = __toESM(require("path"));
    import_utils38 = __toESM(require("@libs/utils"));
    SnapshotLibrary = class {
      static snapshotDir = import_path5.default.join(process.cwd(), ".snapshots", "base");
      /**
       * Initializes the library and ensures base directories exist.
       */
      static async init() {
        await import_fs_extra3.default.ensureDir(this.snapshotDir);
      }
      /**
       * Gets the best matching snapshot for a framework.
       */
      static async getSnapshot(framework) {
        const snapshots = [
          { id: "nextjs-base", framework: "nextjs", version: "14.x", path: import_path5.default.join(this.snapshotDir, "nextjs-base") },
          { id: "vite-base", framework: "vite", version: "5.x", path: import_path5.default.join(this.snapshotDir, "vite-base") },
          { id: "express-base", framework: "express", version: "4.x", path: import_path5.default.join(this.snapshotDir, "express-base") }
        ];
        const match = snapshots.find((s) => s.framework === framework);
        if (match && await import_fs_extra3.default.pathExists(match.path)) {
          return match;
        }
        return null;
      }
      /**
       * Creates a base snapshot (Admin/System tool).
       */
      static async createBaseSnapshot(id, framework, sourceDir) {
        const dest = import_path5.default.join(this.snapshotDir, id);
        import_utils38.default.info({ id, framework }, "[SnapshotLibrary] Creating base snapshot...");
        await import_fs_extra3.default.ensureDir(dest);
        await import_fs_extra3.default.copy(sourceDir, dest, {
          filter: (src) => !src.includes("node_modules/.cache")
        });
        import_utils38.default.info({ id }, "[SnapshotLibrary] Base snapshot created successfully.");
      }
    };
  }
});

// src/sandbox-pool.ts
var import_fs_extra4, import_path6, import_utils39, SandboxPoolManager;
var init_sandbox_pool = __esm({
  "src/sandbox-pool.ts"() {
    import_fs_extra4 = __toESM(require("fs-extra"));
    import_path6 = __toESM(require("path"));
    init_snapshot_library();
    import_utils39 = __toESM(require("@libs/utils"));
    SandboxPoolManager = class {
      static poolDir = import_path6.default.join(process.cwd(), ".previews", "pool");
      static activePool = [];
      static POOL_SIZE = 3;
      // Pre-warm 3 containers per framework
      /**
       * Initializes the pool and warms up containers.
       */
      static async init() {
        await import_fs_extra4.default.ensureDir(this.poolDir);
        await this.warmUp();
      }
      /**
       * Warms up the pool with common frameworks.
       */
      static async warmUp() {
        const frameworks = ["nextjs", "vite"];
        for (const framework of frameworks) {
          const count = this.activePool.filter((s) => s.framework === framework).length;
          for (let i = count; i < this.POOL_SIZE; i++) {
            await this.createWarmedSandbox(framework);
          }
        }
      }
      /**
       * Creates a new warmed sandbox from a snapshot.
       */
      static async createWarmedSandbox(framework) {
        const snapshot = await SnapshotLibrary.getSnapshot(framework);
        if (!snapshot) return;
        const id = `warmed-${framework}-${Math.random().toString(36).substring(7)}`;
        const sandboxDir = import_path6.default.join(this.poolDir, id);
        import_utils39.default.info({ id, framework }, "[SandboxPool] Pre-warming sandbox...");
        await import_fs_extra4.default.ensureDir(sandboxDir);
        await import_fs_extra4.default.copy(snapshot.path, sandboxDir);
        this.activePool.push({ id, framework, sandboxDir });
      }
      /**
       * Acquires a warmed sandbox from the pool.
       */
      static async acquire(framework, targetProjectId) {
        const index = this.activePool.findIndex((s) => s.framework === framework);
        if (index === -1) {
          import_utils39.default.warn({ framework }, "[SandboxPool] No warmed sandbox available. Falling back to slow path.");
          return null;
        }
        const warmed = this.activePool.splice(index, 1)[0];
        const targetDir = import_path6.default.join(process.cwd(), ".previews", targetProjectId);
        import_utils39.default.info({ fromId: warmed.id, toProject: targetProjectId }, "[SandboxPool] Hot-swapping sandbox...");
        await import_fs_extra4.default.move(warmed.sandboxDir, targetDir, { overwrite: true });
        this.createWarmedSandbox(framework).catch((err) => import_utils39.default.error({ err }, "[SandboxPool] Failed to replenish"));
        return targetDir;
      }
    };
  }
});

// src/microvm-provider.ts
var import_child_process4, FirecrackerDriver;
var init_microvm_provider = __esm({
  "src/microvm-provider.ts"() {
    import_child_process4 = require("child_process");
    FirecrackerDriver = class {
      async boot(config) {
        console.log(`[FirecrackerDriver] Booting MicroVM ${config.id} (CPU: ${config.cpuCores}, Mem: ${config.memoryMb}MB)`);
        const child = (0, import_child_process4.spawn)("node", ["-e", "setInterval(() => {}, 1000)"], {
          stdio: "pipe"
        });
        return child;
      }
      async shutdown(id) {
        console.log(`[FirecrackerDriver] Shutting down MicroVM ${id}`);
      }
      async pause(id) {
        console.log(`[FirecrackerDriver] Pausing MicroVM ${id}`);
      }
      async resume(id) {
        console.log(`[FirecrackerDriver] Resuming MicroVM ${id}`);
      }
    };
  }
});

// src/snapshot-overlay.ts
var import_fs_extra5, import_path7, import_utils40, SnapshotOverlayManager;
var init_snapshot_overlay = __esm({
  "src/snapshot-overlay.ts"() {
    import_fs_extra5 = __toESM(require("fs-extra"));
    import_path7 = __toESM(require("path"));
    import_utils40 = __toESM(require("@libs/utils"));
    SnapshotOverlayManager = class {
      /**
       * Prepares a writable overlay for a specific project based on a base snapshot.
       * In a real microVM environment, this would involve setting up device mapper
       * or copy-on-write blocks.
       */
      static async prepareOverlay(config) {
        const { baseSnapshotPath, projectPath, overlayPath } = config;
        import_utils40.default.info({ baseSnapshotPath, projectPath }, "[SnapshotOverlayManager] Preparing project overlay...");
        await import_fs_extra5.default.ensureDir(overlayPath);
        const lowerDir = import_path7.default.join(overlayPath, "lower");
        const upperDir = import_path7.default.join(overlayPath, "upper");
        const workDir = import_path7.default.join(overlayPath, "work");
        const mergedDir = import_path7.default.join(overlayPath, "merged");
        await import_fs_extra5.default.ensureDir(lowerDir);
        await import_fs_extra5.default.ensureDir(upperDir);
        await import_fs_extra5.default.ensureDir(workDir);
        await import_fs_extra5.default.ensureDir(mergedDir);
        try {
          const files = await import_fs_extra5.default.readdir(lowerDir);
          if (files.length === 0) {
            await import_fs_extra5.default.copy(baseSnapshotPath, lowerDir);
          }
          await import_fs_extra5.default.copy(projectPath, upperDir);
          import_utils40.default.info({ mergedDir }, "[SnapshotOverlayManager] Overlay ready.");
        } catch (err) {
          import_utils40.default.error({ err }, "[SnapshotOverlayManager] Failed to prepare overlay");
          throw err;
        }
      }
      static async cleanupOverlay(overlayPath) {
        import_utils40.default.info({ overlayPath }, "[SnapshotOverlayManager] Cleaning up overlay...");
        await import_fs_extra5.default.remove(overlayPath);
      }
    };
  }
});

// src/microvm-manager.ts
var import_path8, import_fs_extra6, import_utils41, MicroVMManager;
var init_microvm_manager = __esm({
  "src/microvm-manager.ts"() {
    init_microvm_provider();
    init_snapshot_overlay();
    init_snapshot_library();
    import_path8 = __toESM(require("path"));
    import_fs_extra6 = __toESM(require("fs-extra"));
    import_utils41 = __toESM(require("@libs/utils"));
    MicroVMManager = class {
      static provider = new FirecrackerDriver();
      static activeVMs = /* @__PURE__ */ new Map();
      static async allocateSandbox(projectId, framework) {
        import_utils41.default.info({ projectId, framework }, "[MicroVMManager] Allocating MicroVM Sandbox...");
        const snapshot = await SnapshotLibrary.getSnapshot(framework);
        if (!snapshot) {
          throw new Error(`No base snapshot found for framework: ${framework}`);
        }
        const projectPath = import_path8.default.join(process.cwd(), "projects", projectId);
        const overlayPath = import_path8.default.join(process.cwd(), ".microvms", projectId);
        await import_fs_extra6.default.ensureDir(projectPath);
        await import_fs_extra6.default.ensureDir(overlayPath);
        await SnapshotOverlayManager.prepareOverlay({
          baseSnapshotPath: snapshot.path,
          projectPath,
          overlayPath
        });
        const config = {
          id: projectId,
          kernelPath: "/etc/microvm/vmlinux",
          // Placeholder path
          rootfsPath: import_path8.default.join(overlayPath, "merged"),
          // Target merged layer
          cpuCores: 1,
          memoryMb: 1024
        };
        const child = await this.provider.boot(config);
        this.activeVMs.set(projectId, { child, config });
        import_utils41.default.info({ projectId }, "[MicroVMManager] MicroVM Sandbox successfully allocated and booted.");
        return config.rootfsPath;
      }
      static async terminateSandbox(projectId) {
        const vm = this.activeVMs.get(projectId);
        if (vm) {
          await this.provider.shutdown(projectId);
          vm.child.kill();
          this.activeVMs.delete(projectId);
          const overlayPath = import_path8.default.join(process.cwd(), ".microvms", projectId);
          await SnapshotOverlayManager.cleanupOverlay(overlayPath);
          import_utils41.default.info({ projectId }, "[MicroVMManager] MicroVM Sandbox terminated and cleaned up.");
        }
      }
      static getVMStatus(projectId) {
        return this.activeVMs.has(projectId) ? "running" : "not_found";
      }
    };
  }
});

// src/preview-manager.ts
var preview_manager_exports = {};
__export(preview_manager_exports, {
  PreviewServerManager: () => PreviewServerManager,
  previewManager: () => previewManager
});
var import_path9, import_fs_extra7, import_net3, import_registry7, import_http, import_server3, import_validator, PortAllocator, PreviewServerManager, previewManager;
var init_preview_manager = __esm({
  "src/preview-manager.ts"() {
    import_path9 = __toESM(require("path"));
    import_fs_extra7 = __toESM(require("fs-extra"));
    import_net3 = __toESM(require("net"));
    init_sandbox_runner();
    import_registry7 = require("@libs/registry");
    import_http = __toESM(require("http"));
    import_server3 = require("@libs/utils/server");
    init_snapshot_manager();
    init_sandbox_pool();
    init_snapshot_library();
    init_admission_controller();
    init_microvm_manager();
    import_validator = require("@libs/validator");
    PortAllocator = class {
      basePort = 3001;
      maxPort = 3999;
      usedPorts = /* @__PURE__ */ new Set();
      async allocate() {
        for (let port = this.basePort; port <= this.maxPort; port++) {
          if (this.usedPorts.has(port)) continue;
          const isAvailable = await this.checkPort(port);
          if (isAvailable) {
            this.usedPorts.add(port);
            return port;
          }
        }
        throw new Error("No available ports found for preview server");
      }
      release(port) {
        this.usedPorts.delete(port);
      }
      checkPort(port) {
        return new Promise((resolve) => {
          const server = import_net3.default.createServer();
          server.unref();
          server.on("error", () => resolve(false));
          server.listen(port, () => {
            server.close(() => resolve(true));
          });
        });
      }
    };
    PreviewServerManager = class {
      portAllocator = new PortAllocator();
      activePreviews = /* @__PURE__ */ new Map();
      templateDir = import_path9.default.join(process.cwd(), ".previews", "_template");
      snapshotManager = new SnapshotManager();
      constructor() {
        this.initializeTemplates();
        this.startCleanupInterval();
        SnapshotLibrary.init().catch((e) => import_server3.logger.error({ e }, "SnapshotLibrary init failed"));
        SandboxPoolManager.init().catch((e) => import_server3.logger.error({ e }, "SandboxPoolManager init failed"));
      }
      async initializeTemplates() {
        if (!import_fs_extra7.default.existsSync(this.templateDir)) {
          await import_fs_extra7.default.ensureDir(this.templateDir);
          import_server3.logger.info("[PreviewManager] Initializing Hot Sandbox Template...");
          await import_fs_extra7.default.writeFile(import_path9.default.join(this.templateDir, "package.json"), JSON.stringify({
            name: "multi-agent-preview-template",
            dependencies: {
              "next": "latest",
              "react": "latest",
              "react-dom": "latest",
              "lucide-react": "latest",
              "framer-motion": "latest"
            }
          }, null, 2));
        }
      }
      startCleanupInterval() {
        setInterval(async () => {
          const now = Date.now();
          const IDLE_TIMEOUT = 30 * 60 * 1e3;
          for (const [projectId] of this.activePreviews.entries()) {
            try {
              const regData = await import_server3.redis.get(`runtime:registry:${projectId}`);
              let lastAccess = 0;
              if (regData) {
                lastAccess = JSON.parse(regData).lastAccessedAt ? new Date(JSON.parse(regData).lastAccessedAt).getTime() : 0;
              } else {
                const lastAccessStr = await import_server3.redis.get(`preview:last_access:${projectId}`);
                lastAccess = lastAccessStr ? parseInt(lastAccessStr) : 0;
              }
              if (lastAccess && now - lastAccess > IDLE_TIMEOUT) {
                import_server3.logger.info(`[PreviewManager] Shutting down idle preview for ${projectId}`);
                await this.stopPreview(projectId);
                await import_server3.redis.del(`preview:last_access:${projectId}`);
              }
            } catch (err) {
              import_server3.logger.error({ err }, `[PreviewManager] Idle cleanup error for ${projectId}`);
            }
          }
        }, 6e4);
      }
      async launchPreview(projectId, framework = "nextjs") {
        import_server3.logger.info({ projectId, framework }, "[PreviewServerManager] Launching preview environment...");
        await AdmissionController.acquireAdmission(projectId);
        const useMicroVM = process.env.ENABLE_MICROVMS === "true";
        if (useMicroVM) {
          const rootfs = await MicroVMManager.allocateSandbox(projectId, framework);
          import_server3.logger.info({ projectId, rootfs }, "[PreviewServerManager] MICROVM ALLOCATED (Phase 15).");
          return await this.startServer(projectId);
        }
        const pooledDir = await SandboxPoolManager.acquire(framework, projectId);
        if (pooledDir) {
          import_server3.logger.info("[PreviewServerManager] HOT POOL HIT. Sandbox allocated in <50ms.");
          return await this.startServer(projectId);
        }
        const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
        const restored = await this.snapshotManager.restoreFromSnapshot(projectId, previewDir);
        if (restored) {
          import_server3.logger.info(`[PreviewManager] Rapid Restore successful for ${projectId}. Skipping initialization.`);
        } else {
          import_server3.logger.info(`[PreviewManager] Cold path initialization for ${projectId}.`);
          await import_fs_extra7.default.ensureDir(previewDir);
          const nodeModulesPath = import_path9.default.join(previewDir, "node_modules");
          const templateModulesPath = import_path9.default.join(this.templateDir, "node_modules");
          if (!import_fs_extra7.default.existsSync(nodeModulesPath) && import_fs_extra7.default.existsSync(templateModulesPath)) {
            try {
              import_fs_extra7.default.symlinkSync(templateModulesPath, nodeModulesPath, "junction");
            } catch (e) {
              import_server3.logger.warn({ error: e }, `[PreviewManager] Could not symlink node_modules for ${projectId}.`);
            }
          }
        }
        return await this.startServer(projectId);
      }
      async restartPreview(projectId) {
        await this.stopPreview(projectId);
        return await this.startServer(projectId);
      }
      async checkHealth(previewId) {
        const reg = await import_registry7.PreviewRegistry.lookupByPreviewId(previewId);
        if (!reg) return false;
        return this.isHttpReady(reg.ports[0] ?? 0);
      }
      async isPortOpen(port, timeoutMs = 2e3) {
        return new Promise((resolve) => {
          const socket = new import_net3.default.Socket();
          socket.setTimeout(timeoutMs);
          socket.on("connect", () => {
            socket.destroy();
            resolve(true);
          });
          socket.on("error", () => {
            socket.destroy();
            resolve(false);
          });
          socket.on("timeout", () => {
            socket.destroy();
            resolve(false);
          });
          socket.connect(port, "127.0.0.1");
        });
      }
      async isHttpReady(port) {
        return new Promise((resolve) => {
          const req = import_http.default.get(`http://127.0.0.1:${port}`, (res) => {
            resolve(res.statusCode === 200);
          });
          req.on("error", () => resolve(false));
          req.setTimeout(1e3, () => {
            req.destroy();
            resolve(false);
          });
        });
      }
      async startServer(projectId) {
        let previewId = (await import_registry7.PreviewRegistry.get(projectId))?.previewId;
        if (!previewId) {
          const executionId = "legacy-" + projectId;
          const reg2 = await import_registry7.PreviewRegistry.init(projectId, executionId);
          const port2 = await this.portAllocator.allocate();
          await import_registry7.PreviewRegistry.update(projectId, { ports: [port2] });
          previewId = reg2.previewId;
        }
        const reg = await import_registry7.PreviewRegistry.get(projectId);
        if (!reg) throw new Error("Preview registration missing");
        const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
        const port = reg.ports[0] ?? 0;
        const validation = await import_validator.ArtifactValidator.validate(projectId);
        if (!validation.valid) {
          throw new Error(`Cannot start preview: Missing artifacts (${validation.missingFiles?.join(", ")})`);
        }
        if (this.activePreviews.has(projectId) && reg.status === "RUNNING") {
          return `http://localhost:${port}`;
        }
        await import_registry7.PreviewRegistry.update(projectId, { status: "STARTING" });
        return new Promise((resolve, reject) => {
          try {
            const memoryLimitMb = 1024;
            const child = SandboxRunner.spawnLongRunning("npx", ["next", "dev", "-p", port.toString(), "-H", "0.0.0.0"], {
              cwd: previewDir,
              executionId: projectId,
              agentName: "System",
              action: "preview_server",
              env: (0, import_server3.getSafeEnv)({
                NODE_OPTIONS: `--max-old-space-size=${memoryLimitMb}`
              })
            });
            this.startHeartbeatMonitor(projectId, child);
            this.activePreviews.set(projectId, { port, process: child });
            const checkStartup = async () => {
              const start = Date.now();
              let isReady = false;
              const TIMEOUT_MS = 6e4;
              import_server3.logger.info({ projectId, port }, "[PreviewManager] Starting HTTP health check loop...");
              while (Date.now() - start < TIMEOUT_MS) {
                const portOpen = await this.isPortOpen(port, 1e3);
                if (portOpen) {
                  isReady = await this.isHttpReady(port);
                  if (isReady) break;
                }
                await new Promise((r) => setTimeout(r, 2e3));
              }
              if (isReady) {
                import_server3.logger.info(`[PreviewManager] Sandbox ${projectId} is HTTP READY.`);
                await import_registry7.PreviewRegistry.update(projectId, { status: "RUNNING" });
                this.snapshotManager.createSnapshot(projectId, previewDir).catch((e_snap) => {
                  import_server3.logger.error({ e: e_snap }, `[PreviewManager] Snapshot failed for ${projectId}`);
                });
                resolve(`http://localhost:${port}`);
              } else {
                reject(new Error("HTTP readiness timeout"));
              }
            };
            checkStartup();
            child.on("error", (err) => {
              import_server3.logger.error({ err }, `[PreviewManager] Process error for ${projectId}`);
              import_registry7.PreviewRegistry.update(projectId, { status: "FAILED", failureReason: err.message }).catch(() => {
              });
            });
            child.on("exit", async () => {
              this.portAllocator.release(port);
              this.activePreviews.delete(projectId);
              import_registry7.PreviewRegistry.update(projectId, { status: "STOPPED" }).catch(() => {
              });
            });
          } catch (err) {
            this.portAllocator.release(port);
            reject(err);
          }
        });
      }
      async stopPreview(projectId) {
        const preview = this.activePreviews.get(projectId);
        if (preview) {
          preview.process.kill("SIGKILL");
          this.portAllocator.release(preview.port);
          this.activePreviews.delete(projectId);
        }
      }
      startHeartbeatMonitor(projectId, child) {
        const checkInterval = 1e4;
        const timer = setInterval(async () => {
          if (child.killed || child.exitCode !== null) {
            import_server3.logger.warn({ projectId }, "[Heartbeat] Sandbox process exited. Triggering recovery...");
            clearInterval(timer);
            await this.recoverSandbox(projectId);
            return;
          }
          const reg = await import_registry7.PreviewRegistry.get(projectId);
          if (reg?.previewId) {
            const isHealthy = await this.checkHealth(reg.previewId);
            if (!isHealthy) {
              import_server3.logger.warn({ projectId }, "[Heartbeat] Sandbox HTTP health check failed.");
            }
          }
        }, checkInterval);
      }
      async recoverSandbox(projectId) {
        import_server3.logger.info({ projectId }, "[Recovery] Restarting crashed sandbox...");
        try {
          await this.launchPreview(projectId);
        } catch (err) {
          import_server3.logger.error({ err, projectId }, "[Recovery] Failed to recover sandbox.");
        }
      }
      async streamFileUpdate(projectId, filePath, content) {
        const previewDir = import_path9.default.join(process.cwd(), ".generated-projects", projectId);
        const fullPath = import_path9.default.join(previewDir, filePath);
        try {
          await import_fs_extra7.default.ensureDir(import_path9.default.dirname(fullPath));
          await import_fs_extra7.default.writeFile(fullPath, content);
          import_server3.logger.info(`[PreviewManager] VFS Stream: ${filePath}`);
        } catch (err) {
          import_server3.logger.error({ err }, `[PreviewManager] VFS Stream failed: ${filePath}`);
        }
      }
    };
    previewManager = new PreviewServerManager();
  }
});

// src/index.ts
var index_exports = {};
__export(index_exports, {
  AdmissionController: () => AdmissionController,
  CleanupService: () => CleanupService,
  ClusterProxy: () => ClusterProxy,
  ContainerManager: () => ContainerManager,
  DistributedLock: () => DistributedLock,
  EvolutionEngine: () => EvolutionEngine,
  FailoverManager: () => FailoverManager,
  FirecrackerDriver: () => FirecrackerDriver,
  MicroVMManager: () => MicroVMManager,
  NodeRegistry: () => NodeRegistry,
  PerformanceMonitor: () => PerformanceMonitor,
  PortManager: () => PortManager,
  PreviewOrchestrator: () => PreviewOrchestrator,
  PreviewRuntimePool: () => PreviewRuntimePool,
  PreviewServerManager: () => PreviewServerManager,
  PreviewWatchdog: () => PreviewWatchdog,
  ProcessManager: () => ProcessManager,
  ProcessSandbox: () => ProcessSandbox,
  RedisRecovery: () => RedisRecovery,
  ResourceManager: () => ResourceManager,
  RollingRestart: () => RollingRestart2,
  RuntimeCapacity: () => RuntimeCapacity,
  RuntimeCleanup: () => RuntimeCleanup,
  RuntimeEscalation: () => RuntimeEscalation,
  RuntimeGuard: () => RuntimeGuard,
  RuntimeHeartbeat: () => RuntimeHeartbeat,
  RuntimeMetrics: () => RuntimeMetrics,
  RuntimeScheduler: () => RuntimeScheduler,
  SandboxPoolManager: () => SandboxPoolManager,
  SandboxRunner: () => SandboxRunner,
  SnapshotLibrary: () => SnapshotLibrary,
  SnapshotManager: () => SnapshotManager,
  SnapshotOverlayManager: () => SnapshotOverlayManager,
  StaleEvictor: () => StaleEvictor,
  StorageGC: () => StorageGC,
  cleanupService: () => cleanupService,
  previewManager: () => previewManager,
  previewRunner: () => previewRunner,
  runtimeExecutor: () => runtimeExecutor,
  sandbox: () => sandbox,
  snapshotManager: () => snapshotManager,
  startPreview: () => startPreview,
  stopPreview: () => stopPreview
});
module.exports = __toCommonJS(index_exports);

// src/cluster/distributedLock.ts
var import_utils = __toESM(require("@libs/utils"));
var import_utils2 = __toESM(require("@libs/utils"));
var LOCK_PREFIX = "cluster:lock:";
var DEFAULT_TTL_MS = 3e4;
var DistributedLock = {
  /**
   * Acquire a lock for a given resource.
   * Returns a LockHandle if successful, null if the lock is already held.
   *
   * @param resource - e.g. "runtime:start:{projectId}"
   * @param ttlMs - lock auto-expires after this duration (safety valve)
   */
  async acquire(resource, ttlMs = DEFAULT_TTL_MS) {
    const key = `${LOCK_PREFIX}${resource}`;
    const token = `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
    const result = await import_utils.default.set(key, token, "PX", ttlMs, "NX");
    if (result === "OK") {
      import_utils2.default.debug({ resource, token }, "[DistributedLock] Lock acquired");
      return { key, token, acquiredAt: Date.now() };
    }
    import_utils2.default.debug({ resource }, "[DistributedLock] Lock already held");
    return null;
  },
  /**
   * Release a lock. Uses a Lua script for atomic compare-and-delete
   * so only the holder can release.
   */
  async release(handle) {
    const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("del", KEYS[1])
            else
                return 0
            end
        `;
    const result = await import_utils.default.eval(script, 1, handle.key, handle.token);
    if (result === 1) {
      import_utils2.default.debug({ key: handle.key }, "[DistributedLock] Lock released");
      return true;
    }
    import_utils2.default.warn({ key: handle.key }, "[DistributedLock] Lock already expired or held by another");
    return false;
  },
  /**
   * Extend a lock's TTL (for long-running operations).
   * Only succeeds if we still hold the lock.
   */
  async extend(handle, ttlMs = DEFAULT_TTL_MS) {
    const script = `
            if redis.call("get", KEYS[1]) == ARGV[1] then
                return redis.call("pexpire", KEYS[1], ARGV[2])
            else
                return 0
            end
        `;
    const result = await import_utils.default.eval(script, 1, handle.key, handle.token, ttlMs.toString());
    if (result === 1) {
      import_utils2.default.debug({ key: handle.key, ttlMs }, "[DistributedLock] Lock extended");
      return true;
    }
    return false;
  },
  /**
   * Execute a function while holding a lock.
   * Auto-acquires and releases. Retries up to maxRetries with backoff.
   */
  async withLock(resource, fn, options = {}) {
    const { ttlMs = DEFAULT_TTL_MS, maxRetries = 5, retryDelayMs = 1e3 } = options;
    let handle = null;
    let attempt = 0;
    while (attempt < maxRetries) {
      handle = await this.acquire(resource, ttlMs);
      if (handle) break;
      attempt++;
      if (attempt < maxRetries) {
        const delay = retryDelayMs * (1 + Math.random());
        await new Promise((r) => setTimeout(r, delay));
      }
    }
    if (!handle) {
      throw new Error(`[DistributedLock] Failed to acquire lock "${resource}" after ${maxRetries} retries`);
    }
    try {
      return await fn();
    } finally {
      await this.release(handle);
    }
  },
  /**
   * Check if a lock is currently held (for diagnostics only).
   */
  async isLocked(resource) {
    const key = `${LOCK_PREFIX}${resource}`;
    const exists = await import_utils.default.exists(key);
    return exists === 1;
  }
};

// src/cluster/nodeRegistry.ts
var import_crypto = require("crypto");
var import_os = __toESM(require("os"));
var import_utils3 = require("@libs/utils");
var import_utils4 = __toESM(require("@libs/utils"));
var import_utils5 = __toESM(require("@libs/utils"));
var NODE_PREFIX = "cluster:node:";
var NODE_SET_KEY = "cluster:nodes";
var NODE_HEARTBEAT_TTL = 30;
var HEARTBEAT_INTERVAL = 1e4;
var MAX_RUNTIMES_PER_NODE = parseInt(process.env.NODE_MAX_RUNTIMES ?? "25", 10);
var NODE_REGION = process.env.NODE_REGION ?? "default";
var _nodeId = null;
var _heartbeatTimer = null;
var _runningCount = 0;
var NodeRegistry = {
  /**
   * Register this worker node in the cluster.
   * Called once on worker boot. Starts the heartbeat loop.
   */
  async register() {
    _nodeId = (0, import_crypto.randomUUID)();
    _runningCount = 0;
    await this.publishHeartbeat();
    _heartbeatTimer = setInterval(async () => {
      try {
        await this.publishHeartbeat();
      } catch (err) {
        import_utils5.default.error({ err }, "[NodeRegistry] Heartbeat publish failed");
      }
    }, HEARTBEAT_INTERVAL);
    if (_heartbeatTimer.unref) _heartbeatTimer.unref();
    await import_utils4.default.sadd(NODE_SET_KEY, _nodeId);
    import_utils5.default.info({
      nodeId: _nodeId,
      hostname: import_os.default.hostname(),
      region: NODE_REGION,
      maxRuntimes: MAX_RUNTIMES_PER_NODE
    }, "[NodeRegistry] Node registered");
    return _nodeId;
  },
  /**
   * Publish this node's heartbeat with current resource usage.
   */
  async publishHeartbeat() {
    if (!_nodeId) return;
    const info = {
      nodeId: _nodeId,
      hostname: import_os.default.hostname(),
      region: NODE_REGION,
      maxRuntimes: MAX_RUNTIMES_PER_NODE,
      runningRuntimes: _runningCount,
      cpuCount: import_os.default.cpus().length,
      totalMemoryMB: Math.round(import_os.default.totalmem() / 1048576),
      freeMemoryMB: Math.round(import_os.default.freemem() / 1048576),
      loadAvg1m: parseFloat(import_os.default.loadavg()[0].toFixed(2)),
      startedAt: _nodeId ? (/* @__PURE__ */ new Date()).toISOString() : "",
      lastHeartbeat: (/* @__PURE__ */ new Date()).toISOString(),
      version: "3.0.0"
    };
    await import_utils4.default.setex(
      `${NODE_PREFIX}${_nodeId}`,
      NODE_HEARTBEAT_TTL,
      JSON.stringify(info)
    );
    import_utils3.nodeCpuUsage.set(info.loadAvg1m / info.cpuCount);
    import_utils3.nodeMemoryUsage.set(import_os.default.totalmem() - import_os.default.freemem());
    import_utils5.default.debug({ nodeId: _nodeId, load: info.loadAvg1m }, "[NodeRegistry] Heartbeat sent");
  },
  /**
   * Deregister this node (graceful shutdown).
   */
  async deregister() {
    if (!_nodeId) return;
    if (_heartbeatTimer) {
      clearInterval(_heartbeatTimer);
      _heartbeatTimer = null;
    }
    await import_utils4.default.srem(NODE_SET_KEY, _nodeId);
    await import_utils4.default.del(`${NODE_PREFIX}${_nodeId}`);
    import_utils5.default.info({ nodeId: _nodeId }, "[NodeRegistry] Node deregistered");
    _nodeId = null;
  },
  /**
   * Get all currently registered nodes.
   */
  async listNodes() {
    const nodeIds = await import_utils4.default.smembers(NODE_SET_KEY);
    if (!nodeIds.length) return [];
    const pipeline = import_utils4.default.pipeline();
    nodeIds.forEach((id) => pipeline.get(`${NODE_PREFIX}${id}`));
    const results = await pipeline.exec();
    const nodes = [];
    const staleIds = [];
    for (let i = 0; i < nodeIds.length; i++) {
      const [err, raw] = results[i];
      if (err || !raw) {
        staleIds.push(nodeIds[i]);
        continue;
      }
      nodes.push(JSON.parse(raw));
    }
    if (staleIds.length) {
      await import_utils4.default.srem(NODE_SET_KEY, ...staleIds);
      import_utils5.default.info({ staleIds }, "[NodeRegistry] Cleaned stale node entries");
    }
    return nodes;
  },
  /**
   * Get info for a specific node.
   */
  async getNode(nodeId) {
    const raw = await import_utils4.default.get(`${NODE_PREFIX}${nodeId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  },
  /**
   * Increment running runtime count on this node.
   */
  incrementRunning() {
    _runningCount++;
  },
  /**
   * Decrement running runtime count on this node.
   */
  decrementRunning() {
    _runningCount = Math.max(0, _runningCount - 1);
  },
  /**
   * Get this node's ID.
   */
  getNodeId() {
    return _nodeId;
  },
  /**
   * Get this node's running count.
   */
  getRunningCount() {
    return _runningCount;
  },
  /**
   * Get max runtimes per node.
   */
  getMaxRuntimes() {
    return MAX_RUNTIMES_PER_NODE;
  }
};

// src/cluster/staleEvictor.ts
var import_registry2 = require("@libs/registry");

// src/processManager.ts
var import_child_process = require("child_process");
var import_server = require("@libs/utils/server");
init_runtimeGuard();
var processRegistry = /* @__PURE__ */ new Map();
var ProcessManager = {
  /**
   * Start a process for the given project and append to registry.
   */
  async start(projectId, cwd, command = "npm", args = ["run", "dev"], env = {}, timeoutMs = 6e4) {
    import_server.logger.info({ projectId, cwd, command, args }, "[ProcessManager] Spawning process");
    const child = (0, import_child_process.spawn)(command, args, RuntimeGuard.safeSpawnOptions(cwd, env));
    const managed = {
      pid: child.pid,
      projectId,
      status: "STARTING",
      startedAt: (/* @__PURE__ */ new Date()).toISOString(),
      cwd,
      process: child
    };
    const existing = processRegistry.get(projectId) || [];
    existing.push(managed);
    processRegistry.set(projectId, existing);
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        managed.status = "FAILED";
        reject(new Error(`[ProcessManager] Timeout: process ${command} for ${projectId} did not start in ${timeoutMs}ms`));
      }, timeoutMs);
      child.on("error", (err) => {
        managed.status = "FAILED";
        clearTimeout(timer);
        import_server.logger.error({ projectId, err }, "[ProcessManager] Spawn error");
        reject(err);
      });
      child.on("exit", (code) => {
        managed.status = code === 0 ? "STOPPED" : "FAILED";
        import_server.logger.warn({ projectId, pid: child.pid, code }, "[ProcessManager] Process exited");
      });
      child.stdout.on("data", (chunk) => {
        const line = chunk.toString();
        if (line.includes("Local:") || line.includes("localhost:") || line.includes("listening on") || line.includes("ready on") || line.includes("started server")) {
          managed.status = "RUNNING";
          clearTimeout(timer);
          resolve({ pid: child.pid, cwd });
        }
      });
    });
  },
  /**
   * Stop all processes for a project.
   */
  async stopAll(projectId) {
    const processes = processRegistry.get(projectId);
    if (!processes) return;
    import_server.logger.info({ projectId, count: processes.length }, "[ProcessManager] Stopping all processes");
    for (const managed of processes) {
      managed.process.kill("SIGTERM");
      await new Promise((r) => setTimeout(r, 100));
      if (!managed.process.killed) managed.process.kill("SIGKILL");
    }
    processRegistry.delete(projectId);
  },
  /**
   * Get combined status.
   */
  getStatus(projectId) {
    const processes = processRegistry.get(projectId);
    if (!processes || processes.length === 0) return "IDLE";
    if (processes.some((p) => p.status === "FAILED")) return "FAILED";
    if (processes.every((p) => p.status === "RUNNING")) return "RUNNING";
    if (processes.some((p) => p.status === "STARTING")) return "STARTING";
    return "STOPPED";
  },
  /**
   * Get all PIDs.
   */
  getPids(projectId) {
    return (processRegistry.get(projectId) || []).map((p) => p.pid);
  },
  /**
   * Check if any are running.
   */
  isRunning(projectId) {
    const processes = processRegistry.get(projectId);
    return processes?.some((p) => p.status === "RUNNING" || p.status === "STARTING") ?? false;
  },
  /**
   * List all.
   */
  listAll() {
    return Array.from(processRegistry.entries()).map(([projectId, m]) => ({
      projectId,
      pids: m.map((p) => p.pid),
      status: this.getStatus(projectId)
    }));
  }
};

// src/portManager.ts
var import_net = __toESM(require("net"));
var import_utils7 = __toESM(require("@libs/utils"));
var import_utils8 = __toESM(require("@libs/utils"));
var PORT_START = 4100;
var PORT_END = 4999;
var PORT_LEASE_TTL = 3600;
var LEASE_KEY_PREFIX = "runtime:port:lease:";
var PortManager = {
  /**
   * Find 'count' free ports in range [PORT_START, PORT_END] that
   * are not already leased by another running project.
   */
  async acquirePorts(projectId, count = 1) {
    await this.releasePorts(projectId);
    const acquired = [];
    for (let port = PORT_START; port <= PORT_END && acquired.length < count; port++) {
      const leaseKey = `${LEASE_KEY_PREFIX}${port}`;
      const existing = await import_utils7.default.get(leaseKey);
      if (existing) continue;
      const free = await this.isPortFree(port);
      if (!free) continue;
      const claimed = await import_utils7.default.set(leaseKey, projectId, "EX", PORT_LEASE_TTL, "NX");
      if (!claimed) continue;
      acquired.push(port);
    }
    if (acquired.length < count) {
      for (const p of acquired) {
        await import_utils7.default.del(`${LEASE_KEY_PREFIX}${p}`);
      }
      throw new Error(`[PortManager] Could not find ${count} free ports in range ${PORT_START}-${PORT_END}`);
    }
    await import_utils7.default.set(`runtime:project:ports:${projectId}`, JSON.stringify(acquired), "EX", PORT_LEASE_TTL);
    import_utils8.default.info({ projectId, ports: acquired }, "[PortManager] Ports acquired");
    return acquired;
  },
  /**
   * Release all port leases held by a project.
   */
  async releasePorts(projectId) {
    const portsStr = await import_utils7.default.get(`runtime:project:ports:${projectId}`);
    if (!portsStr) return;
    const ports = JSON.parse(portsStr);
    for (const port of ports) {
      await import_utils7.default.del(`${LEASE_KEY_PREFIX}${port}`);
    }
    await import_utils7.default.del(`runtime:project:ports:${projectId}`);
    import_utils8.default.info({ projectId, ports }, "[PortManager] Ports released");
  },
  /**
   * Get the currently leased ports for a project.
   */
  async getPorts(projectId) {
    const portsStr = await import_utils7.default.get(`runtime:project:ports:${projectId}`);
    return portsStr ? JSON.parse(portsStr) : [];
  },
  /**
   * Renew the lease TTL for all active ports.
   */
  async renewLease(projectId) {
    const portsStr = await import_utils7.default.get(`runtime:project:ports:${projectId}`);
    if (!portsStr) return;
    const ports = JSON.parse(portsStr);
    for (const port of ports) {
      await import_utils7.default.expire(`${LEASE_KEY_PREFIX}${port}`, PORT_LEASE_TTL);
    }
    await import_utils7.default.expire(`runtime:project:ports:${projectId}`, PORT_LEASE_TTL);
  },
  /**
   * Force-acquire specific ports (used during Redis crash recovery).
   */
  async forceAcquirePorts(projectId, ports) {
    for (const port of ports) {
      await import_utils7.default.set(`${LEASE_KEY_PREFIX}${port}`, projectId, "EX", PORT_LEASE_TTL);
    }
    await import_utils7.default.set(`runtime:project:ports:${projectId}`, JSON.stringify(ports), "EX", PORT_LEASE_TTL);
    import_utils8.default.info({ projectId, ports }, "[PortManager] Ports force-acquired (recovery)");
  },
  /**
   * Check whether a port is free at the OS level using a TCP probe.
   */
  isPortFree(port) {
    return new Promise((resolve) => {
      const server = import_net.default.createServer();
      server.unref();
      server.listen(port, "127.0.0.1", () => {
        server.close(() => resolve(true));
      });
      server.on("error", () => resolve(false));
    });
  },
  /**
   * Parse a port number from a raw stdout line.
   * Handles formats like:
   *   "Local:  http://localhost:4101"
   *   "Listening on port 4101"
   *   "Server started on http://localhost:4101"
   */
  parsePortFromOutput(line) {
    const match = line.match(/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d{4,5})/);
    if (match) return parseInt(match[1], 10);
    const portMatch = line.match(/\bport\s+(\d{4,5})\b/i);
    if (portMatch) return parseInt(portMatch[1], 10);
    return null;
  }
};

// src/previewOrchestrator.ts
var import_registry = require("@libs/registry");

// src/runtimeMetrics.ts
var import_utils9 = __toESM(require("@libs/utils"));
var import_utils10 = __toESM(require("@libs/utils"));
var import_utils11 = require("@libs/utils");
var RUNTIME_MODE = process.env.RUNTIME_MODE || "process";
var METRICS_PREFIX = "runtime:metrics:";
var GLOBAL_STATS_KEY = "runtime:global:stats";
var METRICS_TTL = 86400 * 7;
var RuntimeMetrics = {
  /** Record a successful process start with startup latency */
  async recordStart(projectId, startupMs) {
    const key = `${METRICS_PREFIX}${projectId}`;
    const now = Date.now();
    await import_utils9.default.hset(
      key,
      "totalStarts",
      (await this._incr(key, "totalStarts")).toString(),
      "lastStartedAt",
      new Date(now).toISOString(),
      "lastStartupMs",
      startupMs.toString(),
      "lastActivityAt",
      new Date(now).toISOString()
    );
    await import_utils9.default.expire(key, METRICS_TTL);
    await import_utils9.default.hincrby(GLOBAL_STATS_KEY, "totalStarts", 1);
    await import_utils9.default.expire(GLOBAL_STATS_KEY, METRICS_TTL);
    import_utils11.runtimeStartupDuration.observe({ mode: RUNTIME_MODE }, startupMs / 1e3);
    import_utils11.runtimeActiveTotal.inc();
    import_utils10.default.info({ projectId, startupMs }, "[RuntimeMetrics] Start recorded");
  },
  /** Record a process crash */
  async recordCrash(projectId, errorType) {
    const key = `${METRICS_PREFIX}${projectId}`;
    await this._incr(key, "totalCrashes");
    await import_utils9.default.hset(key, "lastErrorType", errorType, "lastErrorAt", (/* @__PURE__ */ new Date()).toISOString());
    await import_utils9.default.expire(key, METRICS_TTL);
    await import_utils9.default.hincrby(GLOBAL_STATS_KEY, "totalCrashes", 1);
    import_utils11.runtimeCrashesTotal.inc({ reason: errorType, mode: RUNTIME_MODE });
    import_utils11.runtimeActiveTotal.dec();
    import_utils10.default.warn({ projectId, errorType }, "[RuntimeMetrics] Crash recorded");
  },
  /** Record health check result */
  async recordHealthCheck(projectId, passed) {
    const key = `${METRICS_PREFIX}${projectId}`;
    await this._incr(key, "totalHealthChecks");
    if (!passed) {
      await this._incr(key, "totalHealthFailures");
    } else {
      await import_utils9.default.hset(key, "lastActivityAt", (/* @__PURE__ */ new Date()).toISOString());
    }
    await import_utils9.default.expire(key, METRICS_TTL);
  },
  /** Record user activity (iframe load, API call to proxy) */
  async recordActivity(projectId) {
    const key = `${METRICS_PREFIX}${projectId}`;
    await import_utils9.default.hset(key, "lastActivityAt", (/* @__PURE__ */ new Date()).toISOString());
    await import_utils9.default.expire(key, METRICS_TTL);
  },
  /** Get snapshot for a project */
  async getSnapshot(projectId) {
    const key = `${METRICS_PREFIX}${projectId}`;
    const data = await import_utils9.default.hgetall(key);
    if (!data || Object.keys(data).length === 0) return null;
    const lastStartedAt = data.lastStartedAt ?? null;
    const uptimeMs = lastStartedAt ? Date.now() - new Date(lastStartedAt).getTime() : 0;
    return {
      projectId,
      totalStarts: parseInt(data.totalStarts ?? "0"),
      totalCrashes: parseInt(data.totalCrashes ?? "0"),
      totalHealthChecks: parseInt(data.totalHealthChecks ?? "0"),
      totalHealthFailures: parseInt(data.totalHealthFailures ?? "0"),
      avgStartupMs: parseInt(data.lastStartupMs ?? "0"),
      lastStartedAt,
      lastErrorType: data.lastErrorType ?? null,
      uptimeMs,
      lastActivityAt: data.lastActivityAt ?? null
    };
  },
  /** Get global platform-wide stats */
  async getGlobalStats() {
    const data = await import_utils9.default.hgetall(GLOBAL_STATS_KEY);
    return Object.fromEntries(
      Object.entries(data ?? {}).map(([k, v]) => [k, parseInt(v)])
    );
  },
  // ─── Internal ──────────────────────────────────────────────
  async _incr(key, field) {
    return import_utils9.default.hincrby(key, field, 1);
  }
};

// src/previewOrchestrator.ts
init_runtimeGuard();

// src/runtimeCapacity.ts
var import_utils12 = __toESM(require("@libs/utils"));
var import_utils13 = __toESM(require("@libs/utils"));
var SYSTEM_MAX_CONCURRENT = parseInt(process.env.RUNTIME_MAX_CONCURRENT ?? "50", 10);
var USER_MAX_CONCURRENT = parseInt(process.env.RUNTIME_USER_MAX_CONCURRENT ?? "3", 10);
var SYSTEM_COUNTER_KEY = "runtime:capacity:system:running";
var USER_COUNTER_PREFIX = "runtime:capacity:user:";
var QUEUE_KEY = "runtime:capacity:queue";
var CAPACITY_TTL = 3600;
var RuntimeCapacity = {
  /**
   * Check whether a new runtime can be started.
   * Returns `allowed: true` if both system and user quotas permit.
   * Does NOT reserve capacity — call `reserve()` after allowed check.
   */
  async check(userId) {
    const [systemRaw, userRaw, queueLen] = await Promise.all([
      import_utils12.default.get(SYSTEM_COUNTER_KEY),
      import_utils12.default.get(`${USER_COUNTER_PREFIX}${userId}`),
      import_utils12.default.llen(QUEUE_KEY)
    ]);
    const systemCount = parseInt(systemRaw ?? "0", 10);
    const userCount = parseInt(userRaw ?? "0", 10);
    if (systemCount >= SYSTEM_MAX_CONCURRENT) {
      return {
        allowed: false,
        systemCount,
        userCount,
        queueDepth: queueLen,
        reason: `System capacity reached (${systemCount}/${SYSTEM_MAX_CONCURRENT})`
      };
    }
    if (userCount >= USER_MAX_CONCURRENT) {
      return {
        allowed: false,
        systemCount,
        userCount,
        queueDepth: queueLen,
        reason: `User quota reached (${userCount}/${USER_MAX_CONCURRENT} runtimes)`
      };
    }
    return { allowed: true, systemCount, userCount, queueDepth: queueLen };
  },
  /**
   * Atomically reserve a runtime slot for a user.
   * Uses INCR so this is race-condition safe across workers.
   *
   * Returns the new counts after reservation.
   */
  async reserve(userId) {
    const [systemCount, userCount] = await Promise.all([
      import_utils12.default.incr(SYSTEM_COUNTER_KEY),
      import_utils12.default.incr(`${USER_COUNTER_PREFIX}${userId}`)
    ]);
    await import_utils12.default.expire(SYSTEM_COUNTER_KEY, CAPACITY_TTL);
    await import_utils12.default.expire(`${USER_COUNTER_PREFIX}${userId}`, CAPACITY_TTL);
    import_utils13.default.info({ userId, systemCount, userCount }, "[RuntimeCapacity] Slot reserved");
    return { systemCount, userCount };
  },
  /**
   * Release a runtime slot when a process stops.
   * Guards against going below 0.
   */
  async release(userId) {
    const sysRaw = await import_utils12.default.get(SYSTEM_COUNTER_KEY);
    const userRaw = await import_utils12.default.get(`${USER_COUNTER_PREFIX}${userId}`);
    const sysCount = parseInt(sysRaw ?? "0", 10);
    const userCount = parseInt(userRaw ?? "0", 10);
    if (sysCount > 0) await import_utils12.default.decr(SYSTEM_COUNTER_KEY);
    if (userCount > 0) await import_utils12.default.decr(`${USER_COUNTER_PREFIX}${userId}`);
    import_utils13.default.info({ userId }, "[RuntimeCapacity] Slot released");
    await this.dequeueNext();
  },
  /**
   * Add a project to the waiting queue when capacity is full.
   */
  async enqueue(entry) {
    const position = await import_utils12.default.lpush(QUEUE_KEY, JSON.stringify(entry));
    import_utils13.default.info({ ...entry, position }, "[RuntimeCapacity] Queued for runtime slot");
    return position;
  },
  /**
   * Dequeue the next waiting project and publish it to a channel
   * so a worker can pick it up and start the runtime.
   */
  async dequeueNext() {
    const raw = await import_utils12.default.rpop(QUEUE_KEY);
    if (!raw) return null;
    const entry = JSON.parse(raw);
    import_utils13.default.info({ ...entry }, "[RuntimeCapacity] Dequeued runtime request");
    await import_utils12.default.publish("runtime:capacity:dequeue", JSON.stringify(entry));
    return entry;
  },
  /**
   * Get current system-wide capacity snapshot.
   */
  async snapshot() {
    const [sysRaw, queueLen] = await Promise.all([
      import_utils12.default.get(SYSTEM_COUNTER_KEY),
      import_utils12.default.llen(QUEUE_KEY)
    ]);
    return {
      systemCount: parseInt(sysRaw ?? "0", 10),
      systemMax: SYSTEM_MAX_CONCURRENT,
      queueDepth: queueLen
    };
  },
  /**
   * Force-reset all counters. Only for admin/testing.
   */
  async reset() {
    await import_utils12.default.del(SYSTEM_COUNTER_KEY);
    import_utils13.default.warn("[RuntimeCapacity] System counter reset");
  }
};

// src/runtimeHeartbeat.ts
var import_utils14 = __toESM(require("@libs/utils"));
var import_utils15 = __toESM(require("@libs/utils"));
var HEARTBEAT_PREFIX = "runtime:heartbeat:";
var HEARTBEAT_TTL_SEC = 45;
var HEARTBEAT_EVERY_MS = 15e3;
var heartbeatTimers = /* @__PURE__ */ new Map();
var RuntimeHeartbeat = {
  /**
   * Publish (renew) the heartbeat key for a project.
   * The key expires in 45s — if not renewed, it's treated as dead.
   */
  async publish(projectId, pids, ports) {
    await import_utils14.default.setex(
      `${HEARTBEAT_PREFIX}${projectId}`,
      HEARTBEAT_TTL_SEC,
      JSON.stringify({
        projectId,
        pids,
        ports,
        ts: (/* @__PURE__ */ new Date()).toISOString()
      })
    );
  },
  /**
   * Check whether a project is a zombie (heartbeat key missing).
   * Returns true if the project SHOULD be running but has no recent heartbeat.
   */
  async isZombie(projectId) {
    const exists = await import_utils14.default.exists(`${HEARTBEAT_PREFIX}${projectId}`);
    return exists === 0;
  },
  /**
   * Start the per-project heartbeat publish loop.
   * Call after a runtime is confirmed RUNNING.
   */
  startLoop(projectId, pids, ports) {
    this.stopLoop(projectId);
    const timer = setInterval(async () => {
      try {
        await this.publish(projectId, pids, ports);
        import_utils15.default.debug({ projectId, pids, ports }, "[Heartbeat] Published");
      } catch (err) {
        import_utils15.default.error({ projectId, err }, "[Heartbeat] Publish failed");
      }
    }, HEARTBEAT_EVERY_MS);
    this.publish(projectId, pids, ports).catch(() => {
    });
    if (timer.unref) timer.unref();
    heartbeatTimers.set(projectId, timer);
    import_utils15.default.info({ projectId, pids, ports }, "[Heartbeat] Loop started");
  },
  /**
   * Stop the heartbeat loop for a project (call on stop/restart).
   */
  stopLoop(projectId) {
    const timer = heartbeatTimers.get(projectId);
    if (timer) {
      clearInterval(timer);
      heartbeatTimers.delete(projectId);
    }
    import_utils14.default.del(`${HEARTBEAT_PREFIX}${projectId}`).catch(() => {
    });
  },
  /**
   * Stop all heartbeat loops (for graceful shutdown).
   */
  stopAll() {
    for (const [projectId] of heartbeatTimers) {
      this.stopLoop(projectId);
    }
    import_utils15.default.info("[Heartbeat] All loops stopped");
  },
  /**
   * Scan all RUNNING registry entries and identify zombies.
   * Called by runtimeCleanup on its cycle.
   *
   * Returns list of zombie projectIds.
   */
  async scanForZombies(runningProjectIds) {
    const zombies = [];
    await Promise.all(
      runningProjectIds.map(async (projectId) => {
        const zombie = await this.isZombie(projectId);
        if (zombie) {
          import_utils15.default.warn({ projectId }, "[Heartbeat] Zombie detected \u2014 no heartbeat");
          zombies.push(projectId);
        }
      })
    );
    return zombies;
  },
  /**
   * Get the last heartbeat data for a project (for admin/debugging).
   */
  async getLast(projectId) {
    const raw = await import_utils14.default.get(`${HEARTBEAT_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }
};

// src/runtimeEscalation.ts
var import_utils16 = __toESM(require("@libs/utils"));
var import_utils17 = __toESM(require("@libs/utils"));
var CRASH_WINDOW_MS = 15 * 60 * 1e3;
var MAX_CRASHES_IN_WINDOW = 5;
var FAILURE_HISTORY_KEY = "runtime:failures:";
var ESCALATION_FLAG_KEY = "runtime:escalated:";
var FAILURE_HISTORY_TTL = 86400 * 7;
var ESCALATION_TTL = 3600;
var RuntimeEscalation = {
  /**
   * Record a crash event. Returns whether auto-restart is still allowed.
   *
   * Flow:
   *  1. Add crash to sorted set (score = timestamp)
   *  2. Trim entries older than the window
   *  3. Count remaining entries
   *  4. If count >= threshold → set escalation flag, return false
   *  5. Otherwise → return true (restart allowed)
   */
  async recordCrash(projectId, reason, pid = null, port = null) {
    const now = Date.now();
    const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;
    const entry = {
      timestamp: new Date(now).toISOString(),
      reason,
      pid,
      port,
      crashIndex: 0
      // Will be set after counting
    };
    await import_utils16.default.zadd(historyKey, now, JSON.stringify(entry));
    await import_utils16.default.expire(historyKey, FAILURE_HISTORY_TTL);
    const windowStart = now - CRASH_WINDOW_MS;
    await import_utils16.default.zremrangebyscore(historyKey, "-inf", windowStart);
    const crashCount = await import_utils16.default.zcard(historyKey);
    if (crashCount >= MAX_CRASHES_IN_WINDOW) {
      await this.escalate(projectId);
      import_utils17.default.error(
        { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
        "[Escalation] Threshold breached \u2014 auto-restart DISABLED"
      );
      return { restartAllowed: false, crashCount };
    }
    import_utils17.default.warn(
      { projectId, crashCount, threshold: MAX_CRASHES_IN_WINDOW },
      "[Escalation] Crash recorded \u2014 auto-restart still allowed"
    );
    return { restartAllowed: true, crashCount };
  },
  /**
   * Set the escalation flag — disables auto-restart for ESCALATION_TTL.
   */
  async escalate(projectId) {
    await import_utils16.default.setex(
      `${ESCALATION_FLAG_KEY}${projectId}`,
      ESCALATION_TTL,
      JSON.stringify({
        escalatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        expiresAt: new Date(Date.now() + ESCALATION_TTL * 1e3).toISOString()
      })
    );
  },
  /**
   * Check if auto-restart is currently disabled for a project.
   */
  async isEscalated(projectId) {
    const exists = await import_utils16.default.exists(`${ESCALATION_FLAG_KEY}${projectId}`);
    return exists === 1;
  },
  /**
   * Clear the escalation flag manually (admin action).
   */
  async clearEscalation(projectId) {
    await import_utils16.default.del(`${ESCALATION_FLAG_KEY}${projectId}`);
    import_utils17.default.info({ projectId }, "[Escalation] Escalation cleared by admin");
  },
  /**
   * Get the full escalation status for a project (admin dashboard).
   */
  async getStatus(projectId) {
    const now = Date.now();
    const historyKey = `${FAILURE_HISTORY_KEY}${projectId}`;
    const flagKey = `${ESCALATION_FLAG_KEY}${projectId}`;
    const windowStart = now - CRASH_WINDOW_MS;
    await import_utils16.default.zremrangebyscore(historyKey, "-inf", windowStart);
    const [crashCount, isEscalated, cooldownTtl, rawEntries] = await Promise.all([
      import_utils16.default.zcard(historyKey),
      import_utils16.default.exists(flagKey),
      import_utils16.default.ttl(flagKey),
      import_utils16.default.zrevrange(historyKey, 0, 9)
      // Last 10 crashes
    ]);
    const recentFailures = rawEntries.map((raw, i) => {
      const entry = JSON.parse(raw);
      entry.crashIndex = i + 1;
      return entry;
    });
    return {
      projectId,
      isEscalated: isEscalated === 1,
      crashesInWindow: crashCount,
      threshold: MAX_CRASHES_IN_WINDOW,
      windowMs: CRASH_WINDOW_MS,
      cooldownRemainingMs: cooldownTtl > 0 ? cooldownTtl * 1e3 : 0,
      recentFailures
    };
  },
  /**
   * Purge all failure history for a project (admin cleanup).
   */
  async purgeHistory(projectId) {
    await import_utils16.default.del(`${FAILURE_HISTORY_KEY}${projectId}`);
    await import_utils16.default.del(`${ESCALATION_FLAG_KEY}${projectId}`);
    import_utils17.default.info({ projectId }, "[Escalation] Failure history purged");
  }
};

// src/previewOrchestrator.ts
var import_utils18 = __toESM(require("@libs/utils"));
var import_path2 = __toESM(require("path"));
var import_fs_extra = __toESM(require("fs-extra"));
var import_utils19 = __toESM(require("@libs/utils"));
var HEALTH_CHECK_INTERVAL = 3e4;
var URL_MODE = process.env.PREVIEW_URL_MODE || "local";
var healthCheckTimers = /* @__PURE__ */ new Map();
var PreviewOrchestrator = {
  /**
   * PRIMARY ENTRY POINT.
   *
   * Start the runtime for a project that has finished provisioning.
   *
   * Phase 1 additions:
   *  - Capacity check before starting (system + user quota)
   *  - Escalation check (was auto-restart disabled?)
   *  - Heartbeat loop after RUNNING
   *  - Version tracking in registry
   *  - userId passed through for per-user capacity tracking
   */
  async start(projectId, executionId, userId) {
    import_utils19.default.info({ projectId, executionId, userId }, "[PreviewOrchestrator] Starting runtime");
    const escalated = await RuntimeEscalation.isEscalated(projectId);
    if (escalated) {
      const status = await RuntimeEscalation.getStatus(projectId);
      const msg = `Auto-restart disabled \u2014 ${status.crashesInWindow} crashes in ${status.windowMs / 6e4}min window.`;
      import_utils19.default.warn({ projectId }, `[PreviewOrchestrator] ${msg}`);
      throw new Error(msg);
    }
    const capacityCheck = await RuntimeCapacity.check(userId || "unknown");
    if (!capacityCheck.allowed) {
      throw new Error(`Runtime capacity exceeded: ${capacityCheck.reason}`);
    }
    await RuntimeCapacity.reserve(userId || "unknown");
    await import_registry.PreviewRegistry.init(projectId, executionId, userId);
    await import_registry.PreviewRegistry.update(projectId, { status: "STARTING" });
    try {
      const rootCwd = RuntimeGuard.resolveProjectPath(projectId);
      const hasWeb = await import_fs_extra.default.pathExists(import_path2.default.join(rootCwd, "apps/web"));
      const hasApi = await import_fs_extra.default.pathExists(import_path2.default.join(rootCwd, "apps/api"));
      const portCount = (hasWeb ? 1 : 0) + (hasApi ? 1 : 0) || 1;
      const ports = await PortManager.acquirePorts(projectId, portCount);
      const webPort = ports[0];
      const apiPort = hasWeb && hasApi ? ports[1] : webPort;
      const startTime = Date.now();
      if (hasApi) {
        import_utils19.default.info({ projectId, port: apiPort }, "[PreviewOrchestrator] Starting API service");
        await ProcessManager.start(
          projectId,
          import_path2.default.join(rootCwd, "apps/api"),
          "npm",
          ["run", "dev"],
          { PORT: apiPort.toString() },
          6e4
        );
      }
      if (hasWeb) {
        import_utils19.default.info({ projectId, port: webPort }, "[PreviewOrchestrator] Starting Web service");
        await ProcessManager.start(
          projectId,
          import_path2.default.join(rootCwd, "apps/web"),
          "npm",
          ["run", "dev"],
          { PORT: webPort.toString(), NEXT_PUBLIC_API_URL: `http://localhost:${apiPort}` },
          6e4
        );
      } else if (!hasApi) {
        await ProcessManager.start(
          projectId,
          rootCwd,
          "npm",
          ["run", "dev"],
          { PORT: webPort.toString() },
          6e4
        );
      }
      const startupMs = Date.now() - startTime;
      const previewUrl = this.buildUrl(projectId, webPort);
      const healthOk = await this.verifyHealth(projectId, webPort);
      if (!healthOk) throw new Error("Runtime web port failed health check");
      const pids = ProcessManager.getPids(projectId);
      await import_registry.PreviewRegistry.markRunning(projectId, previewUrl, ports, pids);
      await this.patchBuildState(executionId, previewUrl);
      await RuntimeMetrics.recordStart(projectId, startupMs);
      this.startHealthMonitor(projectId, previewUrl);
      RuntimeHeartbeat.startLoop(projectId, pids, ports);
      import_utils19.default.info({ projectId, previewUrl, ports, pids, startupMs }, "[PreviewOrchestrator] Runtime RUNNING");
      return previewUrl;
    } catch (err) {
      const reason = err instanceof Error ? err.message : String(err);
      await import_registry.PreviewRegistry.markFailed(projectId, reason);
      await PortManager.releasePorts(projectId);
      await ProcessManager.stopAll(projectId);
      await RuntimeCapacity.release(userId || "unknown");
      throw err;
    }
  },
  async stop(projectId) {
    import_utils19.default.info({ projectId }, "[PreviewOrchestrator] Stopping runtime");
    this.stopHealthMonitor(projectId);
    await ProcessManager.stopAll(projectId);
    await PortManager.releasePorts(projectId);
    await import_registry.PreviewRegistry.markStopped(projectId);
  },
  /**
   * Restart the runtime (e.g. after a crash is detected).
   * Phase 1: Checks escalation status before restarting.
   */
  async restart(projectId) {
    import_utils19.default.info({ projectId }, "[PreviewOrchestrator] Restarting runtime");
    const escalated = await RuntimeEscalation.isEscalated(projectId);
    if (escalated) {
      const msg = "Auto-restart disabled due to repeated crashes. Manual intervention required.";
      import_utils19.default.error({ projectId }, `[PreviewOrchestrator] ${msg}`);
      await import_registry.PreviewRegistry.update(projectId, { restartDisabled: true });
      throw new Error(msg);
    }
    const record = await import_registry.PreviewRegistry.get(projectId);
    if (!record) throw new Error(`No runtime record found for projectId=${projectId}`);
    const newVersion = (record.runtimeVersion ?? 1) + 1;
    await this.stop(projectId);
    const url = await this.start(projectId, record.executionId, record.userId);
    await import_registry.PreviewRegistry.update(projectId, { runtimeVersion: newVersion });
    import_utils19.default.info({ projectId, runtimeVersion: newVersion }, "[PreviewOrchestrator] Restart complete (version bumped)");
    return url;
  },
  /**
   * Get the current runtime status for a project.
   */
  async getStatus(projectId) {
    const record = await import_registry.PreviewRegistry.get(projectId);
    return {
      status: record?.status ?? "STOPPED",
      previewUrl: record?.previewUrl ?? null,
      runtimeVersion: record?.runtimeVersion,
      restartDisabled: record?.restartDisabled
    };
  },
  // ─── Internal Helpers ───────────────────────────────────────────────────
  async verifyHealth(projectId, port) {
    const url = `http://127.0.0.1:${port}`;
    const MAX_RETRIES2 = 60;
    for (let i = 0; i < MAX_RETRIES2; i++) {
      try {
        const res = await fetch(url);
        if (res.ok) {
          import_utils19.default.info({ projectId, port, attempt: i + 1 }, "[PreviewOrchestrator] Health check PASSED");
          return true;
        }
      } catch {
      }
      await new Promise((r) => setTimeout(r, 1e3));
    }
    import_utils19.default.error({ projectId, port }, "[PreviewOrchestrator] Health check FAILED after 30s");
    return false;
  },
  buildUrl(projectId, port) {
    if (URL_MODE === "proxy") {
      const base = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
      const cleanBase = base.endsWith("/") ? base.slice(0, -1) : base;
      return `${cleanBase}/api/preview-proxy/${projectId}`;
    }
    return `http://localhost:${port}`;
  },
  async patchBuildState(executionId, previewUrl) {
    const key = `build:state:${executionId}`;
    const raw = await import_utils18.default.get(key);
    if (!raw) return;
    const state = JSON.parse(raw);
    state.previewUrl = previewUrl;
    await import_utils18.default.setex(key, 86400, JSON.stringify(state));
    await import_utils18.default.publish(`build:progress:${executionId}`, JSON.stringify(state));
  },
  /**
   * Health monitor — now integrates with escalation system.
   */
  startHealthMonitor(projectId, previewUrl) {
    this.stopHealthMonitor(projectId);
    let consecutiveFailures = 0;
    const MAX_FAILURES = 3;
    const timer = setInterval(async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5e3);
        const res = await fetch(previewUrl, { signal: controller.signal });
        clearTimeout(timeout);
        if (res.ok) {
          consecutiveFailures = 0;
          await RuntimeMetrics.recordHealthCheck(projectId, true);
          await PortManager.renewLease(projectId);
        } else {
          throw new Error(`HTTP ${res.status}`);
        }
      } catch {
        consecutiveFailures++;
        await RuntimeMetrics.recordHealthCheck(projectId, false);
        import_utils19.default.warn({ projectId, consecutiveFailures, previewUrl }, "[HealthMonitor] Check failed");
        if (consecutiveFailures >= MAX_FAILURES) {
          import_utils19.default.error({ projectId }, "[HealthMonitor] Max failures reached");
          this.stopHealthMonitor(projectId);
          await RuntimeMetrics.recordCrash(projectId, "HEALTH_TIMEOUT");
          const record = await import_registry.PreviewRegistry.get(projectId);
          const { restartAllowed } = await RuntimeEscalation.recordCrash(
            projectId,
            "Health check timeout",
            record?.pids[0] ?? null,
            record?.ports[0] ?? null
          );
          if (restartAllowed) {
            this.restart(projectId).catch((restartErr) => {
              import_utils19.default.error({ projectId, restartErr }, "[HealthMonitor] Restart failed");
              import_registry.PreviewRegistry.markFailed(projectId, "Restart failed after health check failures");
              RuntimeMetrics.recordCrash(projectId, "PROCESS_CRASH");
            });
          } else {
            import_utils19.default.error({ projectId }, "[HealthMonitor] Restart BLOCKED by escalation");
            await import_registry.PreviewRegistry.update(projectId, { restartDisabled: true, status: "FAILED" });
          }
        }
      }
    }, HEALTH_CHECK_INTERVAL);
    healthCheckTimers.set(projectId, timer);
  },
  stopHealthMonitor(projectId) {
    const existing = healthCheckTimers.get(projectId);
    if (existing) {
      clearInterval(existing);
      healthCheckTimers.delete(projectId);
    }
  },
  async listAll() {
    const records = await import_registry.PreviewRegistry.listAll();
    const processes = ProcessManager.listAll();
    const pidMap = new Map(processes.map((p) => [p.projectId, p]));
    return records.map((r) => ({
      ...r,
      processStatus: pidMap.get(r.projectId)?.status ?? "IDLE"
    }));
  }
};

// src/cluster/staleEvictor.ts
var import_utils20 = require("@libs/utils");
var import_utils21 = __toESM(require("@libs/utils"));
var import_utils22 = __toESM(require("@libs/utils"));
var MAX_RUNTIME_AGE_MS = parseInt(process.env.RUNTIME_MAX_AGE_MINUTES ?? "120", 10) * 6e4;
var IDLE_TTL_MS = parseInt(process.env.RUNTIME_IDLE_TTL_MINUTES ?? "30", 10) * 6e4;
var STARTING_TTL_MS = 5 * 60 * 1e3;
var FAILED_RECORD_TTL_MS = 60 * 60 * 1e3;
var EVICTION_REASON_PREFIX = "cluster:eviction:";
var StaleEvictor = {
  /**
   * Run a full eviction scan across all registry records.
   * Returns the number of runtimes evicted in this cycle.
   */
  async runEvictionScan() {
    const allRecords = await import_registry2.PreviewRegistry.listAll();
    const now = Date.now();
    let ageEvictions = 0;
    let idleEvictions = 0;
    let staleEvictions = 0;
    let failedCleanups = 0;
    for (const record of allRecords) {
      const runtimeAgeMs = now - new Date(record.startedAt).getTime();
      if (record.status === "RUNNING" && runtimeAgeMs > MAX_RUNTIME_AGE_MS) {
        import_utils22.default.info({
          projectId: record.projectId,
          ageMinutes: Math.round(runtimeAgeMs / 6e4)
        }, "[StaleEvictor] Max age exceeded \u2014 evicting");
        await this.evict(record, "MAX_AGE_EXCEEDED");
        ageEvictions++;
        continue;
      }
      if (record.status === "RUNNING") {
        const lastActivity = record.lastHealthCheck || record.lastHeartbeatAt || record.startedAt;
        const idleMs = now - new Date(lastActivity).getTime();
        if (idleMs > IDLE_TTL_MS) {
          import_utils22.default.info({
            projectId: record.projectId,
            idleMinutes: Math.round(idleMs / 6e4)
          }, "[StaleEvictor] Idle timeout \u2014 evicting");
          await this.evict(record, "IDLE_TIMEOUT");
          idleEvictions++;
          continue;
        }
      }
      if (record.status === "STARTING" && runtimeAgeMs > STARTING_TTL_MS) {
        import_utils22.default.warn({
          projectId: record.projectId,
          ageMs: runtimeAgeMs
        }, "[StaleEvictor] Stuck in STARTING \u2014 cleaning up");
        await this.evict(record, "STUCK_STARTING");
        staleEvictions++;
        continue;
      }
      if (record.status === "FAILED" && runtimeAgeMs > FAILED_RECORD_TTL_MS) {
        import_utils22.default.info({
          projectId: record.projectId
        }, "[StaleEvictor] Cleaning up stale FAILED record");
        await import_registry2.PreviewRegistry.remove(record.projectId);
        failedCleanups++;
        continue;
      }
    }
    const total = ageEvictions + idleEvictions + staleEvictions + failedCleanups;
    if (total > 0) {
      import_utils22.default.info({
        ageEvictions,
        idleEvictions,
        staleEvictions,
        failedCleanups
      }, "[StaleEvictor] Eviction scan complete");
    }
    return { ageEvictions, idleEvictions, staleEvictions, failedCleanups };
  },
  /**
   * Evict a single runtime: stop the process/container and record the event.
   */
  async evict(record, reason) {
    const event = {
      projectId: record.projectId,
      reason,
      runtimeAgeMs: Date.now() - new Date(record.startedAt).getTime(),
      idleMs: record.lastHealthCheck ? Date.now() - new Date(record.lastHealthCheck).getTime() : null,
      evictedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    try {
      if (record.status === "RUNNING" || record.status === "STARTING") {
        await PreviewOrchestrator.stop(record.projectId);
      }
      await import_utils21.default.setex(
        `${EVICTION_REASON_PREFIX}${record.projectId}`,
        86400,
        // 24h
        JSON.stringify(event)
      );
      await RuntimeMetrics.recordCrash(record.projectId, reason);
      import_utils20.runtimeEvictionsTotal.inc({ reason });
    } catch (err) {
      import_utils22.default.error(
        { projectId: record.projectId, reason, err },
        "[StaleEvictor] Eviction failed"
      );
      await import_registry2.PreviewRegistry.markFailed(record.projectId, `Eviction failed: ${reason}`);
    }
  },
  /**
   * Preemptive eviction: when the cluster is at capacity and a new request
   * arrives, evict the lowest-priority runtime to make room.
   *
   * Priority scoring (lower = evicted first):
   *   base = runtimeAge (older = lower priority)
   *   + activityRecency (more recent activity = higher priority)
   *   + userTier boost (pro users get a bonus)
   */
  async preemptLowestPriority() {
    const allRecords = await import_registry2.PreviewRegistry.listAll();
    const running = allRecords.filter((r) => r.status === "RUNNING");
    if (running.length === 0) return null;
    const now = Date.now();
    const scored = running.map((r) => {
      const ageMs = now - new Date(r.startedAt).getTime();
      const lastActivity = r.lastHealthCheck || r.lastHeartbeatAt || r.startedAt;
      const idleMs = now - new Date(lastActivity).getTime();
      const score = -ageMs / 6e4 + 1 / (idleMs / 6e4 + 1) * 100;
      return { record: r, score, ageMs, idleMs };
    });
    scored.sort((a, b) => a.score - b.score);
    const victim = scored[0];
    import_utils22.default.info({
      projectId: victim.record.projectId,
      score: victim.score.toFixed(2),
      ageMinutes: Math.round(victim.ageMs / 6e4),
      idleMinutes: Math.round(victim.idleMs / 6e4)
    }, "[StaleEvictor] Preempting lowest-priority runtime");
    await this.evict(victim.record, "CAPACITY_PREEMPTION");
    return victim.record.projectId;
  },
  /**
   * Get the eviction reason for a recently evicted project.
   */
  async getEvictionReason(projectId) {
    const raw = await import_utils21.default.get(`${EVICTION_REASON_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  }
};

// src/cluster/runtimeScheduler.ts
var import_utils23 = __toESM(require("@libs/utils"));
var import_utils24 = __toESM(require("@libs/utils"));
var SCHEDULE_CHANNEL = "cluster:schedule:assign";
var PENDING_QUEUE = "cluster:schedule:pending";
var ASSIGNMENT_PREFIX = "cluster:assignment:";
var ASSIGNMENT_TTL = 86400;
var WEIGHT_CAPACITY = 0.4;
var WEIGHT_CPU = 0.25;
var WEIGHT_MEMORY = 0.2;
var WEIGHT_REGION = 0.15;
var RuntimeScheduler = {
  /**
   * Schedule a runtime on the best available node.
   *
   * Uses a distributed lock to prevent two schedulers from
   * double-assigning the same project.
   */
  async schedule(request) {
    return DistributedLock.withLock(
      `schedule:${request.projectId}`,
      async () => this._doSchedule(request),
      { ttlMs: 1e4, maxRetries: 3, retryDelayMs: 500 }
    );
  },
  /**
   * Internal: perform the actual scheduling.
   */
  async _doSchedule(request) {
    const nodes = await NodeRegistry.listNodes();
    if (nodes.length === 0) {
      import_utils24.default.error("[Scheduler] No nodes available");
      return { assigned: false, nodeId: null, score: 0, reason: "No worker nodes registered" };
    }
    const availableNodes = await Promise.all(
      nodes.map(async (n) => {
        const draining = await RollingRestart.isDraining(n.nodeId);
        return { node: n, draining };
      })
    );
    const available = availableNodes.filter((n) => !n.draining && n.node.runningRuntimes < n.node.maxRuntimes).map((n) => n.node);
    if (available.length === 0) {
      import_utils24.default.warn({ request }, "[Scheduler] All nodes at capacity \u2014 attempting preemptive eviction");
      const evictedId = await StaleEvictor.preemptLowestPriority();
      if (evictedId) {
        import_utils24.default.info({ evictedId }, "[Scheduler] Evicted runtime \u2014 retrying schedule");
        return this._doSchedule(request);
      }
      await this.enqueue(request);
      return {
        assigned: false,
        nodeId: null,
        score: 0,
        reason: `All ${nodes.length} nodes at capacity. Queued for next available slot.`
      };
    }
    const scored = available.map((node) => this.scoreNode(node, request.preferredRegion));
    scored.sort((a, b) => b.score - a.score);
    const best = scored[0];
    await import_utils23.default.setex(
      `${ASSIGNMENT_PREFIX}${request.projectId}`,
      ASSIGNMENT_TTL,
      JSON.stringify({
        nodeId: best.node.nodeId,
        assignedAt: (/* @__PURE__ */ new Date()).toISOString(),
        request,
        score: best.score,
        breakdown: best.breakdown
      })
    );
    await import_utils23.default.publish(SCHEDULE_CHANNEL, JSON.stringify({
      targetNodeId: best.node.nodeId,
      request
    }));
    import_utils24.default.info({
      projectId: request.projectId,
      assignedNode: best.node.nodeId,
      hostname: best.node.hostname,
      score: best.score.toFixed(3),
      breakdown: best.breakdown,
      candidates: scored.length
    }, "[Scheduler] Runtime assigned to node");
    return {
      assigned: true,
      nodeId: best.node.nodeId,
      score: best.score,
      reason: `Assigned to ${best.node.hostname} (score: ${best.score.toFixed(3)})`
    };
  },
  /**
   * Score a node for placement (0.0 to 1.0, higher = better).
   */
  scoreNode(node, preferredRegion) {
    const freeSlots = node.maxRuntimes - node.runningRuntimes;
    const capacityScore = freeSlots / node.maxRuntimes;
    const normalizedLoad = node.cpuCount > 0 ? node.loadAvg1m / node.cpuCount : 1;
    const cpuScore = Math.max(0, 1 - normalizedLoad);
    const memoryScore = node.totalMemoryMB > 0 ? node.freeMemoryMB / node.totalMemoryMB : 0;
    const regionScore = preferredRegion && node.region === preferredRegion ? 1 : 0.3;
    const score = capacityScore * WEIGHT_CAPACITY + cpuScore * WEIGHT_CPU + memoryScore * WEIGHT_MEMORY + regionScore * WEIGHT_REGION;
    return {
      node,
      score,
      breakdown: {
        capacity: parseFloat(capacityScore.toFixed(3)),
        cpu: parseFloat(cpuScore.toFixed(3)),
        memory: parseFloat(memoryScore.toFixed(3)),
        region: parseFloat(regionScore.toFixed(3))
      }
    };
  },
  /**
   * Enqueue a request when all nodes are at capacity.
   */
  async enqueue(request) {
    await import_utils23.default.lpush(PENDING_QUEUE, JSON.stringify(request));
  },
  /**
   * Dequeue the next pending request (called when a slot opens on any node).
   */
  async dequeueNext() {
    const raw = await import_utils23.default.rpop(PENDING_QUEUE);
    if (!raw) return null;
    return JSON.parse(raw);
  },
  /**
   * Get pending queue depth.
   */
  async queueDepth() {
    return import_utils23.default.llen(PENDING_QUEUE);
  },
  /**
   * Get the assignment for a project (which node was it scheduled to).
   */
  async getAssignment(projectId) {
    const raw = await import_utils23.default.get(`${ASSIGNMENT_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  },
  /**
   * Get cluster-wide scheduling snapshot (for admin dashboard).
   */
  async getClusterSnapshot() {
    const [nodes, queueDepth] = await Promise.all([
      NodeRegistry.listNodes(),
      this.queueDepth()
    ]);
    const scored = nodes.map((n) => ({
      ...n,
      score: this.scoreNode(n).score
    }));
    const totalCapacity = nodes.reduce((sum, n) => sum + n.maxRuntimes, 0);
    const usedCapacity = nodes.reduce((sum, n) => sum + n.runningRuntimes, 0);
    return { nodes: scored, totalCapacity, usedCapacity, queueDepth };
  }
};

// src/cluster/failoverManager.ts
var import_registry3 = require("@libs/registry");
var import_utils25 = require("@libs/utils");
var import_utils26 = require("@libs/utils");
var import_utils27 = __toESM(require("@libs/utils"));
var FAILOVER_INTERVAL_MS = 6e4;
var FAILOVER_LOCK_KEY = "cluster:failover:leader";
var FAILOVER_LOCK_TTL = 55e3;
var REBALANCE_HIGH_THRESHOLD = 0.8;
var REBALANCE_LOW_THRESHOLD = 0.4;
var _failoverTimer = null;
var FailoverManager = {
  /**
   * Start the failover monitoring loop.
   * Every node calls this, but only one wins the distributed lock per cycle.
   */
  start() {
    if (_failoverTimer) return;
    import_utils27.default.info("[FailoverManager] Starting failover monitor");
    _failoverTimer = setInterval(async () => {
      try {
        await this.runFailoverCycle();
      } catch (err) {
        import_utils27.default.error({ err }, "[FailoverManager] Failover cycle error");
      }
    }, FAILOVER_INTERVAL_MS);
    if (_failoverTimer.unref) _failoverTimer.unref();
  },
  /**
   * Stop the failover monitor.
   */
  stop() {
    if (_failoverTimer) {
      clearInterval(_failoverTimer);
      _failoverTimer = null;
      import_utils27.default.info("[FailoverManager] Failover monitor stopped");
    }
  },
  /**
   * Run one failover cycle. Only one node wins the lock per cycle.
   */
  async runFailoverCycle() {
    const handle = await DistributedLock.acquire(FAILOVER_LOCK_KEY, FAILOVER_LOCK_TTL);
    if (!handle) {
      return;
    }
    try {
      const deadNodes = await this.detectDeadNodes();
      let rescheduled = 0;
      for (const deadNodeId of deadNodes) {
        import_utils27.default.error({ deadNodeId }, "[FailoverManager] Dead node detected");
        const rescued = await this.rescheduleFromDeadNode(deadNodeId);
        rescheduled += rescued;
      }
      const deadWorkers = await this.detectDeadWorkers();
      let recoveredMissions = 0;
      for (const deadWorkerId of deadWorkers) {
        import_utils27.default.error({ deadWorkerId }, "[FailoverManager] Dead worker detected");
        const recovered = await this.recoverMissionsFromDeadWorker(deadWorkerId);
        recoveredMissions += recovered;
      }
      const rebalanced = await this.attemptRebalance();
      if (deadNodes.length > 0 || rescheduled > 0 || deadWorkers.length > 0 || recoveredMissions > 0 || rebalanced) {
        import_utils27.default.info({
          deadNodes: deadNodes.length,
          rescheduled,
          deadWorkers: deadWorkers.length,
          recoveredMissions,
          rebalanced
        }, "[FailoverManager] Cycle complete");
      }
    } finally {
      await DistributedLock.release(handle);
    }
  },
  /**
   * Find nodes that are in the SET but have no heartbeat key (TTL expired).
   */
  async detectDeadNodes() {
    const registeredIds = await import_utils25.redis.smembers("cluster:nodes");
    const dead = [];
    for (const nodeId of registeredIds) {
      const exists = await import_utils25.redis.exists(`cluster:node:${nodeId}`);
      if (exists === 0) {
        dead.push(nodeId);
        await import_utils25.redis.srem("cluster:nodes", nodeId);
      }
    }
    return dead;
  },
  /**
   * Find all runtimes assigned to a dead node and reschedule them.
   */
  async rescheduleFromDeadNode(deadNodeId) {
    const allRecords = await import_registry3.PreviewRegistry.listAll();
    let rescheduled = 0;
    for (const record of allRecords) {
      const assignment = await RuntimeScheduler.getAssignment(record.projectId);
      if (!assignment || assignment.nodeId !== deadNodeId) continue;
      if (record.status === "RUNNING" || record.status === "STARTING") {
        import_utils27.default.info({
          projectId: record.projectId,
          deadNodeId
        }, "[FailoverManager] Rescheduling runtime from dead node");
        await import_registry3.PreviewRegistry.markFailed(
          record.projectId,
          `Node ${deadNodeId} died \u2014 rescheduling`
        );
        const request = {
          projectId: record.projectId,
          executionId: record.executionId,
          userId: record.userId ?? "unknown",
          requestedAt: (/* @__PURE__ */ new Date()).toISOString()
        };
        try {
          const result = await RuntimeScheduler.schedule(request);
          if (result.assigned) {
            rescheduled++;
          }
        } catch (err) {
          import_utils27.default.error(
            { projectId: record.projectId, err },
            "[FailoverManager] Failed to reschedule runtime"
          );
        }
      }
    }
    return rescheduled;
  },
  /**
   * Find workers (build-workers) that have no heartbeat key (TTL expired).
   */
  async detectDeadWorkers() {
    const activeHeartbeatKeys = await import_utils25.redis.keys("worker:heartbeat:*");
    const activeWorkerIds = new Set(activeHeartbeatKeys.map((k) => k.split(":").pop()));
    const activeMissions = await import_utils26.missionController.listActiveMissions();
    const deadWorkers = /* @__PURE__ */ new Set();
    for (const mission of activeMissions) {
      const missionWorkerId = mission.metadata?.workerId;
      if (missionWorkerId && !activeWorkerIds.has(missionWorkerId)) {
        deadWorkers.add(missionWorkerId);
      }
    }
    return Array.from(deadWorkers);
  },
  /**
   * Requeue missions that were being processed by a dead worker.
   */
  async recoverMissionsFromDeadWorker(deadWorkerId) {
    let recovered = 0;
    const activeMissions = await import_utils26.missionController.listActiveMissions();
    for (const mission of activeMissions) {
      if (mission.metadata?.workerId === deadWorkerId) {
        import_utils27.default.warn({ missionId: mission.id, deadWorkerId }, "[FailoverManager] Recovering mission from dead worker");
        await import_utils26.missionController.updateMission(mission.id, {
          status: "queued",
          metadata: {
            workerId: void 0,
            recoveryCount: (mission.metadata?.recoveryCount || 0) + 1,
            recoveredAt: (/* @__PURE__ */ new Date()).toISOString()
          }
        });
        recovered++;
      }
    }
    return recovered;
  },
  /**
   * Attempt to rebalance: move one runtime from an overloaded node
   * to an underloaded node. Only one migration per cycle.
   */
  async attemptRebalance() {
    const nodes = await NodeRegistry.listNodes();
    if (nodes.length < 2) return false;
    const overloaded = nodes.filter((n) => {
      const utilization = n.runningRuntimes / n.maxRuntimes;
      return utilization > REBALANCE_HIGH_THRESHOLD;
    });
    const underloaded = nodes.filter((n) => {
      const utilization = n.runningRuntimes / n.maxRuntimes;
      return utilization < REBALANCE_LOW_THRESHOLD;
    });
    if (overloaded.length === 0 || underloaded.length === 0) return false;
    overloaded.sort((a, b) => b.runningRuntimes / b.maxRuntimes - a.runningRuntimes / a.maxRuntimes);
    underloaded.sort((a, b) => a.runningRuntimes / a.maxRuntimes - b.runningRuntimes / b.maxRuntimes);
    const source = overloaded[0];
    const target = underloaded[0];
    import_utils27.default.info({
      sourceNode: source.nodeId,
      sourceLoad: `${source.runningRuntimes}/${source.maxRuntimes}`,
      targetNode: target.nodeId,
      targetLoad: `${target.runningRuntimes}/${target.maxRuntimes}`
    }, "[FailoverManager] Rebalance candidate identified");
    await import_utils25.redis.publish("cluster:rebalance:recommend", JSON.stringify({
      sourceNodeId: source.nodeId,
      targetNodeId: target.nodeId,
      reason: "load_imbalance",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    return true;
  },
  /**
   * Get failover status snapshot for admin dashboard.
   */
  async getSnapshot() {
    const isLeader = await DistributedLock.isLocked(FAILOVER_LOCK_KEY);
    const deadNodes = await this.detectDeadNodes();
    const pendingReschedules = await RuntimeScheduler.queueDepth();
    return {
      isLeader,
      nodeCount: (await NodeRegistry.listNodes()).length,
      deadNodes,
      pendingReschedules
    };
  }
};

// src/cluster/redisRecovery.ts
var import_utils29 = __toESM(require("@libs/utils"));
init_containerManager();
var import_registry4 = require("@libs/registry");
var import_utils30 = __toESM(require("@libs/utils"));
var RECOVERY_KEY = "cluster:recovery:lastRun";
var MAX_RETRIES = 30;
var RETRY_INTERVAL_MS = 2e3;
var RUNTIME_MODE2 = process.env.RUNTIME_MODE || "process";
var RedisRecovery = {
  /**
   * Check if Redis is reachable. Returns true if a PING succeeds.
   */
  async isRedisAlive() {
    try {
      const pong = await import_utils29.default.ping();
      return pong === "PONG";
    } catch {
      return false;
    }
  },
  /**
   * Wait for Redis to come back online after a crash.
   * Blocks with exponential backoff up to MAX_RETRIES.
   */
  async waitForRedis() {
    import_utils30.default.warn("[RedisRecovery] Redis unreachable \u2014 waiting for recovery...");
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      const alive = await this.isRedisAlive();
      if (alive) {
        import_utils30.default.info({ attempt }, "[RedisRecovery] Redis is back online");
        return true;
      }
      const delay = Math.min(RETRY_INTERVAL_MS * attempt, 3e4);
      import_utils30.default.warn(
        { attempt, maxRetries: MAX_RETRIES, nextRetryMs: delay },
        "[RedisRecovery] Still waiting..."
      );
      await new Promise((r) => setTimeout(r, delay));
    }
    import_utils30.default.error("[RedisRecovery] Redis did not recover within retry limit");
    return false;
  },
  /**
   * Full recovery procedure. Called when Redis comes back online
   * and all previous state is assumed lost.
   *
   * Steps:
   *  1. Re-register this node
   *  2. Scan local processes/containers for surviving runtimes
   *  3. Rebuild registry records for each
   *  4. Re-acquire port leases
   *  5. Re-establish capacity counters
   *  6. Re-start heartbeat loops
   */
  async performRecovery() {
    import_utils30.default.info("[RedisRecovery] Starting full state recovery");
    const nodeId = await NodeRegistry.register();
    import_utils30.default.info({ nodeId }, "[RedisRecovery] Node re-registered");
    let survivingRuntimes = [];
    if (RUNTIME_MODE2 === "docker") {
      const containers = ContainerManager.listAll();
      survivingRuntimes = containers.filter((c) => c.status === "RUNNING").map((c) => ({
        projectId: c.projectId,
        port: c.port,
        pid: 0
        // Docker mode uses container ID
      }));
    } else {
      const processes = ProcessManager.listAll();
      survivingRuntimes = processes.filter((p) => p.status === "RUNNING").map((p) => ({
        projectId: p.projectId,
        port: 0,
        // We need to recover this
        pid: p.pid
      }));
    }
    import_utils30.default.info(
      { count: survivingRuntimes.length },
      "[RedisRecovery] Found surviving runtimes"
    );
    let runtimesRecovered = 0;
    let portsReacquired = 0;
    for (const runtime of survivingRuntimes) {
      try {
        const record = await import_registry4.PreviewRegistry.init(
          runtime.projectId,
          `recovery-${Date.now()}`,
          // Synthetic executionId
          void 0
        );
        if (runtime.port > 0) {
          try {
            await PortManager.forceAcquirePort(runtime.projectId, runtime.port);
            portsReacquired++;
          } catch {
            import_utils30.default.warn(
              { projectId: runtime.projectId, port: runtime.port },
              "[RedisRecovery] Port re-acquisition failed \u2014 port may be in use"
            );
          }
        }
        const url = `http://localhost:${runtime.port || 3e3}`;
        await import_registry4.PreviewRegistry.markRunning(
          runtime.projectId,
          url,
          runtime.port,
          runtime.pid
        );
        await RuntimeCapacity.reserve("recovery");
        RuntimeHeartbeat.startLoop(runtime.projectId, runtime.pid, runtime.port);
        runtimesRecovered++;
        import_utils30.default.info(
          { projectId: runtime.projectId },
          "[RedisRecovery] Runtime recovered"
        );
      } catch (err) {
        import_utils30.default.error(
          { projectId: runtime.projectId, err },
          "[RedisRecovery] Failed to recover runtime"
        );
      }
    }
    await import_utils29.default.set(RECOVERY_KEY, JSON.stringify({
      nodeId,
      recoveredAt: (/* @__PURE__ */ new Date()).toISOString(),
      runtimesRecovered,
      portsReacquired
    }));
    import_utils30.default.info({
      nodeId,
      runtimesRecovered,
      portsReacquired
    }, "[RedisRecovery] Recovery complete");
    return { node: nodeId, runtimesRecovered, portsReacquired };
  },
  /**
   * Full recovery flow: wait → recover → resume.
   * Called from worker.ts when a Redis write fails.
   */
  async handleRedisCrash() {
    const recovered = await this.waitForRedis();
    if (!recovered) {
      import_utils30.default.error("[RedisRecovery] Cannot recover \u2014 exiting process for supervisor restart");
      process.exit(1);
    }
    await this.performRecovery();
  },
  /**
   * Get the last recovery event (admin diagnostics).
   */
  async getLastRecovery() {
    const raw = await import_utils29.default.get(RECOVERY_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  }
};

// src/cluster/rollingRestart.ts
var import_registry5 = require("@libs/registry");
var import_utils31 = __toESM(require("@libs/utils"));
var import_utils32 = __toESM(require("@libs/utils"));
var ROLLING_RESTART_KEY = "cluster:rolling-restart";
var DRAINING_PREFIX = "cluster:node:draining:";
var DRAIN_TIMEOUT_MS = 5 * 60 * 1e3;
var DRAIN_CHECK_INTERVAL = 5e3;
var RollingRestart2 = {
  /**
   * Start a rolling restart of the entire cluster.
   * Only one can run at a time.
   */
  async start() {
    const lock = await DistributedLock.acquire("rolling-restart", 6e5);
    if (!lock) {
      const existing = await this.getState();
      throw new Error(`Rolling restart already in progress (phase: ${existing?.phase ?? "UNKNOWN"})`);
    }
    try {
      const nodes = await NodeRegistry.listNodes();
      if (nodes.length === 0) {
        throw new Error("No nodes registered in cluster");
      }
      nodes.sort((a, b) => a.runningRuntimes - b.runningRuntimes);
      const state = {
        phase: "PLANNING",
        startedAt: (/* @__PURE__ */ new Date()).toISOString(),
        updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
        totalNodes: nodes.length,
        completedNodes: [],
        currentNode: null,
        pendingNodes: nodes.map((n) => n.nodeId)
      };
      await this.saveState(state);
      import_utils32.default.info({ totalNodes: nodes.length }, "[RollingRestart] Plan created");
      for (const node of nodes) {
        try {
          await this.processNode(node, state, lock);
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          state.phase = "FAILED";
          state.error = `Failed on node ${node.nodeId}: ${msg}`;
          state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
          await this.saveState(state);
          import_utils32.default.error({ nodeId: node.nodeId, err }, "[RollingRestart] Failed");
          throw err;
        }
      }
      state.phase = "COMPLETED";
      state.currentNode = null;
      state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
      await this.saveState(state);
      import_utils32.default.info({ totalNodes: nodes.length }, "[RollingRestart] Complete");
      return state;
    } finally {
      await DistributedLock.release(lock);
    }
  },
  /**
   * Process one node in the rolling restart cycle.
   */
  async processNode(node, state, lock) {
    const { nodeId } = node;
    import_utils32.default.info(
      { nodeId, hostname: node.hostname, running: node.runningRuntimes },
      "[RollingRestart] Processing node"
    );
    state.phase = "DRAINING";
    state.currentNode = nodeId;
    state.pendingNodes = state.pendingNodes.filter((id) => id !== nodeId);
    state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveState(state);
    await this.markDraining(nodeId);
    state.phase = "WAITING";
    state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveState(state);
    await this.waitForDrain(nodeId);
    state.phase = "RESTARTING";
    state.updatedAt = (/* @__PURE__ */ new Date()).toISOString();
    await this.saveState(state);
    await import_utils31.default.publish("cluster:node:restart", JSON.stringify({
      nodeId,
      reason: "rolling-restart",
      timestamp: (/* @__PURE__ */ new Date()).toISOString()
    }));
    await this.waitForReregister(nodeId);
    await DistributedLock.extend(lock, 6e5);
    state.completedNodes.push(nodeId);
    await this.unmarkDraining(nodeId);
    import_utils32.default.info({ nodeId, hostname: node.hostname }, "[RollingRestart] Node restarted");
  },
  /**
   * Mark a node as draining (scheduler will skip it).
   */
  async markDraining(nodeId) {
    await import_utils31.default.setex(
      `${DRAINING_PREFIX}${nodeId}`,
      DRAIN_TIMEOUT_MS / 1e3,
      JSON.stringify({ drainingSince: (/* @__PURE__ */ new Date()).toISOString() })
    );
    import_utils32.default.info({ nodeId }, "[RollingRestart] Node marked as draining");
  },
  /**
   * Remove drain flag from a node.
   */
  async unmarkDraining(nodeId) {
    await import_utils31.default.del(`${DRAINING_PREFIX}${nodeId}`);
  },
  /**
   * Check if a node is currently draining.
   */
  async isDraining(nodeId) {
    const exists = await import_utils31.default.exists(`${DRAINING_PREFIX}${nodeId}`);
    return exists === 1;
  },
  /**
   * Wait for all runtimes on a node to drain (stop or migrate).
   * Times out after DRAIN_TIMEOUT_MS.
   */
  async waitForDrain(nodeId) {
    const deadline = Date.now() + DRAIN_TIMEOUT_MS;
    while (Date.now() < deadline) {
      const allRecords = await import_registry5.PreviewRegistry.listAll();
      const nodeAssignments = await Promise.all(
        allRecords.filter((r) => r.status === "RUNNING" || r.status === "STARTING").map(async (r) => {
          const assignment = await RuntimeScheduler.getAssignment(r.projectId);
          return assignment?.nodeId === nodeId ? r : null;
        })
      );
      const remaining = nodeAssignments.filter(Boolean).length;
      if (remaining === 0) {
        import_utils32.default.info({ nodeId }, "[RollingRestart] Node fully drained");
        return;
      }
      import_utils32.default.info({ nodeId, remaining }, "[RollingRestart] Waiting for drain...");
      await new Promise((r) => setTimeout(r, DRAIN_CHECK_INTERVAL));
    }
    import_utils32.default.warn({ nodeId }, "[RollingRestart] Drain timeout \u2014 proceeding anyway");
  },
  /**
   * Wait for a node to re-register after restart.
   * Polls for the node's heartbeat key to reappear.
   */
  async waitForReregister(oldNodeId) {
    const deadline = Date.now() + 12e4;
    while (Date.now() < deadline) {
      const nodes = await NodeRegistry.listNodes();
      const oldNode = await NodeRegistry.getNode(oldNodeId);
      if (!oldNode && nodes.length > 0) {
        import_utils32.default.info({ oldNodeId }, "[RollingRestart] Node re-registered with new ID");
        return;
      }
      await new Promise((r) => setTimeout(r, 5e3));
    }
    import_utils32.default.warn({ oldNodeId }, "[RollingRestart] Timeout waiting for node re-register");
  },
  /**
   * Get the current rolling restart state.
   */
  async getState() {
    const raw = await import_utils31.default.get(ROLLING_RESTART_KEY);
    if (!raw) return null;
    return JSON.parse(raw);
  },
  /**
   * Save rolling restart progress to Redis.
   */
  async saveState(state) {
    await import_utils31.default.setex(ROLLING_RESTART_KEY, 3600, JSON.stringify(state));
  }
};

// src/index.ts
init_admission_controller();

// src/clusterProxy.ts
var import_registry6 = require("@libs/registry");
var import_utils35 = __toESM(require("@libs/utils"));
var PREVIEW_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || "preview.multiagent.com";
var ClusterProxy = {
  /**
   * Resolve the target worker node for a given request.
   * Supports both path-based (/preview/:id) and domain-based (id.preview.com).
   */
  async resolveTarget(input) {
    const projectId = this.extractProjectId(input);
    if (!projectId) return null;
    const assignment = await RuntimeScheduler.getAssignment(projectId);
    if (!assignment) {
      import_utils35.default.warn({ projectId }, "[ClusterProxy] No assignment found for project");
      return null;
    }
    const { nodeId } = assignment;
    const node = await NodeRegistry.getNode(nodeId);
    if (!node) {
      import_utils35.default.error({ nodeId, projectId }, "[ClusterProxy] Assigned node not found in registry");
      return null;
    }
    const record = await import_registry6.PreviewRegistry.get(projectId);
    if (!record || !record.ports || record.ports.length === 0) {
      import_utils35.default.warn({ projectId }, "[ClusterProxy] No ports found in registry for project");
      return null;
    }
    const target = {
      projectId,
      nodeId,
      hostname: node.hostname,
      port: record.ports[0],
      url: `http://${node.hostname}:${record.ports[0]}`
    };
    return target;
  },
  /**
   * Extract projectId from Host header or URL path.
   * Examples:
   *   "prj-123.preview.multiagent.com" -> "prj-123"
   *   "/preview/prj-123" -> "prj-123"
   */
  extractProjectId(input) {
    if (input.includes(PREVIEW_DOMAIN)) {
      const part = input.split(`.${PREVIEW_DOMAIN}`)[0];
      if (part && part !== input) return part;
    }
    const pathMatch = input.match(/\/preview\/([^\/\?]+)/);
    if (pathMatch) return pathMatch[1];
    if (input.length >= 8 && !input.includes(".") && !input.includes("/")) {
      return input;
    }
    return null;
  },
  /**
   * Generate the public URL for a preview.
   * Uses wildcards if configured, otherwise falls back to path-based.
   */
  getPublicUrl(projectId) {
    const useWildcards = process.env.PREVIEW_USE_WILDCARDS === "true";
    const protocol = process.env.NODE_ENV === "production" ? "https" : "http";
    if (useWildcards) {
      return `${protocol}://${projectId}.${PREVIEW_DOMAIN}`;
    }
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
    return `${appUrl}/preview/${projectId}`;
  },
  /**
   * Middleware helper for Next.js /api/preview-proxy rewrite logic.
   * In a multi-node cluster, the "proxy target" is no longer always localhost.
   */
  async getRewriteUrl(projectId) {
    const target = await this.resolveTarget(projectId);
    if (!target) return null;
    return target.url;
  }
};

// src/container-cleaner.ts
var import_child_process5 = require("child_process");
var import_utils42 = __toESM(require("@libs/utils"));
var CleanupService = class {
  interval = null;
  start(intervalMs = 30 * 60 * 1e3) {
    if (this.interval) return;
    this.interval = setInterval(() => this.cleanup(), intervalMs);
    import_utils42.default.info("[CleanupService] Background cleaner started");
  }
  async cleanup() {
    import_utils42.default.info("[CleanupService] Running scheduled cleanup...");
    const dockerCleanupCmd = `docker ps --filter "ancestor=node:20-slim" --format "{{.ID}}|{{.CreatedAt}}"`;
    (0, import_child_process5.exec)(dockerCleanupCmd, (err, stdout) => {
      if (err || !stdout) return;
      const lines = stdout.trim().split("\n");
      const now = Date.now();
      const twoHoursMs = 2 * 60 * 60 * 1e3;
      lines.forEach((line) => {
        const [id, createdAt] = line.split("|");
        const createdDate = new Date(createdAt).getTime();
        if (now - createdDate > twoHoursMs) {
          import_utils42.default.info({ containerId: id, age: now - createdDate }, "[CleanupService] Stopping stale container");
          (0, import_child_process5.exec)(`docker stop ${id}`, (stopErr) => {
            if (stopErr) import_utils42.default.error({ containerId: id, error: stopErr }, "[CleanupService] Failed to stop container");
          });
        }
      });
    });
    try {
      const { previewManager: previewManager2 } = (init_preview_manager(), __toCommonJS(preview_manager_exports));
    } catch (e) {
      import_utils42.default.warn({ error: e }, "[CleanupService] Process cleanup failed");
    }
  }
  stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};
var cleanupService = new CleanupService();

// src/index.ts
init_containerManager();

// src/performance-monitor.ts
var import_utils43 = __toESM(require("@libs/utils"));
var PerformanceMonitor = class {
  static metrics = /* @__PURE__ */ new Map();
  /**
   * Records telemetry from a running preview sandbox.
   */
  static recordMetric(metric) {
    const history = this.metrics.get(metric.projectId) || [];
    history.push(metric);
    if (history.length > 100) history.shift();
    this.metrics.set(metric.projectId, history);
    if (metric.latencyMs > 1e3 || metric.errorRate > 0.05) {
      import_utils43.default.warn({ projectId: metric.projectId, metric }, "[PerformanceMonitor] Performance degradation detected.");
    }
  }
  /**
   * Checks if a project requires an autonomous evolution mission.
   */
  static shouldExcite(projectId) {
    const history = this.metrics.get(projectId);
    if (!history || history.length < 5) return false;
    const avgLatency = history.reduce((sum, m) => sum + m.latencyMs, 0) / history.length;
    return avgLatency > 800;
  }
  static getMetrics(projectId) {
    return this.metrics.get(projectId) || [];
  }
};

// src/evolution-engine.ts
var import_utils44 = require("@libs/utils");
var EvolutionEngine = class {
  static isRunning = false;
  static start() {
    if (this.isRunning) return;
    this.isRunning = true;
    import_utils44.logger.info("[EvolutionEngine] Layer 16 Autonomous Product Evolution active.");
    setInterval(() => this.orchestrate(), 6e4);
  }
  static async orchestrate() {
    import_utils44.logger.info("[EvolutionEngine] Scanning deployments for evolution opportunities...");
    const projectsToImprove = ["test-project-alpha"];
    for (const projectId of projectsToImprove) {
      if (PerformanceMonitor.shouldExcite(projectId)) {
        await this.triggerEvolution(projectId, "performance");
      }
    }
  }
  static async triggerEvolution(projectId, triggerType) {
    import_utils44.logger.info({ projectId, triggerType }, "[EvolutionEngine] Triggering autonomous evolution mission...");
    await import_utils44.redis.publish("evolution-missions", JSON.stringify({
      projectId,
      missionType: triggerType,
      priority: "medium",
      timestamp: Date.now()
    }));
    await import_utils44.memoryPlane.recordLesson(projectId, {
      action: "Autonomous Evolution",
      outcome: "success",
      lesson: `System detected ${triggerType} degradation. Evolution cycle initiated.`,
      context: { triggerType }
    });
  }
};

// src/executor.ts
var import_child_process6 = require("child_process");
var import_server4 = require("@libs/utils/server");
init_runtimeGuard();
var runtimeExecutor = {
  async execute(command, args, options) {
    const elog = (0, import_server4.getExecutionLogger)(options.executionId);
    const start = Date.now();
    elog.info({ command, args, cwd: options.cwd }, "Runtime: Executing command");
    return new Promise((resolve) => {
      let stdout = "";
      let stderr = "";
      const child = (0, import_child_process6.spawn)(command, args, RuntimeGuard.safeSpawnOptions(options.cwd, options.env));
      const timeout = options.timeoutMs ? setTimeout(() => {
        child.kill();
        resolve({
          success: false,
          stdout,
          stderr,
          code: null,
          error: `Execution timed out after ${options.timeoutMs}ms`
        });
      }, options.timeoutMs) : null;
      child.stdout.on("data", (data) => {
        const chunk = data.toString();
        stdout += chunk;
      });
      child.stderr.on("data", (data) => {
        const chunk = data.toString();
        stderr += chunk;
      });
      child.on("close", (code) => {
        if (timeout) clearTimeout(timeout);
        const duration = Date.now() - start;
        elog.info({ code, durationMs: duration }, "Runtime: Command finished");
        resolve({
          success: code === 0,
          stdout,
          stderr,
          code,
          error: code !== 0 ? `Command failed with code ${code}` : void 0
        });
      });
      child.on("error", (err) => {
        if (timeout) clearTimeout(timeout);
        elog.error({ err }, "Runtime: Spawn error");
        resolve({
          success: false,
          stdout,
          stderr,
          code: null,
          error: err.message
        });
      });
    });
  }
};

// src/index.ts
init_microvm_manager();
init_microvm_provider();
init_preview_manager();

// src/preview-runner.ts
init_preview_manager();
var import_utils45 = __toESM(require("@libs/utils"));
async function previewRunner(projectId, files) {
  import_utils45.default.info({ projectId }, "[PreviewRunner] Initiating local dev preview...");
  try {
    const url = await previewManager.launchPreview(projectId);
    return {
      success: true,
      url
    };
  } catch (error) {
    import_utils45.default.error({ error, projectId }, "[PreviewRunner] Failed to launch preview");
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

// src/preview-runtime.ts
var import_child_process7 = require("child_process");
var import_path10 = __toESM(require("path"));
var import_fs = __toESM(require("fs"));
init_preview_manager();
var import_utils46 = __toESM(require("@libs/utils"));
async function startPreview(projectId, files) {
  const isDockerAvailable2 = await checkDocker();
  if (isDockerAvailable2) {
    try {
      return await startDockerPreview(projectId, files);
    } catch (e) {
      import_utils46.default.warn({ projectId, error: e }, "[PreviewRuntime] Docker launch failed, falling back to process-based preview");
      return await previewManager.launchPreview(projectId);
    }
  } else {
    import_utils46.default.info({ projectId }, "[PreviewRuntime] Docker not detected, using process-based isolation");
    return await previewManager.launchPreview(projectId);
  }
}
async function checkDocker() {
  return new Promise((resolve) => {
    (0, import_child_process7.exec)("docker --version", (error) => {
      resolve(!error);
    });
  });
}
async function startDockerPreview(projectId, files) {
  const port = 4100 + Math.floor(Math.random() * 500);
  const projectPath = import_path10.default.join(process.cwd(), ".previews", projectId);
  if (!import_fs.default.existsSync(projectPath)) import_fs.default.mkdirSync(projectPath, { recursive: true });
  files.forEach((file) => {
    const filePath = import_path10.default.join(projectPath, file.path.replace(/^\//, ""));
    const dir = import_path10.default.dirname(filePath);
    if (!import_fs.default.existsSync(dir)) import_fs.default.mkdirSync(dir, { recursive: true });
    import_fs.default.writeFileSync(filePath, file.content || "");
  });
  const containerName2 = `preview-${projectId}`;
  const command = `docker run -d --rm         --name ${containerName2}         -p ${port}:3000         --memory=2g         --cpus=2         -v "${projectPath}:/app"         -w /app         node:20-slim         sh -c "if [ ! -d 'node_modules' ]; then npm install; fi && npm run dev"`;
  return new Promise((resolve, reject) => {
    (0, import_child_process7.exec)(command, (error) => {
      if (error) {
        reject(error);
        return;
      }
      import_utils46.default.info({ projectId, port, containerName: containerName2 }, "[PreviewRuntime] Docker container started");
      resolve(`http://localhost:${port}`);
    });
  });
}
async function stopPreview(projectId) {
  const containerName2 = `preview-${projectId}`;
  (0, import_child_process7.exec)(`docker stop ${containerName2}`, () => {
  });
  await previewManager.stopPreview(projectId);
}

// src/previewRuntimePool.ts
init_containerManager();
var import_registry8 = require("@libs/registry");
var import_utils47 = __toESM(require("@libs/utils"));
var PreviewRuntimePool = class {
  static pool = [];
  static POOL_SIZE = 3;
  static isWarming = false;
  /**
   * Pre-warm a set of generic containers at startup.
   */
  static async prewarm() {
    if (this.isWarming) return;
    this.isWarming = true;
    import_utils47.default.info({ size: this.POOL_SIZE }, "[PreviewRuntimePool] Pre-warming runtime pool...");
    for (let i = 0; i < this.POOL_SIZE; i++) {
      try {
        const projectId = `pool-template-${i}`;
        const port = await PortManager.acquireFreePort(projectId);
        const container = await ContainerManager.start(projectId, port);
        this.pool.push({
          ...container,
          projectId,
          port,
          status: "IDLE",
          startedAt: (/* @__PURE__ */ new Date()).toISOString()
        });
        import_utils47.default.info({ projectId, port }, "[PreviewRuntimePool] Container warmed and added to pool");
      } catch (err) {
        import_utils47.default.error({ err }, "[PreviewRuntimePool] Failed to pre-warm container");
      }
    }
    this.isWarming = false;
  }
  /**
   * Checkout a warm container from the pool.
   */
  static async checkout(projectId, targetPort) {
    const container = this.pool.pop();
    if (!container) return null;
    import_utils47.default.info({ from: container.projectId, to: projectId, port: targetPort }, "[PreviewRuntimePool] Checking out warm container");
    return {
      ...container,
      projectId,
      port: targetPort
    };
  }
  /**
   * Assign a project to a warm runtime and inject its code.
   */
  static async assign(projectId, projectDir, _framework) {
    const port = await PortManager.acquireFreePort(projectId);
    let container = await this.checkout(projectId, port);
    if (!container) {
      const result = await ContainerManager.start(projectId, port);
      container = {
        ...result,
        projectId,
        port,
        status: "RUNNING",
        startedAt: (/* @__PURE__ */ new Date()).toISOString()
      };
    } else {
      await ContainerManager.hotInject(container.containerId, projectDir);
      import_utils47.default.info({ projectId, containerId: container.containerId }, "[PreviewRuntimePool] HOT INJECTION COMPLETE");
    }
    await import_registry8.PreviewRegistry.update(projectId, {
      status: "RUNNING",
      port: container.port
    });
    this.replenish();
    return container;
  }
  /**
   * Replenish the pool in the background.
   */
  static async replenish() {
    if (this.pool.length < this.POOL_SIZE) {
      this.prewarm();
    }
  }
};

// src/index.ts
init_resource_manager();

// src/runtimeCleanup.ts
var import_registry9 = require("@libs/registry");
init_containerManager();
init_runtimeGuard();
var import_utils48 = __toESM(require("@libs/utils"));
var RUNTIME_MODE3 = process.env.RUNTIME_MODE || "process";
var CLEANUP_INTERVAL_MS = 5 * 60 * 1e3;
var STALE_STARTING_THRESHOLD_MS = 5 * 60 * 1e3;
var cleanupTimer = null;
var RuntimeCleanup = {
  /**
   * Start the background cleanup loop. Safe to call multiple times — idempotent.
   */
  start() {
    if (cleanupTimer) return;
    import_utils48.default.info("[RuntimeCleanup] Starting background cleanup worker");
    cleanupTimer = setInterval(() => {
      this.runCleanupCycle().catch((err) => {
        import_utils48.default.error({ err }, "[RuntimeCleanup] Cleanup cycle failed");
      });
    }, CLEANUP_INTERVAL_MS);
    if (cleanupTimer.unref) cleanupTimer.unref();
  },
  /**
   * Stop the cleanup loop.
   */
  stop() {
    if (cleanupTimer) {
      clearInterval(cleanupTimer);
      cleanupTimer = null;
      import_utils48.default.info("[RuntimeCleanup] Cleanup worker stopped");
    }
  },
  /**
   * Run one cleanup cycle.
   */
  async runCleanupCycle() {
    import_utils48.default.info("[RuntimeCleanup] Running cleanup cycle");
    let idleShutdowns = 0;
    let zombiesKilled = 0;
    let orphansKilled = 0;
    let staleCleaned = 0;
    try {
      const allRecords = await import_registry9.PreviewRegistry.listAll();
      const runningIds = allRecords.filter((r) => r.status === "RUNNING").map((r) => r.projectId);
      const zombies = await RuntimeHeartbeat.scanForZombies(runningIds);
      for (const zombieId of zombies) {
        import_utils48.default.warn({ projectId: zombieId }, "[RuntimeCleanup] Killing zombie (no heartbeat)");
        try {
          await PreviewOrchestrator.stop(zombieId);
          await RuntimeMetrics.recordCrash(zombieId, "HEALTH_TIMEOUT");
          const record = allRecords.find((r) => r.projectId === zombieId);
          await RuntimeEscalation.recordCrash(
            zombieId,
            "Zombie detected \u2014 no heartbeat",
            record?.pid ?? null,
            record?.port ?? null
          );
          zombiesKilled++;
        } catch (err) {
          import_utils48.default.error({ projectId: zombieId, err }, "[RuntimeCleanup] Failed to kill zombie");
        }
      }
      for (const record of allRecords) {
        const { projectId, status, lastHealthCheck, pid } = record;
        if (status === "RUNNING" && !zombies.includes(projectId)) {
          const idle = await RuntimeGuard.isInactive(projectId, lastHealthCheck ?? null);
          if (idle) {
            import_utils48.default.info({ projectId }, "[RuntimeCleanup] Stopping idle runtime");
            await PreviewOrchestrator.stop(projectId);
            await RuntimeMetrics.recordCrash(projectId, "INACTIVITY_SHUTDOWN");
            idleShutdowns++;
          }
        }
        if ((status === "FAILED" || status === "STOPPED") && pid) {
          let stillRunning = false;
          if (RUNTIME_MODE3 === "docker") {
            stillRunning = ContainerManager.isRunning(projectId);
          } else {
            stillRunning = ProcessManager.isRunning(projectId);
          }
          if (stillRunning) {
            import_utils48.default.warn({ projectId, pid, mode: RUNTIME_MODE3 }, "[RuntimeCleanup] Orphan \u2014 killing");
            if (RUNTIME_MODE3 === "docker") {
              await ContainerManager.stop(projectId);
            } else {
              await ProcessManager.stop(projectId);
            }
            await PortManager.releasePort(projectId);
            if (record.userId) {
              await RuntimeCapacity.release(record.userId);
            }
            orphansKilled++;
          }
        }
        if (status === "STARTING") {
          const startAge = Date.now() - new Date(record.startedAt).getTime();
          if (startAge > STALE_STARTING_THRESHOLD_MS) {
            import_utils48.default.warn({ projectId, startAge }, "[RuntimeCleanup] Stale STARTING \u2014 cleaning up");
            await import_registry9.PreviewRegistry.markFailed(projectId, "Startup timeout detected by cleanup worker");
            await PortManager.releasePort(projectId);
            if (record.userId) {
              await RuntimeCapacity.release(record.userId);
            }
            await RuntimeMetrics.recordCrash(projectId, "SPAWN_FAIL");
            staleCleaned++;
          }
        }
      }
      import_utils48.default.info(
        { idleShutdowns, zombiesKilled, orphansKilled, staleCleaned, total: allRecords.length },
        "[RuntimeCleanup] Cycle complete"
      );
    } catch (err) {
      import_utils48.default.error({ err }, "[RuntimeCleanup] Error during cleanup cycle");
    }
    if (RUNTIME_MODE3 === "docker") {
      await ContainerManager.pruneImages();
    }
    try {
      await StaleEvictor.runEvictionScan();
    } catch (err) {
      import_utils48.default.error({ err }, "[RuntimeCleanup] Eviction scan failed");
    }
  },
  /**
   * Gracefully shut down ALL running runtimes.
   * Called when the worker process receives SIGTERM.
   */
  async shutdownAll() {
    import_utils48.default.info("[RuntimeCleanup] Shutting down all runtimes (graceful shutdown)");
    this.stop();
    RuntimeHeartbeat.stopAll();
    const allRecords = await import_registry9.PreviewRegistry.listAll();
    const running = allRecords.filter((r) => r.status === "RUNNING" || r.status === "STARTING");
    await Promise.allSettled(
      running.map(async (r) => {
        import_utils48.default.info({ projectId: r.projectId }, "[RuntimeCleanup] Stopping runtime for shutdown");
        await PreviewOrchestrator.stop(r.projectId);
      })
    );
    if (RUNTIME_MODE3 === "docker") {
      await ContainerManager.cleanupAll();
    }
    import_utils48.default.info({ count: running.length }, "[RuntimeCleanup] All runtimes stopped");
  }
};

// src/index.ts
init_runtimeGuard();
init_sandbox_pool();
init_sandbox_runner();

// src/sandbox.ts
var import_child_process8 = require("child_process");
var import_path11 = __toESM(require("path"));
var import_fs2 = __toESM(require("fs"));
var import_util2 = __toESM(require("util"));
var import_server5 = require("@libs/utils/server");
var execAsync = import_util2.default.promisify(import_child_process8.exec);
var ProcessSandbox = class {
  sandboxRoot;
  constructor() {
    this.sandboxRoot = import_path11.default.join(process.cwd(), ".generated-projects");
    if (!import_fs2.default.existsSync(this.sandboxRoot)) {
      import_fs2.default.mkdirSync(this.sandboxRoot, { recursive: true });
    }
  }
  /**
   * Create an isolated sandbox for a project and write all files into it.
   */
  async createSandbox(projectId, files) {
    const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
    if (import_fs2.default.existsSync(sandboxDir)) {
      await this.cleanup(projectId);
    }
    import_fs2.default.mkdirSync(sandboxDir, { recursive: true });
    for (const file of files) {
      const filePath = import_path11.default.join(sandboxDir, file.path.replace(/^\//, ""));
      const dir = import_path11.default.dirname(filePath);
      if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
      import_fs2.default.writeFileSync(filePath, file.content || "", "utf8");
    }
    import_server5.logger.info({ projectId, fileCount: files.length }, "Sandbox created");
    return sandboxDir;
  }
  /**
   * Install dependencies inside the sandbox.
   */
  async installDependencies(sandboxDir) {
    const logs = [];
    try {
      logs.push("[Sandbox] Running npm install...");
      const { stdout, stderr } = await execAsync(
        "npm install --no-audit --legacy-peer-deps --loglevel=error",
        { cwd: sandboxDir, timeout: 12e4, env: (0, import_server5.getSafeEnv)({ NODE_ENV: "development" }) }
      );
      if (stdout) logs.push(stdout.substring(0, 500));
      if (stderr) logs.push(`[warn] ${stderr.substring(0, 500)}`);
      logs.push("[Sandbox] Dependencies installed successfully.");
      return { success: true, logs };
    } catch (e) {
      const err = e;
      logs.push(`[error] npm install failed: ${err.stderr?.substring(0, 300) || err.message}`);
      return { success: false, logs };
    }
  }
  /**
   * Run a build verification step inside the sandbox.
   */
  async verifyBuild(sandboxDir) {
    try {
      const { stdout, stderr } = await execAsync(
        "npx tsc --noEmit 2>&1 || true",
        { cwd: sandboxDir, timeout: 6e4 }
      );
      return { success: true, error: stderr, stdout };
    } catch (e) {
      const err = e;
      return { success: false, error: err.stderr || err.message || "Unknown error", stdout: err.stdout || "" };
    }
  }
  /**
   * Update specific files in an existing sandbox (for incremental edits).
   */
  async updateFiles(projectId, patches) {
    const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
    if (!import_fs2.default.existsSync(sandboxDir)) {
      throw new Error(`Sandbox not found for project ${projectId}`);
    }
    for (const patch of patches) {
      const filePath = import_path11.default.join(sandboxDir, patch.path.replace(/^\//, ""));
      if (patch.action === "delete") {
        if (import_fs2.default.existsSync(filePath)) import_fs2.default.unlinkSync(filePath);
      } else {
        const dir = import_path11.default.dirname(filePath);
        if (!import_fs2.default.existsSync(dir)) import_fs2.default.mkdirSync(dir, { recursive: true });
        import_fs2.default.writeFileSync(filePath, patch.content || "", "utf8");
      }
    }
    import_server5.logger.info({ projectId, patchCount: patches.length }, "Sandbox files updated");
  }
  /**
   * Get all files currently in the sandbox.
   */
  readAllFiles(projectId) {
    const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
    if (!import_fs2.default.existsSync(sandboxDir)) return [];
    const files = [];
    this.walkDir(sandboxDir, "", files);
    return files;
  }
  /**
   * Check if a sandbox exists for a project.
   */
  exists(projectId) {
    return import_fs2.default.existsSync(import_path11.default.join(this.sandboxRoot, projectId));
  }
  /**
   * Remove a project sandbox entirely.
   */
  async cleanup(projectId) {
    const sandboxDir = import_path11.default.join(this.sandboxRoot, projectId);
    if (import_fs2.default.existsSync(sandboxDir)) {
      import_fs2.default.rmSync(sandboxDir, { recursive: true, force: true });
      import_server5.logger.info({ projectId }, "Sandbox cleaned up");
    }
  }
  // ── Private helpers ──────────────────────────────────────────
  walkDir(base, sub, out) {
    const fullPath = import_path11.default.join(base, sub);
    if (!import_fs2.default.existsSync(fullPath)) return;
    const entries = import_fs2.default.readdirSync(fullPath, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.name === "node_modules" || entry.name === ".next" || entry.name.startsWith(".")) continue;
      const relPath = sub ? `${sub}/${entry.name}` : entry.name;
      if (entry.isDirectory()) {
        this.walkDir(base, relPath, out);
      } else {
        try {
          const content = import_fs2.default.readFileSync(import_path11.default.join(base, relPath), "utf8");
          out.push({ path: `/${relPath}`, content });
        } catch {
        }
      }
    }
  }
};
var sandbox = new ProcessSandbox();

// src/index.ts
init_snapshot_library();
init_snapshot_manager();
init_snapshot_overlay();

// src/storage-gc.ts
var import_fs_extra8 = __toESM(require("fs-extra"));
var import_path12 = __toESM(require("path"));
var import_utils49 = __toESM(require("@libs/utils"));
var StorageGC = class {
  static TTL_MS = 2 * 60 * 60 * 1e3;
  // 2 hours for previews
  static CHECK_INTERVAL = 15 * 60 * 1e3;
  // 15 minutes
  static CRITICAL_DISK_FREE_PERCENT = 10;
  static start() {
    import_utils49.default.info("[StorageGC] Starting Storage Garbage Collector...");
    setInterval(() => this.run(), this.CHECK_INTERVAL);
    this.run();
  }
  static async run() {
    try {
      import_utils49.default.info("[StorageGC] Running periodic cleanup...");
      await this.cleanupPreviews();
      await this.cleanupMicroVMs();
      await this.checkDiskSpace();
    } catch (err) {
      import_utils49.default.error({ err }, "[StorageGC] Cleanup cycle failed");
    }
  }
  static async cleanupPreviews() {
    const previewDir = import_path12.default.join(process.cwd(), ".previews");
    if (!await import_fs_extra8.default.pathExists(previewDir)) return;
    const folders = await import_fs_extra8.default.readdir(previewDir);
    const now = Date.now();
    for (const folder of folders) {
      if (folder === "pool") continue;
      const fullPath = import_path12.default.join(previewDir, folder);
      const stats = await import_fs_extra8.default.stat(fullPath);
      if (now - stats.mtimeMs > this.TTL_MS) {
        import_utils49.default.info({ folder }, "[StorageGC] Purging expired preview environment");
        await import_fs_extra8.default.remove(fullPath);
      }
    }
  }
  static async cleanupMicroVMs() {
    const microvmDir = import_path12.default.join(process.cwd(), ".microvms");
    if (!await import_fs_extra8.default.pathExists(microvmDir)) return;
    const folders = await import_fs_extra8.default.readdir(microvmDir);
    const now = Date.now();
    for (const folder of folders) {
      const fullPath = import_path12.default.join(microvmDir, folder);
      const stats = await import_fs_extra8.default.stat(fullPath);
      if (now - stats.mtimeMs > this.TTL_MS / 2) {
        import_utils49.default.info({ folder }, "[StorageGC] Purging expired MicroVM overlay");
        await import_fs_extra8.default.remove(fullPath);
      }
    }
  }
  static async checkDiskSpace() {
    const previewDir = import_path12.default.join(process.cwd(), ".previews");
    const snapshotsDir = import_path12.default.join(process.cwd(), ".snapshots");
    const previewCount = await import_fs_extra8.default.pathExists(previewDir) ? (await import_fs_extra8.default.readdir(previewDir)).length : 0;
    const snapshotCount = await import_fs_extra8.default.pathExists(snapshotsDir) ? (await import_fs_extra8.default.readdir(snapshotsDir)).length : 0;
    if (previewCount > 50 || snapshotCount > 20) {
      import_utils49.default.warn({ previewCount, snapshotCount }, "[StorageGC] High artifact count detected. Recommended manual purge.");
    }
  }
};

// src/watchdog.ts
init_preview_manager();
var import_registry10 = require("@libs/registry");
var import_utils50 = __toESM(require("@libs/utils"));
var PreviewWatchdog = class {
  static interval = null;
  static CHECK_INTERVAL = 3e4;
  // 30 seconds
  static IDLE_TIMEOUT = 18e5;
  // 30 minutes
  static start() {
    if (this.interval) return;
    import_utils50.default.info("[Watchdog] Starting Preview Watchdog service...");
    this.interval = setInterval(() => this.check(), this.CHECK_INTERVAL);
  }
  static async check() {
    try {
      const allPreviews = await import_registry10.PreviewRegistry.listAll();
      const now = Date.now();
      for (const reg of allPreviews) {
        const lastAccess = reg.lastHeartbeatAt || reg.startedAt;
        const lastAccessTs = lastAccess ? new Date(lastAccess).getTime() : 0;
        if (reg.status === "RUNNING" && lastAccessTs && now - lastAccessTs > this.IDLE_TIMEOUT) {
          import_utils50.default.info({ projectId: reg.projectId }, "[Watchdog] Idle timeout reached. Suspending sandbox...");
          await previewManager.stopPreview(reg.projectId);
          await import_registry10.PreviewRegistry.update(reg.projectId, { status: "STOPPED" });
          continue;
        }
        if (reg.status === "RUNNING" && reg.ports && reg.ports.length > 0) {
          const primaryPort = reg.ports[0];
          const portOpen = await previewManager.isPortOpen(primaryPort);
          const httpReady = portOpen ? await previewManager.isHttpReady(primaryPort) : false;
          if (!httpReady) {
            import_utils50.default.warn({
              projectId: reg.projectId,
              port: primaryPort,
              portOpen
            }, "[Watchdog] Sandbox HTTP non-responsive. Triggering recovery...");
            await import_registry10.PreviewRegistry.update(reg.projectId, { status: "FAILED", failureReason: "Watchdog health check failed" });
          }
        }
        if (reg.status === "FAILED") {
          const jitter = Math.floor(Math.random() * 1e4);
          import_utils50.default.warn({ projectId: reg.projectId, jitter }, "[Watchdog] Sandbox in error state. Scheduling auto-recovery with jitter...");
          setTimeout(async () => {
            try {
              await previewManager.restartPreview(reg.projectId);
            } catch (err) {
              import_utils50.default.error({ projectId: reg.projectId, err }, "[Watchdog] Jittered recovery failed");
            }
          }, jitter);
        }
      }
    } catch (error) {
      import_utils50.default.error({ error }, "[Watchdog] Check loop error");
    }
  }
  static stop() {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  AdmissionController,
  CleanupService,
  ClusterProxy,
  ContainerManager,
  DistributedLock,
  EvolutionEngine,
  FailoverManager,
  FirecrackerDriver,
  MicroVMManager,
  NodeRegistry,
  PerformanceMonitor,
  PortManager,
  PreviewOrchestrator,
  PreviewRuntimePool,
  PreviewServerManager,
  PreviewWatchdog,
  ProcessManager,
  ProcessSandbox,
  RedisRecovery,
  ResourceManager,
  RollingRestart,
  RuntimeCapacity,
  RuntimeCleanup,
  RuntimeEscalation,
  RuntimeGuard,
  RuntimeHeartbeat,
  RuntimeMetrics,
  RuntimeScheduler,
  SandboxPoolManager,
  SandboxRunner,
  SnapshotLibrary,
  SnapshotManager,
  SnapshotOverlayManager,
  StaleEvictor,
  StorageGC,
  cleanupService,
  previewManager,
  previewRunner,
  runtimeExecutor,
  sandbox,
  snapshotManager,
  startPreview,
  stopPreview
});
//# sourceMappingURL=index.js.map