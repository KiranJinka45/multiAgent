import { ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs-extra';
import net from 'net';
import { SandboxRunner } from './sandbox-runner';
import { previewRegistry } from './preview-registry';
import http from 'http';
import { redis } from '../services/queue';
import { SnapshotManager } from './snapshot-manager';
import { SandboxPoolManager } from './sandbox-pool';
import { SnapshotLibrary } from './snapshot-library';
import { AdmissionController } from './admission-controller';
import { MicroVMManager } from './microvm-manager';
import logger from '../config/logger';

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

export class PreviewServerManager {
    private portAllocator = new PortAllocator();
    private activePreviews = new Map<string, { port: number, process: ChildProcess }>();
    private templateDir = path.join(process.cwd(), '.previews', '_template');
    private snapshotManager = new SnapshotManager();

    constructor() {
        this.initializeTemplates();
        this.startCleanupInterval();
        // Initialize Phase 12 infrastructure
        SnapshotLibrary.init().catch(e => logger.error({ e }, 'SnapshotLibrary init failed'));
        SandboxPoolManager.init().catch(e => logger.error({ e }, 'SandboxPoolManager init failed'));
    }

    private async initializeTemplates() {
        if (!fs.existsSync(this.templateDir)) {
            await fs.ensureDir(this.templateDir);
            logger.info('[PreviewManager] Initializing Hot Sandbox Template...');
            await fs.writeFile(path.join(this.templateDir, 'package.json'), JSON.stringify({
                name: 'multi-agent-preview-template',
                dependencies: {
                    'next': 'latest',
                    'react': 'latest',
                    'react-dom': 'latest',
                    'lucide-react': 'latest',
                    'framer-motion': 'latest'
                }
            }, null, 2));
        }
    }

    private startCleanupInterval() {
        setInterval(async () => {
            const now = Date.now();
            const IDLE_TIMEOUT = 30 * 60 * 1000;

            for (const [projectId] of this.activePreviews.entries()) {
                try {
                    const regData = await redis.get(`runtime:registry:${projectId}`);
                    let lastAccess = 0;
                    if (regData) {
                        lastAccess = JSON.parse(regData).lastAccessedAt ? new Date(JSON.parse(regData).lastAccessedAt).getTime() : 0;
                    } else {
                        const lastAccessStr = await redis.get(`preview:last_access:${projectId}`);
                        lastAccess = lastAccessStr ? parseInt(lastAccessStr) : 0;
                    }

                    if (lastAccess && (now - lastAccess > IDLE_TIMEOUT)) {
                        logger.info(`[PreviewManager] Shutting down idle preview for ${projectId}`);
                        await this.stopPreview(projectId);
                        await redis.del(`preview:last_access:${projectId}`);
                    }
                } catch (err) {
                    logger.error({ err }, `[PreviewManager] Idle cleanup error for ${projectId}`);
                }
            }
        }, 60000);
    }

    async launchPreview(projectId: string, framework = 'nextjs'): Promise<string> {
        logger.info({ projectId, framework }, '[PreviewServerManager] Launching preview environment...');

        // ADMISSION CONTROL: Ensure host capacity before starting
        await AdmissionController.acquireAdmission(projectId);

        // PHASE 15: Optional MicroVM Hardware Isolation
        const useMicroVM = process.env.ENABLE_MICROVMS === 'true';
        if (useMicroVM) {
            const rootfs = await MicroVMManager.allocateSandbox(projectId, framework);
            logger.info({ projectId, rootfs }, '[PreviewServerManager] MICROVM ALLOCATED (Phase 15).');
            return await this.startServer(projectId);
        }

        // 1. Attempt Hot Path Retrieval (Phase 12: Hot Sandbox Pool)
        const pooledDir = await SandboxPoolManager.acquire(framework, projectId);
        if (pooledDir) {
            logger.info('[PreviewServerManager] HOT POOL HIT. Sandbox allocated in <50ms.');
            return await this.startServer(projectId);
        }

        // 2. Attempt Warm Path Restore (Phase 6: Runtime Snapshots)
        const previewDir = path.join(process.cwd(), '.previews', projectId);
        const restored = await this.snapshotManager.restoreFromSnapshot(projectId, previewDir);
        if (restored) {
            logger.info(`[PreviewManager] Rapid Restore successful for ${projectId}. Skipping initialization.`);
        } else {
            // 3. Cold Path Initialization
            logger.info(`[PreviewManager] Cold path initialization for ${projectId}.`);
            await fs.ensureDir(previewDir);

            const nodeModulesPath = path.join(previewDir, 'node_modules');
            const templateModulesPath = path.join(this.templateDir, 'node_modules');
            if (!fs.existsSync(nodeModulesPath) && fs.existsSync(templateModulesPath)) {
                try {
                    fs.symlinkSync(templateModulesPath, nodeModulesPath, 'junction');
                } catch (e) {
                    logger.warn({ error: e }, `[PreviewManager] Could not symlink node_modules for ${projectId}.`);
                }
            }
        }

        return await this.startServer(projectId);
    }

    async restartPreview(projectId: string): Promise<string> {
        await this.stopPreview(projectId);
        return await this.startServer(projectId);
    }

    async checkHealth(previewId: string): Promise<boolean> {
        const reg = await previewRegistry.lookup(previewId);
        if (!reg) return false;
        return this.isHttpReady(reg.containerPort);
    }

    async isPortOpen(port: number, timeoutMs = 2000): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = new net.Socket();
            socket.setTimeout(timeoutMs);
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.connect(port, '127.0.0.1');
        });
    }

    async isHttpReady(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const req = http.get(`http://127.0.0.1:${port}`, (res) => {
                resolve(res.statusCode === 200);
            });
            req.on('error', () => resolve(false));
            req.setTimeout(1000, () => { req.destroy(); resolve(false); });
        });
    }

    async startServer(projectId: string): Promise<string> {
        let previewId = await previewRegistry.getPreviewId(projectId);
        if (!previewId) {
            const port = await this.portAllocator.allocate();
            previewId = await previewRegistry.register(projectId, 'localhost', port);
        }

        const reg = await previewRegistry.lookup(previewId);
        if (!reg) throw new Error('Preview registration missing');

        const previewDir = path.join(process.cwd(), '.previews', projectId);
        const port = reg.containerPort;

        if (this.activePreviews.has(projectId) && reg.status === 'running') {
            return `http://localhost:${port}`;
        }

        await previewRegistry.updateStatus(previewId, 'starting');
        
        return new Promise((resolve, reject) => {
            try {
                const memoryLimitMb = 1024;
                const child = SandboxRunner.spawnLongRunning('npx', ['next', 'dev', '-p', port.toString(), '-H', '0.0.0.0'], {
                    cwd: previewDir,
                    executionId: projectId,
                    agentName: 'System',
                    action: 'preview_server',
                    env: {
                        ...process.env,
                        NODE_OPTIONS: `--max-old-space-size=${memoryLimitMb}`
                    }
                });

                this.startHeartbeatMonitor(projectId, child);

                this.activePreviews.set(projectId, { port, process: child });

                const checkStartup = async () => {
                    const start = Date.now();
                    let isReady = false;
                    while (Date.now() - start < 30000) {
                        const portOpen = await this.isPortOpen(port, 1000);
                        if (portOpen) {
                            isReady = await this.isHttpReady(port);
                            if (isReady) break;
                        }
                        await new Promise(r => setTimeout(r, 1000));
                    }

                    if (isReady) {
                        logger.info(`[PreviewManager] Sandbox ${projectId} is HTTP READY.`);
                        await previewRegistry.updateStatus(previewId!, 'running');
                        
                        // 2. Create Snapshot asynchronously
                        this.snapshotManager.createSnapshot(projectId, previewDir).catch(e_snap => {
                            logger.error({ e: e_snap }, `[PreviewManager] Snapshot failed for ${projectId}`);
                        });

                        resolve(`http://localhost:${port}`);
                    } else {
                        reject(new Error('HTTP readiness timeout'));
                    }
                };
                checkStartup();

                child.on('error', (err) => {
                    logger.error({ err }, `[PreviewManager] Process error for ${projectId}`);
                    previewRegistry.updateStatus(previewId!, 'error').catch(() => {});
                });

                child.on('exit', async () => {
                    this.portAllocator.release(port);
                    this.activePreviews.delete(projectId);
                    previewRegistry.updateStatus(previewId!, 'sleeping').catch(() => {});
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
            this.portAllocator.release(preview.port);
            this.activePreviews.delete(projectId);
        }
    }

    private startHeartbeatMonitor(projectId: string, child: ChildProcess) {
        const checkInterval = 10000; // 10 seconds
        const timer = setInterval(async () => {
            if (child.killed || child.exitCode !== null) {
                logger.warn({ projectId }, '[Heartbeat] Sandbox process exited. Triggering recovery...');
                clearInterval(timer);
                await this.recoverSandbox(projectId);
                return;
            }

            // Check HTTP health
            const reg = await previewRegistry.getPreviewId(projectId);
            if (reg) {
                const isHealthy = await this.checkHealth(reg);
                if (!isHealthy) {
                    logger.warn({ projectId }, '[Heartbeat] Sandbox HTTP health check failed.');
                }
            }
        }, checkInterval);
    }

    private async recoverSandbox(projectId: string) {
        logger.info({ projectId }, '[Recovery] Restarting crashed sandbox...');
        try {
            await this.launchPreview(projectId);
        } catch (err) {
            logger.error({ err, projectId }, '[Recovery] Failed to recover sandbox.');
        }
    }

    async streamFileUpdate(projectId: string, filePath: string, content: string) {
        const previewDir = path.join(process.cwd(), '.previews', projectId);
        const fullPath = path.join(previewDir, filePath);
        try {
            await fs.ensureDir(path.dirname(fullPath));
            await fs.writeFile(fullPath, content);
            logger.info(`[PreviewManager] VFS Stream: ${filePath}`);
        } catch (err) {
            logger.error({ err }, `[PreviewManager] VFS Stream failed: ${filePath}`);
        }
    }
}

export const previewManager = new PreviewServerManager();
