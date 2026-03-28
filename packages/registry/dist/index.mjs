// src/previewRegistry.ts
import { redis, logger } from "@packages/utils/src/server";
import crypto from "crypto";
var REGISTRY_KEY_PREFIX = "runtime:registry:";
var PREVIEW_ID_MAP_PREFIX = "runtime:idmap:";
var REGISTRY_TTL = 86400;
var PreviewRegistry = {
  /**
   * Create or reset a runtime record for a project.
   */
  async init(projectId, executionId, userId) {
    const existing = await this.get(projectId);
    const previewId = existing?.previewId || crypto.randomUUID();
    const record = {
      previewId,
      projectId,
      executionId,
      userId,
      status: "PROVISIONED",
      previewUrl: null,
      ports: [],
      pids: [],
      accessToken: existing?.accessToken || crypto.randomUUID(),
      startedAt: existing?.startedAt || (/* @__PURE__ */ new Date()).toISOString(),
      updatedAt: (/* @__PURE__ */ new Date()).toISOString(),
      healthChecks: 0,
      runtimeVersion: existing ? existing.runtimeVersion || 1 : 1,
      crashCount: existing?.crashCount || 0,
      restartDisabled: existing?.restartDisabled || false
    };
    await this.save(record);
    logger.info({ projectId, executionId, previewId }, "[PreviewRegistry] Record initialized (stable)");
    return record;
  },
  /**
   * Update specific fields on a runtime record.
   */
  async update(projectId, patch) {
    const existing = await this.get(projectId);
    if (!existing) {
      logger.warn({ projectId }, "[PreviewRegistry] Update on non-existent record");
      return null;
    }
    const updated = {
      ...existing,
      ...patch,
      updatedAt: (/* @__PURE__ */ new Date()).toISOString()
    };
    await this.save(updated);
    logger.info({ projectId, status: updated.status, previewUrl: updated.previewUrl }, "[PreviewRegistry] Record updated");
    return updated;
  },
  /**
   * Mark a runtime as RUNNING with the live preview URL.
   */
  async markRunning(projectId, previewUrl, ports, pids) {
    return this.update(projectId, { status: "RUNNING", previewUrl, ports, pids });
  },
  /**
   * Mark a runtime as FAILED with a reason.
   */
  async markFailed(projectId, reason) {
    return this.update(projectId, { status: "FAILED", failureReason: reason });
  },
  /**
   * Mark a runtime as STOPPED.
   */
  async markStopped(projectId) {
    return this.update(projectId, { status: "STOPPED", previewUrl: null, pids: [], ports: [] });
  },
  /**
   * Record a successful health check ping.
   */
  async recordHealthCheck(projectId) {
    const existing = await this.get(projectId);
    if (!existing) return;
    await this.update(projectId, {
      healthChecks: existing.healthChecks + 1,
      lastHealthCheck: (/* @__PURE__ */ new Date()).toISOString()
    });
  },
  /**
   * Retrieve the full runtime record.
   */
  async get(projectId) {
    const raw = await redis.get(`${REGISTRY_KEY_PREFIX}${projectId}`);
    if (!raw) return null;
    return JSON.parse(raw);
  },
  /**
   * Lookup a record by its unique previewId (UUID).
   */
  async lookupByPreviewId(previewId) {
    const projectId = await redis.get(`${PREVIEW_ID_MAP_PREFIX}${previewId}`);
    if (!projectId) return null;
    return this.get(projectId);
  },
  /**
   * Get just the preview URL for a project.
   */
  async getPreviewUrl(projectId) {
    const record = await this.get(projectId);
    return record?.previewUrl ?? null;
  },
  /**
   * Persist a record to Redis.
   */
  async save(record) {
    const pipeline = redis.pipeline();
    pipeline.setex(
      `${REGISTRY_KEY_PREFIX}${record.projectId}`,
      REGISTRY_TTL,
      JSON.stringify(record)
    );
    pipeline.setex(
      `${PREVIEW_ID_MAP_PREFIX}${record.previewId}`,
      REGISTRY_TTL,
      record.projectId
    );
    await pipeline.exec();
  },
  /**
   * Delete the runtime record (cleanup).
   */
  async delete(projectId) {
    await redis.del(`${REGISTRY_KEY_PREFIX}${projectId}`);
  },
  /**
   * Remove a record (alias for delete — used by cleanup/evictor).
   */
  async remove(projectId) {
    await this.delete(projectId);
  },
  /**
   * Get all active runtime records (for monitoring/admin).
   * WARNING: Uses KEYS — only use in admin tools, never in hot paths.
   */
  async listAll() {
    const keys = await redis.keys(`${REGISTRY_KEY_PREFIX}*`);
    if (!keys.length) return [];
    const values = await redis.mget(...keys);
    return values.filter(Boolean).map((v) => JSON.parse(v));
  }
};

// src/preview-registry.ts
var previewRegistry = {
  /** Resolve by previewId (UUID) */
  async lookup(previewId) {
    const byPreview = await PreviewRegistry.lookupByPreviewId(previewId);
    if (byPreview) return mapToLegacy(byPreview);
    const byProject = await PreviewRegistry.get(previewId);
    if (byProject) return mapToLegacy(byProject);
    return null;
  },
  /** Map projectId → previewId */
  async getPreviewId(projectId) {
    const rec = await PreviewRegistry.get(projectId);
    return rec?.previewId ?? null;
  },
  /** Return all active records in legacy shape */
  async getAll() {
    const records = await PreviewRegistry.listAll();
    return records.map(mapToLegacy);
  },
  /** Update status by previewId */
  async updateStatus(previewId, status) {
    const rec = await PreviewRegistry.lookupByPreviewId(previewId);
    if (!rec) return;
    await PreviewRegistry.update(rec.projectId, { status: status.toUpperCase() });
  },
  /** Record a heartbeat access */
  async heartbeat(previewId) {
    const rec = await PreviewRegistry.lookupByPreviewId(previewId);
    if (rec) {
      await PreviewRegistry.update(rec.projectId, {
        lastHeartbeatAt: (/* @__PURE__ */ new Date()).toISOString()
      });
    }
  },
  /** Register a new preview record */
  async register(projectId, host, port) {
    const record = await PreviewRegistry.init(projectId, "bridge-" + projectId);
    await PreviewRegistry.update(projectId, {
      port,
      previewUrl: `http://${host}:${port}`
    });
    return record.previewId;
  },
  /** Unregister / cleanup */
  async unregisterByProject(projectId) {
    await PreviewRegistry.delete(projectId);
  }
};
function mapToLegacy(rec) {
  return {
    previewId: rec.previewId,
    projectId: rec.projectId,
    status: rec.status?.toLowerCase() ?? "unknown",
    containerHost: "localhost",
    containerPort: rec.port ?? 0,
    accessToken: rec.accessToken ?? null,
    createdAt: rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now(),
    lastAccessedAt: rec.lastHeartbeatAt ? new Date(rec.lastHeartbeatAt).getTime() : rec.startedAt ? new Date(rec.startedAt).getTime() : Date.now()
  };
}
export {
  PreviewRegistry,
  previewRegistry
};
//# sourceMappingURL=index.mjs.map