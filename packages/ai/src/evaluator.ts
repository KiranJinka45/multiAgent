import { db as prisma } from '@libs/db';
import logger from '@libs/utils';

export interface EvalMetrics {
  buildSuccess: number;
  lintScore: number;
  typeScore: number;
  testScore: number;
  diffScore: number;
}

export interface EvalResult {
  score: number;
  metrics: EvalMetrics;
}

export class EvaluatorService {
  /**
   * Normalizes error counts into a 0-1 score.
   * Max errors (e.g. 50) maps to 0.0, 0 errors maps to 1.0.
   */
  private static normalize(errors: number, max: number = 50): number {
    return Math.max(0, 1 - errors / max);
  }

  /**
   * Evaluates a build result and returns a weighted score.
   */
  public static evaluate(
    buildResult: {
      success: boolean;
      lintErrors?: number;
      typeErrors?: number;
      testsPassed?: number;
      totalTests?: number;
      diffSize?: number;
    }
  ): EvalResult {
    const metrics: EvalMetrics = {
      buildSuccess: buildResult.success ? 1 : 0,
      lintScore: this.normalize(buildResult.lintErrors || 0, 100),
      typeScore: this.normalize(buildResult.typeErrors || 0, 50),
      testScore: buildResult.totalTests ? (buildResult.testsPassed || 0) / buildResult.totalTests : 1,
      diffScore: this.normalize(buildResult.diffSize || 0, 1000) // 1k lines as max
    };

    // Weighted average: 30% Build, 20% Type, 20% Test, 20% Lint, 10% Diff
    const score = (
      0.3 * metrics.buildSuccess +
      0.2 * metrics.typeScore +
      0.2 * metrics.testScore +
      0.2 * metrics.lintScore +
      0.1 * metrics.diffScore
    );

    return { score, metrics };
  }

  /**
   * Persists an evaluation record to the database.
   */
  public static async recordEvaluation(params: {
    tenantId: string;
    model: string;
    result: EvalResult;
    metadata?: Record<string, unknown>;
  }): Promise<void> {
    try {
      await prisma.aiEvaluation.create({
        data: {
          tenantId: params.tenantId,
          model: params.model,
          score: params.result.score,
          metrics: params.result.metrics as any,
          metadata: params.metadata as any
        }
      });
      logger.info({ model: params.model, score: params.result.score }, '[Evaluator] Recorded AI performance metric');
    } catch (err: unknown) {
      logger.error({ err }, '[Evaluator] Failed to persist evaluation');
    }
  }

  private static EMA_ALPHA = 0.3;

  /**
   * Retrieves the average performance score using Exponential Moving Average (EMA).
   */
  public static async getEMAPerformance(model: string, tenantId?: string): Promise<number | null> {
    try {
      const records = await prisma.aiEvaluation.findMany({
        where: { 
          model,
          ...(tenantId ? { tenantId } : {})
        },
        orderBy: { createdAt: 'desc' },
        take: 20
      });

      if (records.length === 0) return null;

      // Newest is at index 0, oldest at index length-1
      let ema = records[records.length - 1].score;
      for (let i = records.length - 2; i >= 0; i--) {
        ema = (this.EMA_ALPHA * records[i].score) + (1 - this.EMA_ALPHA) * ema;
      }

      return ema;
    } catch (err: unknown) {
      logger.error({ err, model }, '[Evaluator] Failed to calculate EMA performance');
      return null;
    }
  }

  /**
   * Retrieves the average score for a model over the last N records.
   */
  public static async getModelPerformance(model: string, limit: number = 20): Promise<number | null> {
    try {
      const records = await prisma.aiEvaluation.findMany({
        where: { model },
        orderBy: { createdAt: 'desc' },
        take: limit,
        select: { score: true }
      });

      if (records.length === 0) return null;
      const sum = records.reduce((acc, r) => acc + r.score, 0);
      return sum / records.length;
    } catch (err: unknown) {
        logger.error({ err }, '[Evaluator] Failed to fetch model performance');
        return null;
    }
  }
}
