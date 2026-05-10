/**
 * portManager.ts
 *
 * Proxy implementation that delegates to the centralized Bridge in @packages/utils.
 * Uses lazy loading to avoid circular dependency crashes.
 */

const getBridgePort = () => {
    try {
        const utils = require('@packages/utils');
        return utils.PortManager;
    } catch (e) {
        // Fallback or early return during initialization
        return null;
    }
};

export const PortManager = {
    async acquirePorts(projectId: string, count?: number): Promise<number[]> {
        const bp = getBridgePort();
        if (!bp) throw new Error('PortManager not initialized in Bridge');
        return bp.acquirePorts(projectId, count);
    },

    async releasePorts(projectId: string): Promise<void> {
        const bp = getBridgePort();
        if (!bp) return;
        return bp.releasePorts(projectId);
    },

    async getPorts(projectId: string): Promise<number[]> {
        const bp = getBridgePort();
        if (!bp) return [];
        return bp.getPorts(projectId);
    },

    async renewLease(projectId: string): Promise<void> {
        const bp = getBridgePort();
        if (!bp) return;
        return bp.renewLease(projectId);
    },

    async forceAcquirePorts(projectId: string, ports: number[]): Promise<void> {
        const bp = getBridgePort();
        if (!bp) return;
        return bp.forceAcquirePorts(projectId, ports);
    },

    async forceAcquirePort(projectId: string, port: number): Promise<void> {
        const bp = getBridgePort();
        if (!bp) return;
        return bp.forceAcquirePorts(projectId, [port]);
    },

    async isPortFree(port: number): Promise<boolean> {
        const bp = getBridgePort();
        if (!bp) return true;
        return bp.isPortFree(port);
    },

    async acquireFreePort(projectId: string): Promise<number> {
        const bp = getBridgePort();
        if (!bp) return 3000;
        return bp.acquireFreePort(projectId);
    },

    parsePortFromOutput(line: string): number | null {
        // Simple regex matcher for common port output formats
        const match = line.match(/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d+)/i);
        if (match) return parseInt(match[1], 10);
        
        const listeningMatch = line.match(/port (\d+)/i);
        if (listeningMatch) return parseInt(listeningMatch[1], 10);
        
        return null;
    }
};
