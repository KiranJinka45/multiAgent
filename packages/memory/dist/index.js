"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);

// src/index.ts
var index_exports = {};
__export(index_exports, {
  MemoryService: () => MemoryService,
  MemoryVectorService: () => MemoryVectorService,
  SemanticCacheService: () => SemanticCacheService,
  memoryVector: () => memoryVector
});
module.exports = __toCommonJS(index_exports);

// ../memory-vector/src/index.ts
var import_utils = require("@packages/utils");
var MemoryVectorService = class _MemoryVectorService {
  static SIMILARITY_THRESHOLD = 0.9;
  async getEmbedding(text) {
    import_utils.logger.debug({ length: text.length }, "[MemoryVectorService] Generating mock embedding");
    return new Array(1536).fill(0).map(() => Math.random());
  }
  async store(entry, tenantId) {
    const embedding = await this.getEmbedding(entry.content);
    const { data, error } = await import_utils.supabaseAdmin.from("semantic_memories").insert({
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
    const { data, error } = await import_utils.supabaseAdmin.rpc("match_semantic_memories", {
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
var import_utils2 = require("@packages/utils");
var import_crypto = __toESM(require("crypto"));
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
    const hash = import_crypto.default.createHash("sha256").update(payload).digest("hex");
    return `${this.PREFIX}${hash}`;
  }
  /**
   * Attempt to retrieve a cached LLM response.
   */
  static async get(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      const cached = await import_utils2.redis.get(key);
      if (cached) {
        import_utils2.logger.info({ key }, "[SemanticCache] Hit - skipping LLM invocation");
        return JSON.parse(cached);
      }
    } catch (error) {
      import_utils2.logger.error({ error, key }, "[SemanticCache] Get failed");
    }
    return null;
  }
  /**
   * Persists an LLM response to the semantic cache.
   */
  static async set(prompt, response, system, model) {
    const key = this.generateKey(prompt, system, model);
    try {
      await import_utils2.redis.set(key, JSON.stringify(response), "EX", this.TTL);
      import_utils2.logger.info({ key }, "[SemanticCache] Response cached");
    } catch (error) {
      import_utils2.logger.error({ error, key }, "[SemanticCache] Set failed");
    }
  }
  static async invalidate(prompt, system, model) {
    const key = this.generateKey(prompt, system, model);
    await import_utils2.redis.del(key);
  }
};

// src/index.ts
var MemoryService = memoryVector;
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  MemoryService,
  MemoryVectorService,
  SemanticCacheService,
  memoryVector
});
//# sourceMappingURL=index.js.map