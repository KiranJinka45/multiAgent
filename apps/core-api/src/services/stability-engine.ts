import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export class StabilityEngine {
  private static STORAGE_KEY = 'sre:stability:history';
  private static MAX_HISTORY = 50;

  /**
   * Record the identified root cause to track oscillations over time.
   */
  public static async recordRootCause(root: string) {
    try {
      const historyJson = await redis.get(this.STORAGE_KEY);
      const history: string[] = historyJson ? JSON.parse(historyJson) : [];

      history.push(root);
      if (history.length > this.MAX_HISTORY) history.shift();

      await redis.set(this.STORAGE_KEY, JSON.stringify(history));
    } catch (err: any) {
      logger.warn({ err }, '[STABILITY] Failed to record root cause to redis due to connection/command error');
    }
  }

  /**
   * Calculate stability score based on decaying flip rate (EWMA).
   * Recent flips have a higher impact on reliability degradation.
   */
  public static async calculateStabilityScore(): Promise<number> {
    try {
      const historyJson = await redis.get(this.STORAGE_KEY);
      if (!historyJson) return 1.0;

      const history: string[] = JSON.parse(historyJson);
      if (history.length < 3) return 1.0;

      const ALPHA = 0.4; // Smoothing factor (higher = more responsive to recent flips)
      let ewmaFlipRate = 0;

      for (let i = 1; i < history.length; i++) {
        const flip = history[i] !== history[i - 1] ? 1 : 0;
        ewmaFlipRate = (ALPHA * flip) + ((1 - ALPHA) * ewmaFlipRate);
      }

      const stability = Math.max(0.0, 1.0 - ewmaFlipRate);

      logger.debug({ 
        ewmaFlipRate: ewmaFlipRate.toFixed(4), 
        historyLength: history.length, 
        stability: stability.toFixed(4) 
      }, '[STABILITY] EWMA Score calculated');
      
      return stability;
    } catch (err: any) {
      logger.warn({ err }, '[STABILITY] Failed to calculate stability score from redis due to connection/command error');
      return 1.0;
    }
  }

  public static async reset() {
    try {
      await redis.del(this.STORAGE_KEY);
    } catch (err: any) {
      logger.warn({ err }, '[STABILITY] Failed to reset stability history in redis due to connection/command error');
    }
  }
}
