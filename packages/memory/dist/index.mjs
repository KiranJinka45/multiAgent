// ../memory-vector/src/index.ts
import { supabaseAdmin, logger } from "@packages/utils";
var MemoryVectorService = class _MemoryVectorService {
  static SIMILARITY_THRESHOLD = 0.9;
  async getEmbedding(text) {
    logger.debug({ length: text.length }, "[MemoryVectorService] Generating mock embedding");
    return new Array(1536).fill(0).map(() => Math.random());
  }
  async store(entry, tenantId) {
    const embedding = await this.getEmbedding(entry.content);
    const { data, error } = await supabaseAdmin.from("semantic_memories").insert({
      tenant_id: tenantId,
      project_id: entry.projectId,
      type: entry.type,
      content: entry.content,
      embedding,
      metadata: entry.metadata || {}
    });
    if (error) throw new Error(`Database Error: ${error.message}`);
    return data;
  }
  async retrieve(query, tenantId, limit = 5) {
    const embedding = await this.getEmbedding(query);
    const { data, error } = await supabaseAdmin.rpc("match_semantic_memories", {
      query_embedding: embedding,
      match_threshold: _MemoryVectorService.SIMILARITY_THRESHOLD,
      match_count: limit,
      p_tenant_id: tenantId
    });
    if (error) return [];
    return data;
  }
  async getRecentFixes(errorPattern, tenantId) {
    return await this.retrieve(errorPattern, tenantId, 3);
  }
};
var memoryVector = new MemoryVectorService();

// ../memory-cache/src/index.ts
import { redis, logger as logger2 } from "@packages/utils";
import crypto from "crypto";
var SemanticCacheService = class {
  static PREFIX = "cache:llm:";
  static TTL = 60 * 60 * 24 * 7;
  // 7-day TTL for optimization
  /**
   * Normalizes and hashes the input to create a deterministic cache key.
   */
  static generateKey(prompt, system, model) {
    const payload = JSON.stringify({
      prompt: prompt.trim(),
      system: system?.trim() || "",
      model: model || "default"
    });
    const hash = crypto.createHash("sha256").update(payload).digest("hex");
    return `${this.PREFIX}${hash}`;
  }
  /**
   * Attempt to retrieve a cached LLM response.
   */
  static async get(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      const cached = await redis.get(key);
      if (cached) {
        logger2.info({ key }, "[SemanticCache] Hit - skipping LLM invocation");
        return JSON.parse(cached);
      }
    } catch (error) {
      logger2.error({ error, key }, "[SemanticCache] Get failed");
    }
    return null;
  }
  /**
   * Persists an LLM response to the semantic cache.
   */
  static async set(prompt, response, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      await redis.set(key, JSON.stringify(response), "EX", this.TTL);
      logger2.info({ key }, "[SemanticCache] Response cached");
    } catch (error) {
      logger2.error({ error, key }, "[SemanticCache] Set failed");
    }
  }
  static async invalidate(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    await redis.del(key);
  }
};

// src/index.ts
var MemoryService = memoryVector;
export {
  MemoryService,
  MemoryVectorService,
  SemanticCacheService,
  memoryVector
};
//# sourceMappingURL=index.mjs.map