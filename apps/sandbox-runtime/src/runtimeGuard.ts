/**
 * runtimeGuard.ts
 *
 * Security and resource safety layer for the Runtime Layer.
 *
 * Responsibilities:
 *  - Validate generated project paths (prevent path traversal)
 *  - Generate signed preview URLs (HMAC-based, time-limited)
 *  - Verify signed preview tokens
 *  - Prevent SSRF via proxy validation
 *  - Enforce inactivity TTL (auto-shutdown after N minutes idle)
 *
 * No process logic. No port logic. No DB logic.
 */

import crypto from 'crypto';
import path from 'path';
import logger from '@libs/utils';

// ─── Config ────────────────────────────────────────────────────────────────

const PREVIEW_SECRET = process.env.PREVIEW_SIGNING_SECRET || 'dev-secret-change-in-production';
const SIGNED_URL_TTL_SECONDS = 3600; // 1 hour
const INACTIVITY_SHUTDOWN_MS = 30 * 60 * 1000; // 30 minutes
const ALLOWED_PREVIEW_HOSTS = ['localhost', '127.0.0.1'];
const PROJECTS_ROOT = process.env.GENERATED_PROJECTS_ROOT
    || path.join(process.cwd(), '.generated-projects');

// ─── Guard ─────────────────────────────────────────────────────────────────

export const RuntimeGuard = {
    // ── Path Safety ──────────────────────────────────────────────────────────

    /**
     * Resolve and validate that a project directory is within the allowed root.
     * Prevents path traversal attacks (e.g. projectId = "../../etc/passwd").
     *
     * Throws if the resolved path escapes PROJECTS_ROOT.
     */
    resolveProjectPath(projectId: string): string {
        // Allow alphanumeric + hyphen/underscore project IDs
        if (!/^[a-zA-Z0-9-_]+$/.test(projectId)) {
            throw new Error(`[RuntimeGuard] Invalid projectId format: "${projectId}"`);
        }

        const resolved = path.resolve(PROJECTS_ROOT, projectId);
        if (!resolved.startsWith(path.resolve(PROJECTS_ROOT))) {
            throw new Error(`[RuntimeGuard] Path traversal attempt detected for projectId="${projectId}"`);
        }

        return resolved;
    },

    // ── Signed Preview URLs ───────────────────────────────────────────────────

    /**
     * Generate a time-limited signed token for accessing a preview.
     * Token = HMAC-SHA256(projectId + ":" + expiresAt, secret)[:16]
     *
     * In production, embed this in the preview iframe URL as ?token=xxx
     */
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

    /**
     * Verify a signed token. Returns true if valid and not expired.
     */
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

        // Constant-time comparison to prevent timing attacks
        try {
            return crypto.timingSafeEqual(
                Buffer.from(token, 'hex'),
                Buffer.from(expected, 'hex')
            );
        } catch {
            return false;
        }
    },

    // ── SSRF Prevention ───────────────────────────────────────────────────────

    /**
     * Validate that a proxy upstream URL is safe.
     * Only allows connections to localhost (or cluster internal IPs) on permitted ports.
     *
     * Throws if the URL is not allowed.
     */
    validateProxyTarget(url: string, allowedPort: number, allowInternalCluster = false): void {
        let parsed: URL;
        try {
            parsed = new URL(url);
        } catch {
            throw new Error(`[RuntimeGuard] Invalid proxy target URL: ${url}`);
        }

        const isLocal = ALLOWED_PREVIEW_HOSTS.includes(parsed.hostname);

        // In Phase 5, we allow internal cluster nodes if requested
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

    // ── Inactivity TTL ────────────────────────────────────────────────────────

    /**
     * Check if a project has been inactive for longer than INACTIVITY_SHUTDOWN_MS.
     * Called by the cleanup worker.
     */
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

    // ── Resource Limits (spawn options) ──────────────────────────────────────

    /**
     * Returns safe spawn options to limit resource exposure.
     * These are the options to pass to child_process.spawn().
     */
    safeSpawnOptions(cwd: string, env: Record<string, string> = {}): any {
        const { getSafeEnv } = require('@libs/utils'); // Deferred to avoid circularity if any
        
        return {
            cwd,
            env: getSafeEnv(env),
            detached: false,   // Process dies with parent
            shell: false,       // No shell injection
            stdio: ['ignore', 'pipe', 'pipe'] as const,
            windowsHide: true,  // Hide console on Windows
        };
    },
};
