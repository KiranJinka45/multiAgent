/**
 * runtimeGuard.ts
 *
 * Security and resource safety layer for the Runtime Layer.
 */

import crypto from 'crypto';
import path from 'path';
import { logger } from '@packages/utils';

const PREVIEW_SECRET = process.env.PREVIEW_SIGNING_SECRET || 'dev-secret-change-in-production';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
const INACTIVITY_SHUTDOWN_MS = 30 * 60 * 1000; // 30 minutes
const ALLOWED_PREVIEW_HOSTS = ['localhost', '127.0.0.1'];
const PROJECTS_ROOT = process.env.GENERATED_PROJECTS_ROOT
    || path.join(process.cwd(), '.generated-projects');

export const RuntimeGuard = {
    resolveProjectPath(projectId: string): string {
        if (!/^[a-zA-Z0-9-_]+$/.test(projectId)) {
            throw new Error(`[RuntimeGuard] Invalid projectId format: "${projectId}"`);
        }

        const resolved = path.resolve(PROJECTS_ROOT, projectId);
        if (!resolved.startsWith(path.resolve(PROJECTS_ROOT))) {
            throw new Error(`[RuntimeGuard] Path traversal attempt detected for projectId="${projectId}"`);
        }

        return resolved;
    },

    generateToken(projectId: string): { token: string; expiresAt: number } {
        const expiresAt = Math.floor(Date.now() / 1000) + SIGNED_URL_TTL_SECONDS;
        const payload = `${projectId}:${expiresAt}`;
        const token = crypto
            .createHmac('sha256', PREVIEW_SECRET)
            .update(payload)
            .digest('hex')
            .slice(0, 32);

        return { token, expiresAt };
    },

    verifyToken(projectId: string, token: string, expiresAt: number): boolean {
        const now = Math.floor(Date.now() / 1000);
        if (now > expiresAt) {
            logger.warn({ projectId }, '[RuntimeGuard] Preview token expired');
            return false;
        }

        const payload = `${projectId}:${expiresAt}`;
        const expected = crypto
            .createHmac('sha256', PREVIEW_SECRET)
            .update(payload)
            .digest('hex')
            .slice(0, 32);

        try {
            return crypto.timingSafeEqual(
                Buffer.from(token, 'hex'),
                Buffer.from(expected, 'hex')
            );
        } catch {
            return false;
        }
    },

    validateProxyTarget(url: string, allowedPort: number, allowInternalCluster = false): void {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw new Error(`[RuntimeGuard] Invalid proxy target URL: ${url}`);
        }

        const isLocal = ALLOWED_PREVIEW_HOSTS.includes(parsed.hostname);

        if (!isLocal && !allowInternalCluster) {
            throw new Error(`[RuntimeGuard] SSRF: hostname "${parsed.hostname}" is not allowed`);
        }

        const port = parseInt(parsed.port || '80');
        if (port !== allowedPort) {
            throw new Error(`[RuntimeGuard] SSRF: port ${port} does not match leased port ${allowedPort}`);
        }

        if (parsed.protocol !== 'http:') {
            throw new Error(`[RuntimeGuard] Only http: protocol allowed for proxy targets`);
        }
    },

    async isInactive(projectId: string, lastActivityAt: string | null): Promise<boolean> {
        if (!lastActivityAt) return false;

        const idleMs = Date.now() - new Date(lastActivityAt).getTime();
        const inactive = idleMs > INACTIVITY_SHUTDOWN_MS;

        if (inactive) {
            logger.info({ projectId, idleMs, thresholdMs: INACTIVITY_SHUTDOWN_MS },
                '[RuntimeGuard] Project inactive — eligible for shutdown');
        }

        return inactive;
    },

    safeSpawnOptions(cwd: string, env: Record<string, string> = {}): any {
        const { getSafeEnv } = require('@packages/utils');
        
        return {
            cwd,
            env: getSafeEnv(env),
            detached: false,
            shell: false,
            stdio: ['ignore', 'pipe', 'pipe'] as const,
            windowsHide: true,
        };
    },
};




