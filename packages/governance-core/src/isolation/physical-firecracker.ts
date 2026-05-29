import * as fs from 'fs';
import * as path from 'path';
import { spawn, execSync, ChildProcess } from 'child_process';
import * as net from 'net';
import type { FirecrackerAdapter, VmConfiguration } from './firecracker-orchestrator.js';

export class KvmAccessError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'KvmAccessError';
    }
}

export class PhysicalFirecrackerAdapter implements FirecrackerAdapter {
    private activeProcesses = new Map<string, ChildProcess>();
    private socketPaths = new Map<string, string>();

    // Toggle to enable jailer sandboxing on native Linux hosts
    public static useJailer = false;
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
        // Enforce physical constraints: checkEnvironment first.
        this.checkEnvironment();

        let socketPath = path.join('/tmp', `firecracker-${config.vmId}.socket`);
        let child: ChildProcess;

        if (PhysicalFirecrackerAdapter.useJailer) {
            // Jailer mounts a chroot environment under jailerChrootBase/firecracker/vmId/root/
            // and spawns the firecracker binary inside it, exposing the socket at a specific path.
            const chrootSocketPath = `/run/firecracker-${config.vmId}.socket`;
            socketPath = path.join(PhysicalFirecrackerAdapter.jailerChrootBase, 'firecracker', config.vmId, 'root', chrootSocketPath);
            
            const jailerArgs = [
                '--id', config.vmId,
                '--exec_file', '/usr/bin/firecracker',
                '--uid', '100', // Unprivileged UID
                '--gid', '100', // Unprivileged GID
                '--chroot_base', PhysicalFirecrackerAdapter.jailerChrootBase,
                '--',
                '--api-sock', chrootSocketPath
            ];

            child = spawn('jailer', jailerArgs, { stdio: 'pipe' });
        } else {
            if (fs.existsSync(socketPath)) {
                try {
                    fs.unlinkSync(socketPath);
                } catch (err) {
                    // ignore
                }
            }
            child = spawn('firecracker', ['--api-sock', socketPath], { stdio: 'pipe' });
        }

        this.activeProcesses.set(config.vmId, child);
        this.socketPaths.set(config.vmId, socketPath);

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
        if (!this.activeProcesses.has(vmId)) {
            throw new Error(`[FIRECRACKER_PHYSICAL] Cannot execute command in dead VM: ${vmId}`);
        }
        return `Physical output for command: ${command}`;
    }

    private async sendRequest(socketPath: string, method: string, urlPath: string, body?: any): Promise<any> {
        return new Promise((resolve, reject) => {
            const client = net.connect(socketPath, () => {
                const payload = body ? JSON.stringify(body) : '';
                const request = [
                    `${method} ${urlPath} HTTP/1.1`,
                    `Host: localhost`,
                    `Content-Type: application/json`,
                    `Content-Length: ${Buffer.byteLength(payload)}`,
                    `Connection: close`,
                    '',
                    payload
                ].join('\r\n');
                client.write(request);
            });

            let data = '';
            client.on('data', (chunk) => {
                data += chunk.toString();
            });

            client.on('end', () => {
                const lines = data.split('\r\n');
                const statusLine = lines[0];
                const statusCode = parseInt(statusLine.split(' ')[1], 10);
                if (statusCode >= 200 && statusCode < 300) {
                    const bodyIndex = data.indexOf('\r\n\r\n');
                    const responseBody = data.substring(bodyIndex + 4);
                    try {
                        resolve(responseBody ? JSON.parse(responseBody) : null);
                    } catch {
                        resolve(responseBody);
                    }
                } else {
                    reject(new Error(`Firecracker API responded with ${statusCode}: ${data}`));
                }
            });

            client.on('error', (err) => {
                reject(err);
            });
        });
    }
}
