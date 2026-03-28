// src/evaluator.ts
import { db as prisma } from "@packages/db";
import logger from "@packages/utils";
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
      await prisma.aiEvaluation.create({
        data: {
          tenantId: params.tenantId,
          model: params.model,
          score: params.result.score,
          metrics: params.result.metrics,
          metadata: params.metadata
        }
      });
      logger.info({ model: params.model, score: params.result.score }, "[Evaluator] Recorded AI performance metric");
    } catch (err) {
      logger.error({ err }, "[Evaluator] Failed to persist evaluation");
    }
  }
  static EMA_ALPHA = 0.3;
  /**
   * Retrieves the average performance score using Exponential Moving Average (EMA).
   */
  static async getEMAPerformance(model, tenantId) {
    try {
      const records = await prisma.aiEvaluation.findMany({
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
      logger.error({ err, model }, "[Evaluator] Failed to calculate EMA performance");
      return null;
    }
  }
  /**
   * Retrieves the average score for a model over the last N records.
   */
  static async getModelPerformance(model, limit = 20) {
    try {
      const records = await prisma.aiEvaluation.findMany({
        where: { model },
        orderBy: { createdAt: "desc" },
        take: limit,
        select: { score: true }
      });
      if (records.length === 0) return null;
      const sum = records.reduce((acc, r) => acc + r.score, 0);
      return sum / records.length;
    } catch (err) {
      logger.error({ err }, "[Evaluator] Failed to fetch model performance");
      return null;
    }
  }
};

// src/router/modelRegistry.ts
var MODEL_REGISTRY = {
  CHEAP: {
    model: "llama-3-8b-8192",
    // Groq's cheap model
    costPer1k: 1e-4,
    quality: 0.6,
    latencyMs: 150
  },
  BALANCED: {
    model: "llama-3.3-70b-versatile",
    // Groq's balanced model
    costPer1k: 6e-4,
    quality: 0.85,
    latencyMs: 400
  },
  PREMIUM: {
    model: "mixtral-8x7b-32768",
    // Alternative premium or could be gpt-4 via another provider
    costPer1k: 2e-3,
    quality: 0.95,
    latencyMs: 800
  }
};

// src/router/modelRouter.ts
function estimateComplexity(context) {
  let score = 0;
  if ((context.fileCount || 0) > 10) score += 0.3;
  if ((context.errorDepth || 0) > 2) score += 0.3;
  if (context.hasBackendLogic) score += 0.2;
  if (context.usesAuth || context.usesDB) score += 0.2;
  return Math.min(score, 1);
}
async function selectModel(task, context) {
  const complexity = estimateComplexity(context);
  const failCount = context.failCount || 0;
  if (failCount >= 2) return MODEL_REGISTRY.PREMIUM;
  if (failCount === 1) return MODEL_REGISTRY.BALANCED;
  const cheapPerformance = await EvaluatorService.getEMAPerformance(MODEL_REGISTRY.CHEAP.model);
  const balancedPerformance = await EvaluatorService.getEMAPerformance(MODEL_REGISTRY.BALANCED.model);
  const ESCALATION_THRESHOLD = 0.6;
  let forcedEscalation = false;
  if (cheapPerformance !== null && cheapPerformance < ESCALATION_THRESHOLD) {
    forcedEscalation = true;
  }
  if (task === "planning") return MODEL_REGISTRY.PREMIUM;
  if (task === "security-scan") return MODEL_REGISTRY.BALANCED;
  if (task === "debug") {
    const base = complexity > 0.6 ? MODEL_REGISTRY.BALANCED : MODEL_REGISTRY.CHEAP;
    if (forcedEscalation && base === MODEL_REGISTRY.CHEAP) return MODEL_REGISTRY.BALANCED;
    return base;
  }
  if (task === "code-gen") {
    const base = complexity > 0.7 ? MODEL_REGISTRY.PREMIUM : MODEL_REGISTRY.BALANCED;
    if (balancedPerformance !== null && balancedPerformance < 0.6 && base === MODEL_REGISTRY.BALANCED) {
      return MODEL_REGISTRY.PREMIUM;
    }
    return base;
  }
  const final = complexity > 0.5 ? MODEL_REGISTRY.BALANCED : MODEL_REGISTRY.CHEAP;
  if (forcedEscalation && final === MODEL_REGISTRY.CHEAP) return MODEL_REGISTRY.BALANCED;
  return final;
}
export {
  EvaluatorService,
  MODEL_REGISTRY,
  estimateComplexity,
  selectModel
};
//# sourceMappingURL=index.mjs.map