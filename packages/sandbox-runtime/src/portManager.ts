import Bridge from '@packages/utils';

const { PortManager: BridgePort } = Bridge as any;

/**
 * portManager.ts
 *
 * Proxy implementation that delegates to the centralized Bridge.
 * Restored from .d.ts signature to resolve broken stub.
 */
export const PortManager = {
    async acquirePorts(projectId: string, count?: number): Promise<number[]> {
        return BridgePort.acquirePorts(projectId, count);
    },

    async releasePorts(projectId: string): Promise<void> {
        return BridgePort.releasePorts(projectId);
    },

    async getPorts(projectId: string): Promise<number[]> {
        return BridgePort.getPorts(projectId);
    },

    async renewLease(projectId: string): Promise<void> {
        return BridgePort.renewLease(projectId);
    },

    async forceAcquirePorts(projectId: string, ports: number[]): Promise<void> {
        return BridgePort.forceAcquirePorts(projectId, ports);
    },

    async forceAcquirePort(projectId: string, port: number): Promise<void> {
        return BridgePort.forceAcquirePorts(projectId, [port]);
    },

    async isPortFree(port: number): Promise<boolean> {
        return BridgePort.isPortFree(port);
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

