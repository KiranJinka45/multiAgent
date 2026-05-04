import { ContainerManager, ManagedContainer } from './containerManager';
import { PortManager } from './portManager';
import { PreviewRegistry } from '@packages/registry';
import { logger } from '@packages/utils';

export class PreviewRuntimePool {
    private static pool: ManagedContainer[] = [];
    private static POOL_SIZE = 3;
    private static isWarming = false;

    /**
     * Pre-warm a set of generic containers at startup.
     */
    static async prewarm() {
        if (this.isWarming) return;
        this.isWarming = true;

        logger.info({ size: this.POOL_SIZE }, '[PreviewRuntimePool] Pre-warming runtime pool...');

        for (let i = 0; i < this.POOL_SIZE; i++) {
            try {
                // We use a reserved 'pool' projectId for generic warm containers
                const projectId = `pool-template-${i}`;
                const port = await PortManager.acquireFreePort(projectId);
                
                // Start a generic container (this will build the image if needed)
                const container = await ContainerManager.start(projectId, port);
                
                this.pool.push({
                    ...container,
                    projectId,
                    port,
                    status: 'IDLE',
                    startedAt: new Date().toISOString()
                });

                logger.info({ projectId, port }, '[PreviewRuntimePool] Container warmed and added to pool');
            } catch (err) {
                logger.error({ err }, '[PreviewRuntimePool] Failed to pre-warm container');
            }
        }

        this.isWarming = false;
    }

    /**
     * Checkout a warm container from the pool.
     */
    static async checkout(projectId: string, targetPort: number): Promise<ManagedContainer | null> {
        const container = this.pool.pop();
        if (!container) return null;

        logger.info({ from: container.projectId, to: projectId, port: targetPort }, '[PreviewRuntimePool] Checking out warm container');
        return {
            ...container,
            projectId,
            port: targetPort
        };
    }

    /**
     * Assign a project to a warm runtime and inject its code.
     */
    static async assign(projectId: string, projectDir: string, _framework: string): Promise<ManagedContainer> {
        // 1. Acquire port (Service 2 requirement)
        const port = await PortManager.acquireFreePort(projectId);
        
        // 2. Try to checkout from pool
        let container = await this.checkout(projectId, port);
        
        if (!container) {
            // Slow path: Start a fresh container if pool is empty
            const result = await ContainerManager.start(projectId, port);
            container = {
                ...result,
                projectId,
                port,
                status: 'RUNNING',
                startedAt: new Date().toISOString()
            };
        } else {
            // Fast path: Hot inject into warm container
            await ContainerManager.hotInject(container.containerId, projectDir);
            logger.info({ projectId, containerId: container.containerId }, '[PreviewRuntimePool] HOT INJECTION COMPLETE');
        }

        // 3. Register in PreviewRegistry
        await PreviewRegistry.update(projectId, { 
            status: 'RUNNING',
            port: container.port
        });

        // 4. Async replenish the pool
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
}



