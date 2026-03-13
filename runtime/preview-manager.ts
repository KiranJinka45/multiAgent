import { exec, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';
import net from 'net';
import { SandboxRunner } from './sandbox-runner';

class PortAllocator {
    private basePort = 3001;
    private maxPort = 3999;
    private usedPorts = new Set<number>();

    async allocate(): Promise<number> {
        for (let port = this.basePort; port <= this.maxPort; port++) {
            if (this.usedPorts.has(port)) continue;

            const isAvailable = await this.checkPort(port);
            if (isAvailable) {
                this.usedPorts.add(port);
                return port;
            }
        }
        throw new Error('No available ports found for preview server');
    }

    release(port: number) {
        this.usedPorts.delete(port);
    }

    private checkPort(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref();
            server.on('error', () => resolve(false));
            server.listen(port, () => {
                server.close(() => resolve(true));
            });
        });
    }
}

import { redis } from '../services/queue';

export class PreviewServerManager {
    private portAllocator = new PortAllocator();
    private activePreviews = new Map<string, { port: number, process: ChildProcess }>();

    constructor() {
        this.startCleanupInterval();
    }

    private startCleanupInterval() {
        setInterval(async () => {
            const now = Date.now();
            const IDLE_TIMEOUT = 30 * 60 * 1000; // 30 minutes

            for (const [projectId, info] of this.activePreviews.entries()) {
                try {
                    const lastAccessStr = await redis.get(`preview:last_access:${projectId}`);
                    const lastAccess = lastAccessStr ? parseInt(lastAccessStr) : 0;

                    if (lastAccess && (now - lastAccess > IDLE_TIMEOUT)) {
                        console.log(`[PreviewManager] Shutting down idle preview for ${projectId}`);
                        await this.stopPreview(projectId);
                        await redis.del(`preview:last_access:${projectId}`);
                    }
                } catch (err) {
                    console.error(`[PreviewManager] Idle cleanup error for ${projectId}:`, err);
                }
            }
        }, 60000); // Check every minute
    }

    async launchPreview(projectId: string, files: any[]): Promise<string> {
        // Stop existing process if any
        if (this.activePreviews.has(projectId)) {
            await this.stopPreview(projectId);
        }

        const port = await this.portAllocator.allocate();
        const previewDir = path.join(process.cwd(), '.previews', projectId);

        // Write generated files to isolated directory
        if (!fs.existsSync(previewDir)) {
            fs.mkdirSync(previewDir, { recursive: true });
        }

        files.forEach(file => {
            const filePath = path.join(previewDir, file.path.replace(/^\//, ''));
            const dir = path.dirname(filePath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            fs.writeFileSync(filePath, file.content || '');
        });

        const { autoHealer } = require('./auto-healer');
        await autoHealer.healProject(projectId, previewDir);

        // Launch Next.js dev server or Vite based on package.json/files
        return new Promise((resolve, reject) => {
            try {
                // Determine start command (simplified simulation, assumes Next.js structure for now)
                const child = SandboxRunner.spawnLongRunning('npx', ['next', 'dev', '-p', port.toString()], {
                    cwd: previewDir,
                    executionId: projectId, // Using projectId as executionId for simplicity here
                    agentName: 'System',
                    action: 'preview_server'
                });

                this.activePreviews.set(projectId, { port, process: child });

                // Allow some time for server to bind port
                setTimeout(async () => {
                    // Store port in Redis for Proxy discovery
                    await redis.set(`preview:port:${projectId}`, port.toString(), 'EX', 3600); // 1 hour TTL
                    // Initialize last access time
                    await redis.set(`preview:last_access:${projectId}`, Date.now().toString(), 'EX', 86400);
                    resolve(`http://localhost:${port}`);
                }, 5000);

                child.on('error', (err) => {
                    console.error(`Preview server error [${projectId}]:`, err);
                    // auto-recovery or log could be handled here
                });

                child.on('exit', async () => {
                    await redis.del(`preview:port:${projectId}`);
                    this.portAllocator.release(port);
                    this.activePreviews.delete(projectId);
                });

            } catch (err) {
                this.portAllocator.release(port);
                reject(err);
            }
        });
    }

    async stopPreview(projectId: string) {
        const preview = this.activePreviews.get(projectId);
        if (preview) {
            preview.process.kill('SIGKILL');
            await redis.del(`preview:port:${projectId}`);
            this.portAllocator.release(preview.port);
            this.activePreviews.delete(projectId);
        }
    }
}

export const previewManager = new PreviewServerManager();
