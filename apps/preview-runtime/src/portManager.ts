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
     * Find a free port in range [PORT_START, PORT_END] that
     * is not already leased by another running project.
     *
     * Returns the port number.
     * Throws if no free port is found.
     */
    async acquireFreePort(projectId: string): Promise<number> {
        // Release any existing lease first (idempotent)
        await this.releasePort(projectId);

        for (let port = PORT_START; port <= PORT_END; port++) {
            // 1. Check Redis lease table
            const leaseKey = `${LEASE_KEY_PREFIX}${port}`;
            const existing = await redis.get(leaseKey);
            if (existing) continue; // Port is leased by another project

            // 2. Verify the OS-level port is actually free
            const free = await this.isPortFree(port);
            if (!free) continue;

            // 3. Atomically claim the port with SETNX
            const claimed = await redis.set(leaseKey, projectId, 'EX', PORT_LEASE_TTL, 'NX');
            if (!claimed) continue; // Race condition — another process claimed it

            // 4. Store reverse mapping: projectId → port
            await redis.set(`runtime:project:port:${projectId}`, port.toString(), 'EX', PORT_LEASE_TTL);

            logger.info({ projectId, port }, '[PortManager] Port acquired');
            return port;
        }

        throw new Error(`[PortManager] No free ports available in range ${PORT_START}-${PORT_END}`);
    },

    /**
     * Release the port lease held by a project.
     */
    async releasePort(projectId: string): Promise<void> {
        const portStr = await redis.get(`runtime:project:port:${projectId}`);
        if (!portStr) return;

        const port = parseInt(portStr, 10);
        await redis.del(`${LEASE_KEY_PREFIX}${port}`);
        await redis.del(`runtime:project:port:${projectId}`);

        logger.info({ projectId, port }, '[PortManager] Port released');
    },

    /**
     * Get the currently leased port for a project.
     */
    async getPort(projectId: string): Promise<number | null> {
        const portStr = await redis.get(`runtime:project:port:${projectId}`);
        return portStr ? parseInt(portStr, 10) : null;
    },

    /**
     * Renew the lease TTL for an active port (call this from health monitor).
     */
    async renewLease(projectId: string): Promise<void> {
        const portStr = await redis.get(`runtime:project:port:${projectId}`);
        if (!portStr) return;

        const port = parseInt(portStr, 10);
        await redis.expire(`${LEASE_KEY_PREFIX}${port}`, PORT_LEASE_TTL);
        await redis.expire(`runtime:project:port:${projectId}`, PORT_LEASE_TTL);
    },

    /**
     * Force-acquire a specific port (used during Redis crash recovery).
     * Bypasses SETNX since after Redis restart all prior leases are gone.
     */
    async forceAcquirePort(projectId: string, port: number): Promise<void> {
        const leaseKey = `${LEASE_KEY_PREFIX}${port}`;
        await redis.set(leaseKey, projectId, 'EX', PORT_LEASE_TTL);
        await redis.set(`runtime:project:port:${projectId}`, port.toString(), 'EX', PORT_LEASE_TTL);
        logger.info({ projectId, port }, '[PortManager] Port force-acquired (recovery)');
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
