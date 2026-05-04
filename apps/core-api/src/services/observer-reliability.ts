import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { SREObserver } from '@packages/contracts';

export class ObserverReliabilityService {
  private static KEY_PREFIX = 'sre:reliability:';

  public static async snapshotObserver(observer: SREObserver) {
    const key = `${this.KEY_PREFIX}${observer.id}`;
    const historyJson = await redis.get(key);
    const history = historyJson ? JSON.parse(historyJson) : [];

    // Keep last 100 snapshots (e.g., last 1 hour at 30s intervals)
    history.push({
      time: new Date().toISOString(),
      score: observer.reliabilityScore,
      isCorrect: observer.isCorrect
    });

    if (history.length > 100) history.shift();

    await redis.set(key, JSON.stringify(history));
  }

  public static async getReliabilityCurve(observerId: string) {
    const key = `${this.KEY_PREFIX}${observerId}`;
    const historyJson = await redis.get(key);
    return historyJson ? JSON.parse(historyJson) : [];
  }

  public static async calculateUptime(observerId: string): Promise<number> {
    const history = await this.getReliabilityCurve(observerId);
    if (history.length === 0) return 100;

    const correctCount = history.filter((h: any) => h.isCorrect).length;
    return (correctCount / history.length) * 100;
  }
}
