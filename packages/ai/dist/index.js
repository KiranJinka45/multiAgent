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
  EvaluatorService: () => EvaluatorService
});
module.exports = __toCommonJS(index_exports);

// src/evaluator.ts
var import_db = require("@libs/db");
var import_utils = __toESM(require("@libs/utils"));
var EvaluatorService = class {
  /**
   * Normalizes error counts into a 0-1 score.
   * Max errors (e.g. 50) maps to 0.0, 0 errors maps to 1.0.
   */
  static normalize(errors, max = 50) {
    return Math.max(0, 1 - errors / max);
  }
  /**
   * Evaluates a build result and returns a weighted score.
   */
  static evaluate(buildResult) {
    const metrics = {
      buildSuccess: buildResult.success ? 1 : 0,
      lintScore: this.normalize(buildResult.lintErrors || 0, 100),
      typeScore: this.normalize(buildResult.typeErrors || 0, 50),
      testScore: buildResult.totalTests ? (buildResult.testsPassed || 0) / buildResult.totalTests : 1,
      diffScore: this.normalize(buildResult.diffSize || 0, 1e3)
      // 1k lines as max
    };
    const score = 0.3 * metrics.buildSuccess + 0.2 * metrics.typeScore + 0.2 * metrics.testScore + 0.2 * metrics.lintScore + 0.1 * metrics.diffScore;
    return { score, metrics };
  }
  /**
   * Persists an evaluation record to the database.
   */
  static async recordEvaluation(params) {
    try {
      await import_db.prisma.aiEvaluation.create({
        data: {
          tenantId: params.tenantId,
          model: params.model,
          score: params.result.score,
          metrics: params.result.metrics,
          metadata: params.metadata
        }
      });
      import_utils.default.info({ model: params.model, score: params.result.score }, "[Evaluator] Recorded AI performance metric");
    } catch (err) {
      import_utils.default.error({ err }, "[Evaluator] Failed to persist evaluation");
    }
  }
  static EMA_ALPHA = 0.3;
  /**
   * Retrieves the average performance score using Exponential Moving Average (EMA).
   */
  static async getEMAPerformance(model, tenantId) {
    try {
      const records = await import_db.prisma.aiEvaluation.findMany({
        where: {
          model,
          ...tenantId ? { tenantId } : {}
        },
        orderBy: { createdAt: "desc" },
        take: 20
      });
      if (records.length === 0) return null;
      let ema = records[records.length - 1].score;
      for (let i = records.length - 2; i >= 0; i--) {
        ema = this.EMA_ALPHA * records[i].score + (1 - this.EMA_ALPHA) * ema;
      }
      return ema;
    } catch (err) {
      import_utils.default.error({ err, model }, "[Evaluator] Failed to calculate EMA performance");
      return null;
    }
  }
  /**
   * Retrieves the average score for a model over the last N records.
   */
  static async getModelPerformance(model, limit = 20) {
    try {
      const records = await import_db.prisma.aiEvaluation.findMany({
        where: { model },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { score: true }
      });
      if (records.length === 0) return null;
      const sum = records.reduce((acc, r) => acc + r.score, 0);
      return sum / records.length;
    } catch (err) {
      import_utils.default.error({ err }, "[Evaluator] Failed to fetch model performance");
      return null;
    }
  }
};
// Annotate the CommonJS export names for ESM import in node:
0 && (module.exports = {
  EvaluatorService
});
//# sourceMappingURL=index.js.map