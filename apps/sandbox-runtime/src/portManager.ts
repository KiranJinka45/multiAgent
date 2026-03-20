/**
 * portManager.ts
 *
 * Responsible ONLY for: port allocation and detection.
 * No DB logic. No process logic. No URL logic.
 *
 * Uses a lease table in Redis to prevent port collisions
 * across concurrent project builds.
 */

import net from 'net';
import redis from '@libs/utils';
import logger from '@libs/utils';

const PORT_START = 4100;
const PORT_END = 4999;
const PORT_LEASE_TTL = 3600; // 1 hour in seconds
const LEASE_KEY_PREFIX = 'runtime:port:lease:';

export const PortManager = {
    /**
     * Find 'count' free ports in range [PORT_START, PORT_END] that
     * are not already leased by another running project.
     */
    async acquirePorts(projectId: string, count: number = 1): Promise<number[]> {
        // Release any existing leases first (idempotent)
        await this.releasePorts(projectId);

        const acquired: number[] = [];
        
        for (let port = PORT_START; port <= PORT_END && acquired.length < count; port++) {
            // 1. Check Redis lease table
            const leaseKey = `${LEASE_KEY_PREFIX}${port}`;
            const existing = await redis.get(leaseKey);
            if (existing) continue; 

            // 2. Verify OS-level
            const free = await this.isPortFree(port);
            if (!free) continue;

            // 3. Claim
            const claimed = await redis.set(leaseKey, projectId, 'EX', PORT_LEASE_TTL, 'NX');
            if (!claimed) continue;

            acquired.push(port);
        }

        if (acquired.length < count) {
            // Rollback if we couldn't get enough
            for (const p of acquired) {
                await redis.del(`${LEASE_KEY_PREFIX}${p}`);
            }
            throw new Error(`[PortManager] Could not find ${count} free ports in range ${PORT_START}-${PORT_END}`);
        }

        // 4. Store reverse mapping: projectId → port[]
        await redis.set(`runtime:project:ports:${projectId}`, JSON.stringify(acquired), 'EX', PORT_LEASE_TTL);

        logger.info({ projectId, ports: acquired }, '[PortManager] Ports acquired');
        return acquired;
    },

    /**
     * Release all port leases held by a project.
     */
    async releasePorts(projectId: string): Promise<void> {
        const portsStr = await redis.get(`runtime:project:ports:${projectId}`);
        if (!portsStr) return;

        const ports: number[] = JSON.parse(portsStr);
        for (const port of ports) {
            await redis.del(`${LEASE_KEY_PREFIX}${port}`);
        }
        await redis.del(`runtime:project:ports:${projectId}`);

        logger.info({ projectId, ports }, '[PortManager] Ports released');
    },

    /**
     * Get the currently leased ports for a project.
     */
    async getPorts(projectId: string): Promise<number[]> {
        const portsStr = await redis.get(`runtime:project:ports:${projectId}`);
        return portsStr ? JSON.parse(portsStr) : [];
    },

    /**
     * Renew the lease TTL for all active ports.
     */
    async renewLease(projectId: string): Promise<void> {
        const portsStr = await redis.get(`runtime:project:ports:${projectId}`);
        if (!portsStr) return;

        const ports: number[] = JSON.parse(portsStr);
        for (const port of ports) {
            await redis.expire(`${LEASE_KEY_PREFIX}${port}`, PORT_LEASE_TTL);
        }
        await redis.expire(`runtime:project:ports:${projectId}`, PORT_LEASE_TTL);
    },

    /**
     * Force-acquire specific ports (used during Redis crash recovery).
     */
    async forceAcquirePorts(projectId: string, ports: number[]): Promise<void> {
        for (const port of ports) {
            await redis.set(`${LEASE_KEY_PREFIX}${port}`, projectId, 'EX', PORT_LEASE_TTL);
        }
        await redis.set(`runtime:project:ports:${projectId}`, JSON.stringify(ports), 'EX', PORT_LEASE_TTL);
        logger.info({ projectId, ports }, '[PortManager] Ports force-acquired (recovery)');
    },

    /**
     * Check whether a port is free at the OS level using a TCP probe.
     */
    isPortFree(port: number): Promise<boolean> {
        return new Promise((resolve) => {
            const server = net.createServer();
            server.unref();

            server.listen(port, '127.0.0.1', () => {
                server.close(() => resolve(true));
            });

            server.on('error', () => resolve(false));
        });
    },

    /**
     * Parse a port number from a raw stdout line.
     * Handles formats like:
     *   "Local:  http://localhost:4101"
     *   "Listening on port 4101"
     *   "Server started on http://localhost:4101"
     */
    parsePortFromOutput(line: string): number | null {
        const match = line.match(/(?:localhost|0\.0\.0\.0|127\.0\.0\.1):(\d{4,5})/);
        if (match) return parseInt(match[1], 10);

        const portMatch = line.match(/\bport\s+(\d{4,5})\b/i);
        if (portMatch) return parseInt(portMatch[1], 10);

        return null;
    },
};
