import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export class StabilityEngine {
  private static STORAGE_KEY = 'sre:stability:history';
  private static MAX_HISTORY = 50;

  /**
   * Record the identified root cause to track oscillations over time.
   */
  public static async recordRootCause(root: string) {
    const historyJson = await redis.get(this.STORAGE_KEY);
    const history: string[] = historyJson ? JSON.parse(historyJson) : [];

    history.push(root);
    if (history.length > this.MAX_HISTORY) history.shift();

    await redis.set(this.STORAGE_KEY, JSON.stringify(history));
  }

  /**
   * Calculate stability score based on decaying flip rate (EWMA).
   * Recent flips have a higher impact on trust degradation.
   */
  public static async calculateStabilityScore(): Promise<number> {
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
  }

  public static async reset() {
    await redis.del(this.STORAGE_KEY);
  }
}
