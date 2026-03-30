/**
 * preview-registry.ts — Bridge module
 *
 * Several files import from './preview-registry' (kebab-case) expecting a
 * singleton instance with methods like lookup(), getPreviewId(), getAll(),
 * updateStatus(), heartbeat().  The canonical implementation lives in
 * './previewRegistry' (camelCase) and exports a plain object named
 * `PreviewRegistry`.
 *
 * This bridge adapts the canonical API so that existing consumers continue
 * to work without modification.
 */

import { PreviewRegistry, RuntimeRecord } from './previewRegistry';

// Re-export canonical types so consumers can reference them
export type { RuntimeRecord };

export const previewRegistry = {
    /** Resolve by previewId (UUID) */
    async lookup(previewId: string) {
        // Try as previewId first
        const byPreview = await PreviewRegistry.lookupByPreviewId(previewId);
        if (byPreview) return mapToLegacy(byPreview);

        // Fallback: treat as projectId
        const byProject = await PreviewRegistry.get(previewId);
        if (byProject) return mapToLegacy(byProject);

        return null;
    },

    /** Map projectId → previewId */
    async getPreviewId(projectId: string): Promise<string | null> {
        const rec = await PreviewRegistry.get(projectId);
        return rec?.previewId ?? null;
    },

    /** Return all active records in legacy shape */
    async getAll() {
        const records = await PreviewRegistry.listAll();
        return records.map(mapToLegacy);
    },

    /** Update status by previewId */
    async updateStatus(previewId: string, status: string) {
        const rec = await PreviewRegistry.lookupByPreviewId(previewId);
        if (!rec) return;
        await PreviewRegistry.update(rec.projectId, { status: status.toUpperCase() as any });
    },

    /** Record a heartbeat access */
    async heartbeat(previewId: string) {
        const rec = await PreviewRegistry.lookupByPreviewId(previewId);
        if (rec) {
            await PreviewRegistry.update(rec.projectId, {
                lastHeartbeatAt: new Date().toISOString(),
            });
        }
    },

    /** Register a new preview record */
    async register(projectId: string, host: string, port: number) {
        const record = await PreviewRegistry.init(projectId, 'bridge-' + projectId);
        await PreviewRegistry.update(projectId, {
            port,
            previewUrl: `http://${host}:${port}`,
        });
        return record.previewId;
    },

    /** Unregister / cleanup */
    async unregisterByProject(projectId: string) {
        await PreviewRegistry.delete(projectId);
    },
};

/** Map a RuntimeRecord to the legacy shape some consumers expect */
function mapToLegacy(rec: RuntimeRecord) {
    return {
        previewId: rec.previewId || '',
        projectId: rec.projectId || '',
        status: rec.status?.toLowerCase() ?? 'unknown',
        containerHost: 'localhost',
        containerPort: rec.port ?? 0,
        accessToken: rec.accessToken ?? '',
        createdAt: rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now(),
        lastAccessedAt: rec.lastHeartbeatAt
            ? new Date(rec.lastHeartbeatAt).getTime()
            : (rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now()),
    };
}
