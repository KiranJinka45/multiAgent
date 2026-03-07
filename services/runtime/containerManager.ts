/**
 * containerManager.ts
 *
 * Phase 2 — Docker-based container lifecycle manager.
 *
 * Drop-in replacement for processManager.ts when RUNTIME_MODE=docker.
 * Each preview runs in its own isolated Docker container with:
 *   - CPU limit (0.5 cores default)
 *   - Memory limit (512MB default)
 *   - Network isolation (bridge with port mapping)
 *   - Read-only root filesystem (except /app and /tmp)
 *   - Non-root user inside container
 *   - Automatic cleanup on stop
 *   - Container name = ma-preview-{projectId-short}
 *
 * Uses Docker CLI via child_process (no dockerode dependency needed).
 * In production, replace with Docker Engine API or Kubernetes Jobs.
 */

import { execSync, spawn, ChildProcess } from 'child_process';
import path from 'path';
import logger from '@configs/logger';

// ─── Config ────────────────────────────────────────────────────────────────

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

// In-memory container registry
const containerRegistry = new Map<string, ManagedContainer>();

// ─── Helpers ───────────────────────────────────────────────────────────────

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

// ─── Container Manager ────────────────────────────────────────────────────

export const ContainerManager = {
    /**
     * Ensure the Docker bridge network exists (created once).
     */
    ensureNetwork(): void {
        try {
            exec(`docker network inspect ${NETWORK_NAME}`);
        } catch {
            exec(`docker network create --driver bridge ${NETWORK_NAME}`);
            logger.info({ network: NETWORK_NAME }, '[ContainerManager] Network created');
        }
    },

    /**
     * Build the sandbox image if it doesn't exist or force rebuild.
     */
    async buildImage(projectId: string, force: boolean = false): Promise<void> {
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;
        const projectDir = path.join(PROJECTS_ROOT, projectId);

        if (!force) {
            try {
                exec(`docker image inspect ${tag}`);
                logger.info({ tag }, '[ContainerManager] Image already exists, skipping build');
                return;
            } catch {
                // Image doesn't exist, proceed with build
            }
        }

        logger.info({ projectId, tag }, '[ContainerManager] Building image');

        // Build using the project directory as context
        exec(`docker build -t ${tag} -f "${DOCKERFILE_PATH}" "${projectDir}"`);
        logger.info({ tag }, '[ContainerManager] Image built');
    },

    /**
     * Start a container for a project.
     *
     * @param projectId - UUID of the project
     * @param port - Host port to map (acquired by PortManager)
     * @param timeoutMs - How long to wait for container health
     *
     * Returns the container ID.
     */
    async start(
        projectId: string,
        port: number,
        timeoutMs: number = 60_000
    ): Promise<{ containerId: string; containerName: string }> {
        const name = containerName(projectId);
        const tag = `${IMAGE_NAME}:${projectId.slice(0, 8)}`;

        // Kill any existing container with same name
        await this.forceRemove(projectId);

        // Ensure network exists
        this.ensureNetwork();

        // Build image if not present
        await this.buildImage(projectId);

        logger.info({ projectId, name, port, tag }, '[ContainerManager] Starting container');

        // Docker run with:
        //   --cpus          CPU limit
        //   --memory        Memory limit
        //   --read-only     Read-only root FS
        //   --tmpfs /tmp    Writable tmpfs for temp files
        //   --network       Isolated bridge network
        //   -p              Port mapping (host:container)
        //   -e PORT         Tell the app which port to listen on
        //   --name          Named container for easy management
        //   --rm            Auto-remove on stop (unless we need to inspect)
        //   --init          Proper PID 1 signal handling (tini)
        const containerId = exec([
            'docker run -d',
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

        // Wait for container to become healthy
        await this.waitForHealthy(projectId, containerId, timeoutMs);

        managed.status = 'RUNNING';
        logger.info({ projectId, containerId: managed.containerId, port }, '[ContainerManager] Container RUNNING');

        return { containerId: managed.containerId, containerName: name };
    },

    /**
     * Wait for Docker HEALTHCHECK to report healthy.
     */
    async waitForHealthy(projectId: string, containerId: string, timeoutMs: number): Promise<void> {
        const deadline = Date.now() + timeoutMs;
        const checkInterval = 3000;

        while (Date.now() < deadline) {
            const health = this.getHealth(containerId);

            if (health === 'healthy') return;
            if (health === 'unhealthy') {
                throw new Error(`Container ${containerId} reported unhealthy`);
            }

            // Check if container exited
            const state = this.getState(containerId);
            if (state === 'exited' || state === 'dead') {
                const logs = this.getLogs(projectId, 30);
                throw new Error(`Container exited prematurely. Last logs:\n${logs}`);
            }

            await new Promise(resolve => setTimeout(resolve, checkInterval));
        }

        throw new Error(`Container health timeout after ${timeoutMs}ms`);
    },

    /**
     * Stop and remove a container.
     */
    async stop(projectId: string): Promise<void> {
        const name = containerName(projectId);
        logger.info({ projectId, name }, '[ContainerManager] Stopping container');

        try {
            exec(`docker stop -t 10 ${name}`);
        } catch {
            // Container may already be stopped
        }

        try {
            exec(`docker rm -f ${name}`);
        } catch {
            // Container may already be removed
        }

        containerRegistry.delete(projectId);
        logger.info({ projectId }, '[ContainerManager] Container stopped and removed');
    },

    /**
     * Force remove a container (used before starting a new one).
     */
    async forceRemove(projectId: string): Promise<void> {
        const name = containerName(projectId);
        try {
            exec(`docker rm -f ${name}`);
        } catch {
            // Container doesn't exist — that's fine
        }
        containerRegistry.delete(projectId);
    },

    /**
     * Restart a container.
     */
    async restart(projectId: string): Promise<void> {
        const name = containerName(projectId);
        exec(`docker restart -t 10 ${name}`);
        logger.info({ projectId }, '[ContainerManager] Container restarted');
    },

    /**
     * Get the Docker health status of a container.
     */
    getHealth(containerId: string): 'starting' | 'healthy' | 'unhealthy' | 'none' {
        try {
            const result = exec(
                `docker inspect --format="{{.State.Health.Status}}" ${containerId}`
            );
            return result as any;
        } catch {
            return 'none';
        }
    },

    /**
     * Get the Docker state of a container (running, exited, dead, etc.)
     */
    getState(containerId: string): string {
        try {
            return exec(`docker inspect --format="{{.State.Status}}" ${containerId}`);
        } catch {
            return 'unknown';
        }
    },

    /**
     * Check if a container is running.
     */
    isRunning(projectId: string): boolean {
        const name = containerName(projectId);
        try {
            const state = exec(`docker inspect --format="{{.State.Status}}" ${name}`);
            return state === 'running';
        } catch {
            return false;
        }
    },

    /**
     * Get container logs (last N lines).
     */
    getLogs(projectId: string, lines: number = 50): string {
        const name = containerName(projectId);
        try {
            return exec(`docker logs --tail ${lines} ${name}`);
        } catch {
            return '(no logs available)';
        }
    },

    /**
     * Get resource usage stats for a container.
     */
    getStats(projectId: string): { cpu: string; memory: string } | null {
        const name = containerName(projectId);
        try {
            const raw = exec(`docker stats --no-stream --format "{{.CPUPerc}},{{.MemUsage}}" ${name}`);
            const [cpu, memory] = raw.split(',');
            return { cpu: cpu.trim(), memory: memory.trim() };
        } catch {
            return null;
        }
    },

    /**
     * Get the status of a managed container.
     */
    getStatus(projectId: string): ContainerStatus {
        return containerRegistry.get(projectId)?.status ?? 'IDLE';
    },

    /**
     * List all managed containers.
     */
    listAll(): ManagedContainer[] {
        return Array.from(containerRegistry.values());
    },

    /**
     * Check if Docker is available on this host.
     */
    isAvailable: isDockerAvailable,

    /**
     * Clean up ALL preview containers (for graceful shutdown).
     */
    async cleanupAll(): Promise<void> {
        logger.info('[ContainerManager] Cleaning up all preview containers');

        try {
            // Find all containers with our label
            const ids = exec('docker ps -aq --filter "label=ma.purpose=preview-sandbox"');
            if (ids) {
                exec(`docker rm -f ${ids.replace(/\n/g, ' ')}`);
            }
        } catch {
            // No containers to clean
        }

        containerRegistry.clear();
        logger.info('[ContainerManager] All preview containers cleaned');
    },

    /**
     * Prune dangling sandbox images older than 24h.
     */
    async pruneImages(): Promise<void> {
        try {
            exec('docker image prune -f --filter "label=purpose=preview-sandbox" --filter "until=24h"');
            logger.info('[ContainerManager] Stale sandbox images pruned');
        } catch (err) {
            logger.warn({ err }, '[ContainerManager] Image prune failed');
        }
    },
};
