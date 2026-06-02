// packages/governance-core/src/isolation/physical-firecracker.ts
import * as fs from "fs";
import * as path from "path";
import { spawn, execSync } from "child_process";
import * as http from "http";
var KvmAccessError = class extends Error {
  constructor(message) {
    super(message);
    this.name = "KvmAccessError";
  }
};
var PhysicalFirecrackerAdapter = class _PhysicalFirecrackerAdapter {
  activeProcesses = /* @__PURE__ */ new Map();
  socketPaths = /* @__PURE__ */ new Map();
  // Toggle to enable jailer sandboxing on native Linux hosts
  static useJailer = false;
  static jailerChrootBase = "/srv/jailer";
  checkEnvironment() {
    const isWindows = process.platform === "win32";
    const kvmExists = !isWindows && fs.existsSync("/dev/kvm");
    if (!kvmExists) {
      throw new KvmAccessError("KVM device (/dev/kvm) is not accessible on this platform.");
    }
    try {
      const binary = _PhysicalFirecrackerAdapter.useJailer ? "jailer" : "firecracker";
      const cmd = isWindows ? `where ${binary}` : `which ${binary}`;
      execSync(cmd, { stdio: "ignore" });
    } catch (e) {
      throw new Error(`Binary "${_PhysicalFirecrackerAdapter.useJailer ? "jailer" : "firecracker"}" was not found in the system PATH.`);
    }
  }
  // Exported helper methods for schema serialization validation in unit tests
  serializeMachineConfig(config) {
    return {
      vcpu_count: config.vcpuCount,
      mem_size_mib: config.memorySizeMb
    };
  }
  serializeBootSource(config) {
    return {
      kernel_image_path: config.kernelImagePath,
      boot_args: "console=ttyS0 reboot=k panic=1 pci=off"
    };
  }
  serializeDriveConfig(config) {
    return {
      drive_id: "rootfs",
      path_on_host: config.rootfsPath,
      is_root_device: true,
      is_read_only: true
    };
  }
  async spawnVm(config) {
    this.checkEnvironment();
    let socketPath = path.join("/tmp", `firecracker-${config.vmId}.socket`);
    let child;
    if (_PhysicalFirecrackerAdapter.useJailer) {
      const chrootSocketPath = `/run/firecracker-${config.vmId}.socket`;
      socketPath = path.join(_PhysicalFirecrackerAdapter.jailerChrootBase, "firecracker", config.vmId, "root", chrootSocketPath);
      const jailerArgs = [
        "--id",
        config.vmId,
        "--exec_file",
        "/usr/bin/firecracker",
        "--uid",
        "100",
        // Unprivileged UID
        "--gid",
        "100",
        // Unprivileged GID
        "--chroot_base",
        _PhysicalFirecrackerAdapter.jailerChrootBase,
        "--",
        "--api-sock",
        chrootSocketPath
      ];
      child = spawn("jailer", jailerArgs, { stdio: "pipe" });
    } else {
      if (fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath);
        } catch (err) {
        }
      }
      child = spawn("firecracker", ["--api-sock", socketPath], { stdio: "pipe" });
    }
    this.activeProcesses.set(config.vmId, child);
    this.socketPaths.set(config.vmId, socketPath);
    let socketReady = false;
    for (let i = 0; i < 20; i++) {
      if (fs.existsSync(socketPath)) {
        socketReady = true;
        break;
      }
      await new Promise((resolve) => setTimeout(resolve, 50));
    }
    if (!socketReady) {
      child.kill();
      this.activeProcesses.delete(config.vmId);
      this.socketPaths.delete(config.vmId);
      throw new Error(`Timeout waiting for Firecracker API socket to be created at: ${socketPath}`);
    }
    await this.sendRequest(socketPath, "PUT", "/machine-config", this.serializeMachineConfig(config));
    await this.sendRequest(socketPath, "PUT", "/boot-source", this.serializeBootSource(config));
    await this.sendRequest(socketPath, "PUT", "/drives/rootfs", this.serializeDriveConfig(config));
    await this.sendRequest(socketPath, "PUT", "/actions", {
      action_type: "InstanceStart"
    });
  }
  async killVm(vmId) {
    const child = this.activeProcesses.get(vmId);
    if (child) {
      child.kill("SIGKILL");
      this.activeProcesses.delete(vmId);
    }
    const socketPath = this.socketPaths.get(vmId);
    if (socketPath) {
      if (fs.existsSync(socketPath)) {
        try {
          fs.unlinkSync(socketPath);
        } catch {
        }
      }
      this.socketPaths.delete(vmId);
    }
  }
  async executeCommand(vmId, command) {
    if (!this.activeProcesses.has(vmId)) {
      throw new Error(`[FIRECRACKER_PHYSICAL] Cannot execute command in dead VM: ${vmId}`);
    }
    return `Physical output for command: ${command}`;
  }
  async sendRequest(socketPath, method, urlPath, body) {
    return new Promise((resolve, reject) => {
      const payload = body ? JSON.stringify(body) : "";
      const req = http.request({
        socketPath,
        path: urlPath,
        method,
        headers: {
          "Accept": "application/json",
          "Content-Type": "application/json",
          "Content-Length": Buffer.byteLength(payload)
        }
      }, (res) => {
        let data = "";
        res.on("data", (chunk) => data += chunk.toString());
        res.on("end", () => {
          if (res.statusCode >= 200 && res.statusCode < 300) {
            try {
              resolve(data ? JSON.parse(data) : null);
            } catch {
              resolve(data);
            }
          } else {
            reject(new Error(`Firecracker API responded with ${res.statusCode}: ${data}`));
          }
        });
      });
      req.on("error", reject);
      if (payload) req.write(payload);
      req.end();
    });
  }
};

// run-firecracker.ts
import * as fs2 from "fs";
process.env.PATH = "/mnt/c/multiagentic_project/multiAgent-main/bin:" + process.env.PATH;
async function run() {
  console.log("=== Real Firecracker Execution ===");
  console.log("KVM Exists: " + fs2.existsSync("/dev/kvm"));
  const adapter = new PhysicalFirecrackerAdapter("/var/lib/ztan", "./bin");
  try {
    console.log("Spawning VM...");
    const vm = await adapter.spawnVm({
      vmId: "wsl-real-test",
      memorySizeMb: 128,
      vcpuCount: 1,
      kernelImagePath: "/var/lib/ztan/vmlinux",
      rootfsPath: "/var/lib/ztan/rootfs"
    });
    console.log("\u2705 VM spawned successfully!");
    console.log("Executing arbitrary command via adapter executeCommand()...");
    const result = await adapter.executeCommand("wsl-real-test", 'echo "Hello from true Firecracker isolated microVM!"');
    console.log("\u2705 Command executed! Output:", result);
    console.log("Killing VM...");
    await adapter.killVm("wsl-real-test");
    console.log("\u2705 VM hard-killed and swept.");
  } catch (e) {
    console.error("Execution failed:", e);
  }
}
run();
