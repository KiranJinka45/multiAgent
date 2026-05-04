/**
 * previewRuntimePool.ts
 */

import { ContainerManager, ManagedContainer } from './containerManager.js';
import { PortManager } from './portManager.js';
import { PreviewRegistry } from '@packages/registry';
import { logger } from '@packages/utils';

export class PreviewRuntimePool {
    private static pool: ManagedContainer[] = [];
    private static POOL_SIZE = 3;
    private static isWarming = false;

    static async prewarm() {
        if (this.isWarming) return;
        this.isWarming = true;
        for (let i = 0; i < this.POOL_SIZE; i++) {
            try {
                const projectId = `pool-template-${i}`;
                const port = await PortManager.acquireFreePort(projectId);
                const container = await ContainerManager.start(projectId, port);
                this.pool.push({ ...container, projectId, port, status: 'IDLE', startedAt: new Date().toISOString() });
            } catch {}
        }
        this.isWarming = false;
    }

    static async checkout(projectId: string, targetPort: number): Promise<ManagedContainer | null> {
        const container = this.pool.pop();
        if (!container) return null;
        return { ...container, projectId, port: targetPort };
    }

    static async assign(projectId: string, projectDir: string): Promise<ManagedContainer> {
        const port = await PortManager.acquireFreePort(projectId);
        let container = await this.checkout(projectId, port);
        if (!container) {
            const result = await ContainerManager.start(projectId, port);
            container = { ...result, projectId, port, status: 'RUNNING', startedAt: new Date().toISOString() };
        } else {
            await ContainerManager.hotInject(container.containerId, projectDir);
        }
        await PreviewRegistry.update(projectId, { status: 'RUNNING', port: container.port });
        this.replenish();
        return container;
    }

    static async replenish() {
        if (this.pool.length < this.POOL_SIZE) this.prewarm();
    }
}
