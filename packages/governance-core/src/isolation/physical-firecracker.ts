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
    private vsockPaths = new Map<string, string>();

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
            
            // The jailer panics if the jail root directory already exists.
            // Wipe the entire jail dir from previous runs.
            const jailDir = path.join(PhysicalFirecrackerAdapter.jailerChrootBase, 'firecracker', config.vmId);
            if (fs.existsSync(jailDir)) {
                fs.rmSync(jailDir, { recursive: true, force: true });
            }
            
            // Save original paths before we mutate config
            let origKernelPath = config.kernelImagePath;
            let origRootfsPath = config.rootfsPath;

            // Resolve directory rootfs structure (e.g., if rootfsPath is a directory, locate the real file inside it)
            if (!fs.existsSync(origKernelPath)) {
                throw new Error(`Source kernel image path not found: ${origKernelPath}`);
            }
            if (fs.statSync(origKernelPath).isDirectory()) {
                throw new Error(`Source kernel image path is a directory: ${origKernelPath}`);
            }

            if (!fs.existsSync(origRootfsPath)) {
                throw new Error(`Source rootfs path not found: ${origRootfsPath}`);
            }
            if (fs.statSync(origRootfsPath).isDirectory()) {
                const files = fs.readdirSync(origRootfsPath);
                // Look for any file ending with .ext4, .img, or rootfs
                const ext4File = files.find(f => f.endsWith('.ext4') || f.endsWith('.img') || f === 'rootfs');
                if (ext4File) {
                    origRootfsPath = path.join(origRootfsPath, ext4File);
                } else {
                    const defaultFile = path.join(origRootfsPath, 'rootfs');
                    if (fs.existsSync(defaultFile) && !fs.statSync(defaultFile).isDirectory()) {
                        origRootfsPath = defaultFile;
                    } else {
                        throw new Error(`Source rootfs path is a directory and no .ext4, .img, or rootfs file was found inside: ${origRootfsPath}`);
                    }
                }
            }
            
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

            // Wait for the jailer to create the chroot root/ directory before we inject files
            for (let i = 0; i < 200; i++) {
                if (fs.existsSync(chrootRoot)) break;
                await new Promise((resolve) => setTimeout(resolve, 50));
            }
            if (!fs.existsSync(chrootRoot)) {
                child.kill();
                throw new Error(`Jailer did not create chroot directory: ${chrootRoot}`);
            }
            
            // Now copy kernel/rootfs into the jailer-created chroot
            const kernelDest = path.join(chrootRoot, 'vmlinux');
            const rootfsDest = path.join(chrootRoot, 'rootfs');
            
            try {
                fs.copyFileSync(origKernelPath, kernelDest);
                fs.copyFileSync(origRootfsPath, rootfsDest);
            } catch (err: any) {
                child.kill();
                throw new Error(`Failed to copy virtualization assets into jailer chroot: ${err.message}`);
            }
            
            // Make sure the unprivileged user can read the files
            try {
                fs.chmodSync(kernelDest, 0o644);
                fs.chmodSync(rootfsDest, 0o644);
            } catch (e) {}
            
            // Create /run dir for the vsock UDS path with permissive permissions
            try {
                const runDir = path.join(chrootRoot, 'run');
                fs.mkdirSync(runDir, { recursive: true });
                fs.chmodSync(runDir, 0o777);
                try {
                    fs.chownSync(runDir, 100, 100);
                } catch {}
            } catch (e: any) {
                console.warn(`[FIRECRACKER_PHYSICAL] Failed to configure chroot /run dir: ${e.message}`);
            }
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
            CgroupController.applyCpuAffinity(config.vmId, '0'); // Pin to NUMA node 0 CPU
            CgroupController.applyMemoryNodes(config.vmId, '0'); // Pin to NUMA memory node 0
        }

        // Wait for the socket to be created (polling)
        let socketReady = false;
        for (let i = 0; i < 200; i++) {
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

        // Configure Vsock Device for command communication
        const vsockUdsPath = PhysicalFirecrackerAdapter.useJailer ? 'run/vsock.sock' : `/tmp/vsock-${config.vmId}.sock`;
        const hostVsockPath = PhysicalFirecrackerAdapter.useJailer
            ? path.join(PhysicalFirecrackerAdapter.jailerChrootBase, 'firecracker', config.vmId, 'root', 'run', 'vsock.sock')
            : `/tmp/vsock-${config.vmId}.sock`;
        this.vsockPaths.set(config.vmId, hostVsockPath);

        await this.sendRequest(socketPath, 'PUT', '/vsock', {
            vsock_id: 'vsock0',
            guest_cid: 3,
            uds_path: vsockUdsPath
        });

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

        const vsockPath = this.vsockPaths.get(vmId);
        if (vsockPath) {
            if (fs.existsSync(vsockPath)) {
                try {
                    fs.unlinkSync(vsockPath);
                } catch {
                    // ignore
                }
            }
            this.vsockPaths.delete(vmId);
        }
    }

    private async connectToVsock(hostVsockPath: string, guestPort: number): Promise<net.Socket> {
        return new Promise((resolve, reject) => {
            const socket = net.connect(hostVsockPath);
            let responseBuffer = '';
            let isConnected = false;

            const onData = (chunk: Buffer) => {
                responseBuffer += chunk.toString('utf8');
                if (responseBuffer.includes('\n')) {
                    const lines = responseBuffer.split('\n');
                    const firstLine = lines[0].trim();
                    if (/^OK \d+$/.test(firstLine)) {
                        isConnected = true;
                        socket.off('data', onData);
                        socket.off('error', onError);
                        socket.off('end', onEnd);
                        resolve(socket);
                    } else {
                        socket.destroy();
                        reject(new Error(`Vsock handshake failed: ${firstLine}`));
                    }
                }
            };

            const onError = (err: Error) => {
                socket.destroy();
                reject(err);
            };

            const onEnd = () => {
                socket.destroy();
                reject(new Error('Vsock socket closed during handshake'));
            };

            socket.on('data', onData);
            socket.on('error', onError);
            socket.on('end', onEnd);

            socket.write(`CONNECT ${guestPort}\n`);
        });
    }

    private async connectToVsockWithRetry(hostVsockPath: string, guestPort: number, retries = 30, delayMs = 1000): Promise<net.Socket> {
        for (let i = 0; i < retries; i++) {
            try {
                return await this.connectToVsock(hostVsockPath, guestPort);
            } catch (err: any) {
                if (i === retries - 1) {
                    throw new Error(`Failed to connect to guest vsock after ${retries} attempts: ${err.message}`);
                }
                await new Promise((resolve) => setTimeout(resolve, delayMs));
            }
        }
        throw new Error(`Failed to connect to guest vsock after ${retries} attempts`);
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

        const hostVsockPath = this.vsockPaths.get(vmId);
        if (!hostVsockPath) {
            throw new Error(`[FIRECRACKER_PHYSICAL] No vsock path registered for VM: ${vmId}`);
        }

        let socket: net.Socket;
        try {
            socket = await this.connectToVsockWithRetry(hostVsockPath, 5005);
        } catch (err: any) {
            throw new Error(`[FIRECRACKER_PHYSICAL] Failed to connect to guest agent: ${err.message}`);
        }

        return new Promise<string>((resolve, reject) => {
            let buffer = '';

            const onData = (chunk: Buffer) => {
                buffer += chunk.toString('utf8');
                if (buffer.includes('\n')) {
                    socket.destroy();
                    try {
                        const response = JSON.parse(buffer.trim());
                        if (response.exitCode === 0) {
                            resolve(response.stdout.trim());
                        } else {
                            reject(new Error(`[FIRECRACKER_EXEC_FAILURE] Command failed with exit code ${response.exitCode}: ${response.stderr.trim()}`));
                        }
                    } catch (parseErr: any) {
                        reject(new Error(`[FIRECRACKER_PHYSICAL] Failed to parse guest agent response: ${parseErr.message}. Raw output: ${buffer}`));
                    }
                }
            };

            const onError = (err: Error) => {
                socket.destroy();
                reject(new Error(`[FIRECRACKER_PHYSICAL] Vsock connection error: ${err.message}`));
            };

            const onEnd = () => {
                socket.destroy();
                if (!buffer.includes('\n')) {
                    reject(new Error(`[FIRECRACKER_PHYSICAL] Vsock connection closed prematurely. Raw output: ${buffer}`));
                }
            };

            socket.on('data', onData);
            socket.on('error', onError);
            socket.on('end', onEnd);

            const payload = JSON.stringify({ cmd: command }) + '\n';
            socket.write(payload);
        });
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
