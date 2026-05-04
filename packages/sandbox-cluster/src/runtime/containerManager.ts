/**
 * containerManager.ts
 *
 * Docker-based container lifecycle manager for isolated sandboxes.
 */

import { execSync } from 'child_process';
import path from 'path';
import net from 'net';
// import { logger } from '@packages/utils'; // Unused

const CPU_LIMIT = process.env.CONTAINER_CPU_LIMIT || '0.5';
const MEMORY_LIMIT = process.env.CONTAINER_MEMORY_LIMIT || '512m';
const NETWORK_NAME = process.env.CONTAINER_NETWORK || 'ma-preview-net';
const DOCKERFILE_PATH = path.join(__dirname, 'docker', 'Dockerfile.sandbox');
const IMAGE_NAME = 'ma-sandbox';
const PROJECTS_ROOT = process.env.GENERATED_PROJECTS_ROOT
    || path.join(process.cwd(), '.generated-projects');

export type ContainerStatus = 'IDLE' | 'BUILDING' | 'STARTING' | 'RUNNING' | 'FAILED' | 'STOPPED';

export interface ManagedContainer {
    containerId: string;
    containerName: string;
    projectId: string;
    port: number;
    status: ContainerStatus;
    startedAt: string;
}

const containerRegistry = new Map<string, ManagedContainer>();

function containerName(projectId: string): string {
    return `ma-preview-${projectId.slice(0, 12)}`;
}

function exec(cmd: string): string {
    try {
        return execSync(cmd, { encoding: 'utf-8', timeout: 120_000 }).trim();
    } catch (err: any) {
        throw new Error(`Docker CLI failed: ${err.stderr || err.message}`);
    }
}

function isDockerAvailable(): boolean {
    try {
        execSync('docker info', { encoding: 'utf-8', timeout: 5000, stdio: 'pipe' });
        return true;
    } catch {
        return false;
    }
}

export const ContainerManager = {
    ensureNetwork(): void {
        try {
            exec(`docker network inspect ${NETWORK_NAME}`);
        } catch {
            exec(`docker network create --driver bridge ${NETWORK_NAME}`);
        }
    },

    async buildImage(projectId: string, force: boolean = false): Promise<void> {
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        const projectDir = path.join(PROJECTS_ROOT, projectId);
        if (!force) {
            try {
                exec(`docker image inspect ${tag}`);
                return;
            } catch {}
        }
        exec(`docker build -t ${tag} -f "${DOCKERFILE_PATH}" "${projectDir}"`);
    },

    async start(
        projectId: string,
        port: number,
        timeoutMs: number = 60_000
    ): Promise<{ containerId: string; containerName: string }> {
        const name = containerName(projectId);
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        await this.forceRemove(projectId);
        this.ensureNetwork();
        
        // This fails if projectDir doesn't exist.
        // Usually, the CLI ensures the generated project is present first.
        await this.buildImage(projectId);

        const containerId = exec([
            'docker run -d',
            `--name ${name}`,
            `--cpus=${CPU_LIMIT}`,
            `--memory=${MEMORY_LIMIT}`,
            `--memory-swap=${MEMORY_LIMIT}`,
            `--pids-limit=100`,
            `--security-opt=no-new-privileges`,
            `--network ${NETWORK_NAME}`,
            `-p ${port}:${port}`,
            `-e PORT=${port}`,
            `-e NODE_ENV=development`,
            `--init`,
            `--restart=no`,
            `--label "ma.projectId=${projectId}"`,
            `--log-opt max-size=10m`,
            `--log-opt max-file=3`,
            `--label "ma.port=${port}"`,
            `--label "ma.purpose=preview-sandbox"`,
            tag,
        ].join(' '));

        const managed: ManagedContainer = {
            containerId: containerId.slice(0, 12),
            containerName: name,
            projectId,
            port,
            status: 'STARTING',
            startedAt: new Date().toISOString(),
        };
        containerRegistry.set(projectId, managed);
        await this.waitForHealthy(projectId, containerId, timeoutMs);
        managed.status = 'RUNNING';
        return { containerId: managed.containerId, containerName: name };
    },

    async executeCommand(containerId: string, cmd: string, args: string[]): Promise<{ stdout: string; stderr: string; exitCode: number }> {
        const fullCmd = `${cmd} ${args.join(' ')}`;
        try {
            const stdout = exec(`docker exec ${containerId} ${fullCmd}`);
            return { stdout, stderr: '', exitCode: 0 };
        } catch (err: any) {
            return { 
                stdout: '', 
                stderr: err.message, 
                exitCode: err.status || 1 
            };
        }
    },

    async waitForHealthy(projectId: string, containerId: string, timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        const port = containerRegistry.get(projectId)?.port;
        
        while (Date.now() < deadline) {
            const health = this.getHealth(containerId);
            if (health === 'healthy') return;
            
            if (port) {
                try {
                    const isPortOpen = await this.isPortAlive(port);
                    if (isPortOpen) return;
                } catch {}
            }

            const state = this.getState(containerId);
            if (state === 'exited' || state === 'dead') throw new Error('Container exited');
            await new Promise(resolve => setTimeout(resolve, 3000));
        }
        throw new Error(`Health timeout after ${timeoutMs}ms.`);
    },

    isPortAlive(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const socket = net.createConnection({ port, host: '127.0.0.1', timeout: 1000 });
            socket.on('connect', () => { socket.destroy(); resolve(true); });
            socket.on('timeout', () => { socket.destroy(); resolve(false); });
            socket.on('error', () => { socket.destroy(); resolve(false); });
        });
    },

    async stop(projectId: string): Promise<void> {
        const name = containerName(projectId);
        try { exec(`docker stop -t 5 ${name}`); } catch {}
        try { exec(`docker rm -f ${name}`); } catch {}
        containerRegistry.delete(projectId);
    },

    async forceRemove(projectId: string): Promise<void> {
        const name = containerName(projectId);
        try { exec(`docker rm -f ${name}`); } catch {}
        containerRegistry.delete(projectId);
    },

    getHealth(containerId: string): string {
        try {
            return exec(`docker inspect --format="{{.State.Health.Status}}" ${containerId}`);
        } catch { return 'none'; }
    },

    getState(containerId: string): string {
        try {
            return exec(`docker inspect --format="{{.State.Status}}" ${containerId}`);
        } catch { return 'unknown'; }
    },

    isRunning(projectId: string): boolean {
        const name = containerName(projectId);
        try {
            return exec(`docker inspect --format="{{.State.Status}}" ${name}`) === 'running';
        } catch { return false; }
    },

    isAvailable: isDockerAvailable,

    async cleanupAll(): Promise<void> {
        try {
            const ids = exec('docker ps -aq --filter "label=ma.purpose=preview-sandbox"');
            if (ids) exec(`docker rm -f ${ids.replace(/\n/g, ' ')}`);
        } catch {}
        containerRegistry.clear();
    },

    listLocalContainers(): Array<{ projectId: string; port: number; status: ContainerStatus }> {
        try {
            const raw = exec('docker ps --filter "label=ma.purpose=preview-sandbox" --format "{{.Label \\"ma.projectId\\"}},{{.Label \\"ma.port\\"}},{{.Status}}"');
            if (!raw) return [];
            return raw.split('\n').map(line => {
                const [projectId, port, status] = line.split(',');
                return {
                    projectId: projectId!,
                    port: parseInt(port!),
                    status: status?.startsWith('Up') ? 'RUNNING' : 'STOPPED'
                };
            });
        } catch {
            return [];
        }
    }
};

