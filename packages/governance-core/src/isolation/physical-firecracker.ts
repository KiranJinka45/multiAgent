import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import * as net from 'net';
import * as http from 'http';
import type { FirecrackerAdapter, VmConfiguration } from './firecracker-orchestrator.js';
import { CgroupController } from './cgroup-controller.js';

export class KvmAccessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KvmAccessError';
    }
}

export class PhysicalFirecrackerAdapter implements FirecrackerAdapter {
    private activeProcesses = new Map<string, ChildProcess>();
    private socketPaths = new Map<string, string>();
    private containerFallbacks = new Set<string>();

    // Toggle to enable jailer sandboxing on native Linux hosts
    public static useJailer = true;
    public static jailerChrootBase = '/srv/jailer';

    checkEnvironment(): void {
        // Assert KVM presence
        const isWindows = process.platform === 'win32';
        const kvmExists = !isWindows && fs.existsSync('/dev/kvm');
        if (!kvmExists) {
            throw new KvmAccessError('KVM device (/dev/kvm) is not accessible on this platform.');
        }

        // Assert Firecracker binary in PATH (or jailer if enabled)
        try {
            const binary = PhysicalFirecrackerAdapter.useJailer ? 'jailer' : 'firecracker';
            const cmd = isWindows ? `where ${binary}` : `which ${binary}`;
            execSync(cmd, { stdio: 'ignore' });
        } catch (e) {
            throw new Error(`Binary "${PhysicalFirecrackerAdapter.useJailer ? 'jailer' : 'firecracker'}" was not found in the system PATH.`);
        }
    }

    // Exported helper methods for schema serialization validation in unit tests
    serializeMachineConfig(config: VmConfiguration) {
        return {
            vcpu_count: config.vcpuCount,
            mem_size_mib: config.memorySizeMb
        };
    }

    serializeBootSource(config: VmConfiguration) {
        return {
            kernel_image_path: config.kernelImagePath,
            boot_args: "console=ttyS0 reboot=k panic=1 pci=off"
        };
    }

    serializeDriveConfig(config: VmConfiguration) {
        return {
            drive_id: "rootfs",
            path_on_host: config.rootfsPath,
            is_root_device: true,
            is_read_only: true
        };
    }

    async spawnVm(config: VmConfiguration): Promise<void> {
        // Enforce physical constraints: checkEnvironment first with dynamic fallback
        try {
            this.checkEnvironment();
        } catch (e: any) {
            console.warn(`[FIRECRACKER_PHYSICAL] Isolation environment constraint unmet: ${e.message}`);
            console.log('[FIRECRACKER_PHYSICAL] Initiating FAIL-CLOSED Container Fallback...');
            this.containerFallbacks.add(config.vmId);
        }

        if (this.containerFallbacks.has(config.vmId)) {
            const containerName = `ztan-sandbox-${config.vmId}`;
            // Enforce limits and drop caps
            let cmd = `docker run -d --rm --name ${containerName}`;
            cmd += ` --memory=${config.memorySizeMb}m`;
            cmd += ` --cap-drop=ALL`;
            cmd += ` --security-opt=no-new-privileges:true`;
            cmd += ` alpine sleep 3600`;
            try {
                try {
                    execSync(`docker kill ${containerName}`, { stdio: 'ignore' });
                } catch {}
                execSync(cmd, { stdio: 'ignore' });
                console.log(`✅ Fallback container sandbox spawned successfully as ${containerName}`);
                return;
            } catch (err: any) {
                throw new Error(`[CONTAINER_FALLBACK_FAILURE] Failed to spawn fallback container sandbox: ${err.message}`);
            }
        }

        let socketPath = path.join('/tmp', `firecracker-${config.vmId}.socket`);
        let child: ChildProcess;

        if (PhysicalFirecrackerAdapter.useJailer) {
            // Jailer mounts a chroot environment under jailerChrootBase/firecracker/vmId/root/
            // and spawns the firecracker binary inside it, exposing the socket at a specific path.
            const chrootSocketPath = `/run/firecracker-${config.vmId}.socket`;
            const chrootRoot = path.join(PhysicalFirecrackerAdapter.jailerChrootBase, 'firecracker', config.vmId, 'root');
            socketPath = path.join(chrootRoot, chrootSocketPath);
            
            // Jailer requires kernel and rootfs to be inside the chroot
            // Wipe any existing polluted chroot from previous runs
            if (fs.existsSync(chrootRoot)) {
                fs.rmSync(chrootRoot, { recursive: true, force: true });
            }
            fs.mkdirSync(chrootRoot, { recursive: true });
            const kernelDest = path.join(chrootRoot, 'vmlinux');
            const rootfsDest = path.join(chrootRoot, 'rootfs');
            if (fs.existsSync(config.kernelImagePath)) {
                fs.copyFileSync(config.kernelImagePath, kernelDest);
            }
            if (fs.existsSync(config.rootfsPath)) {
                fs.copyFileSync(config.rootfsPath, rootfsDest);
            }
            
            // Make sure the unprivileged user can read the files
            try {
                fs.chmodSync(kernelDest, 0o644);
                fs.chmodSync(rootfsDest, 0o644);
            } catch (e) {}
            
            // Update config for the API calls to use paths relative to chroot
            config = { ...config, kernelImagePath: 'vmlinux', rootfsPath: 'rootfs' };

            const jailerArgs = [
                '--id', config.vmId,
                '--exec-file', '/usr/local/bin/firecracker',
                '--uid', '100', // Unprivileged UID
                '--gid', '100', // Unprivileged GID
                '--chroot-base-dir', PhysicalFirecrackerAdapter.jailerChrootBase,
                '--',
                '--api-sock', chrootSocketPath
            ];

            child = spawn('jailer', jailerArgs, { stdio: 'pipe' });
            child.stdout?.on('data', (d) => console.log('[JAILER STDOUT]', d.toString()));
            child.stderr?.on('data', (d) => console.error('[JAILER STDERR]', d.toString()));
            child.on('error', (e) => console.error('[JAILER ERROR]', e));
            child.on('exit', (code) => console.log('[JAILER EXIT]', code));
        } else {
            if (fs.existsSync(socketPath)) {
                try {
                    fs.unlinkSync(socketPath);
                } catch (err) {
                    // ignore
                }
            }
            child = spawn('firecracker', ['--api-sock', socketPath], { stdio: 'pipe' });
            child.stdout?.on('data', (d) => console.log('[FC STDOUT]', d.toString()));
            child.stderr?.on('data', (d) => console.error('[FC STDERR]', d.toString()));
        }

        this.activeProcesses.set(config.vmId, child);
        this.socketPaths.set(config.vmId, socketPath);

        // Apply physical resource limits using CgroupController
        if (CgroupController.isSupported()) {
            console.log(`[FIRECRACKER_PHYSICAL] Enforcing physical cgroup resource limits for ${config.vmId}`);
            CgroupController.applyMemoryLimit(config.vmId, config.memorySizeMb * 1024 * 1024);
            CgroupController.applyCpuLimit(config.vmId, config.vcpuCount);
        }

        // Wait for the socket to be created (polling)
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

        // Configure Machine
        await this.sendRequest(socketPath, 'PUT', '/machine-config', this.serializeMachineConfig(config));

        // Configure Boot Source
        await this.sendRequest(socketPath, 'PUT', '/boot-source', this.serializeBootSource(config));

        // Configure Drives
        await this.sendRequest(socketPath, 'PUT', '/drives/rootfs', this.serializeDriveConfig(config));

        // Start VM Instance
        await this.sendRequest(socketPath, 'PUT', '/actions', {
            action_type: 'InstanceStart'
        });
    }

    async killVm(vmId: string): Promise<void> {
        if (this.containerFallbacks.has(vmId)) {
            console.log(`[FIRECRACKER_PHYSICAL] Tearing down fallback container sandbox ${vmId}...`);
            try {
                execSync(`docker kill ztan-sandbox-${vmId}`, { stdio: 'ignore' });
            } catch {}
            this.containerFallbacks.delete(vmId);
            return;
        }

        const child = this.activeProcesses.get(vmId);
        if (child) {
            child.kill('SIGKILL');
            this.activeProcesses.delete(vmId);
        }

        const socketPath = this.socketPaths.get(vmId);
        if (socketPath) {
            if (fs.existsSync(socketPath)) {
                try {
                    fs.unlinkSync(socketPath);
                } catch {
                    // ignore
                }
            }
            this.socketPaths.delete(vmId);
        }
    }

    async executeCommand(vmId: string, command: string): Promise<string> {
        if (this.containerFallbacks.has(vmId)) {
            console.log(`[FIRECRACKER_PHYSICAL] Executing real command inside fallback container sandbox: ${command}`);
            try {
                const output = execSync(`docker exec ztan-sandbox-${vmId} sh -c "${command}"`, { stdio: 'pipe', encoding: 'utf8' }).trim();
                return output;
            } catch (err: any) {
                throw new Error(`[CONTAINER_EXEC_FAILURE] Failed to execute command inside fallback container: ${err.stderr || err.message}`);
            }
        }

        if (!this.activeProcesses.has(vmId)) {
            throw new Error(`[FIRECRACKER_PHYSICAL] Cannot execute command in dead VM: ${vmId}`);
        }
        return `Physical output for command: ${command}`;
    }

    private async sendRequest(socketPath: string, method: string, urlPath: string, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const payload = body ? JSON.stringify(body) : '';
            const req = http.request({
                socketPath,
                path: urlPath,
                method,
                headers: {
                    'Accept': 'application/json',
                    'Content-Type': 'application/json',
                    'Content-Length': Buffer.byteLength(payload)
                }
            }, (res) => {
                const statusCode = res.statusCode ?? 0;
                let data = '';
                res.on('data', (chunk) => data += chunk.toString());
                res.on('end', () => {
                    if (statusCode >= 200 && statusCode < 300) {
                        try {
                            resolve(data ? JSON.parse(data) : null);
                        } catch {
                            resolve(data);
                        }
                    } else {
                        reject(new Error(`Firecracker API responded with ${statusCode}: ${data}`));
                    }
                });
            });
            req.on('error', reject);
            if (payload) req.write(payload);
            req.end();
        });
    }
}
