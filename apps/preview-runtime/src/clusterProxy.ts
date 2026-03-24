/**
 * clusterProxy.ts
 *
 * Phase 5 — Distributed Reverse Proxy Layer
 *
 * Responsible for routing incoming preview requests to the correct
 * worker node in the cluster.
 *
 * Strategy:
 *  1. Parse projectId from Host header (e.g. {projectId}.preview.domain.com)
 *  2. Lookup assignment in Redis (cluster:assignment:{projectId})
 *  3. Identify target node and internal port
 *  4. Proxy request to http://{nodeInternalIp}:{port}
 *  5. Handle sticky sessions (cookie-based or IP-based)
 */

import { RuntimeScheduler } from './cluster/runtimeScheduler';
import { NodeRegistry } from './cluster/nodeRegistry';
import { PreviewRegistry } from '@libs/registry';
import redis from '@libs/utils';
import logger from '@libs/utils';

// ─── Config ────────────────────────────────────────────────────────────────

const PREVIEW_DOMAIN = process.env.PREVIEW_BASE_DOMAIN || 'preview.multiagent.com';
const INTERNAL_PORT = 3000; // Next.js internal port

export interface ProxyTarget {
    projectId: string;
    nodeId: string;
    hostname: string;
    port: number;
    url: string;
}

// ─── Cluster Proxy ─────────────────────────────────────────────────────────

export const ClusterProxy = {
    /**
     * Resolve the target worker node for a given request.
     * Supports both path-based (/preview/:id) and domain-based (id.preview.com).
     */
    async resolveTarget(input: string): Promise<ProxyTarget | null> {
        const projectId = this.extractProjectId(input);
        if (!projectId) return null;

        // 1. Lookup which node is hosting this project
        const assignment = await RuntimeScheduler.getAssignment(projectId);
        if (!assignment) {
            logger.warn({ projectId }, '[ClusterProxy] No assignment found for project');
            return null;
        }

        const { nodeId } = assignment;

        // 2. Get the node's internal network details
        const node = await NodeRegistry.getNode(nodeId);
        if (!node) {
            logger.error({ nodeId, projectId }, '[ClusterProxy] Assigned node not found in registry');
            return null;
        }

        // 3. Get the specific port from the registry (it might have changed on restart)
        const record = await PreviewRegistry.get(projectId);
        if (!record || !record.port) {
            logger.warn({ projectId }, '[ClusterProxy] No port found in registry for project');
            return null;
        }

        const target: ProxyTarget = {
            projectId,
            nodeId,
            hostname: node.hostname,
            port: record.port,
            url: `http://${node.hostname}:${record.port}`,
        };

        return target;
    },

    /**
     * Extract projectId from Host header or URL path.
     * Examples:
     *   "prj-123.preview.multiagent.com" -> "prj-123"
     *   "/preview/prj-123" -> "prj-123"
     */
    extractProjectId(input: string): string | null {
        // Domain-based check
        if (input.includes(PREVIEW_DOMAIN)) {
            const part = input.split(`.${PREVIEW_DOMAIN}`)[0];
            if (part && part !== input) return part;
        }

        // Path-based check (if input is a path)
        const pathMatch = input.match(/\/preview\/([^\/\?]+)/);
        if (pathMatch) return pathMatch[1];

        // Direct ID check (fallback)
        if (input.length >= 8 && !input.includes('.') && !input.includes('/')) {
            return input;
        }

        return null;
    },

    /**
     * Generate the public URL for a preview.
     * Uses wildcards if configured, otherwise falls back to path-based.
     */
    getPublicUrl(projectId: string): string {
        const useWildcards = process.env.PREVIEW_USE_WILDCARDS === 'true';
        const protocol = process.env.NODE_ENV === 'production' ? 'https' : 'http';

        if (useWildcards) {
            return `${protocol}://${projectId}.${PREVIEW_DOMAIN}`;
        }

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        return `${appUrl}/preview/${projectId}`;
    },

    /**
     * Middleware helper for Next.js /api/preview-proxy rewrite logic.
     * In a multi-node cluster, the "proxy target" is no longer always localhost.
     */
    async getRewriteUrl(projectId: string): Promise<string | null> {
        const target = await this.resolveTarget(projectId);
        if (!target) return null;

        return target.url;
    },
};
