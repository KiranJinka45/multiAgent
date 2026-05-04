import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface CausalLink {
  cause: string;
  effect: string;
  confidence: number;
  occurrences: number;
}

export class CausalityMapper {
  private static KEY = 'sre:causality:map';
  private static recentEvents: { type: string; time: number }[] = [];

  public static async recordEvent(type: string) {
    const now = Date.now();
    this.recentEvents.push({ type, time: now });

    // Look for correlations in the last 60 seconds
    const threshold = now - 60000;
    this.recentEvents = this.recentEvents.filter(e => e.time > threshold);

    if (this.recentEvents.length > 1) {
      const effect = type;
      const causes = this.recentEvents.filter(e => e.type !== effect);
      
      for (const cause of causes) {
        await this.updateCorrelation(cause.type, effect);
      }
    }
  }

  private static async updateCorrelation(cause: string, effect: string) {
    const mapJson = await redis.get(this.KEY);
    const map: CausalLink[] = mapJson ? JSON.parse(mapJson) : [];

    let link = map.find(l => l.cause === cause && l.effect === effect);
    if (!link) {
      link = { cause, effect, confidence: 0.1, occurrences: 0 };
      map.push(link);
    }

    link.occurrences++;
    // Simple reinforcement: confidence grows with occurrences
    link.confidence = Math.min(0.95, link.confidence + 0.05);

    await redis.set(this.KEY, JSON.stringify(map));
  }

  public static async detectInterference(tuningParam: string): Promise<boolean> {
    const mapJson = await redis.get(this.KEY);
    if (!mapJson) return false;
    const map: CausalLink[] = JSON.parse(mapJson);

    // Look for links where tuning an "A" causes an instability "B"
    const interference = map.find(l => l.cause === `TUNE_${tuningParam}` && l.effect === 'INSTABILITY_DETECTED' && l.confidence > 0.6);
    if (interference) {
      logger.error({ tuningParam, interference }, '[SRE] Causal interference detected! Tuning this parameter destabilizes the system.');
      return true;
    }
    return false;
  }

  public static async getCausalConfidence(cause: string, effect: string): Promise<number> {
    const mapJson = await redis.get(this.KEY);
    if (!mapJson) return 0;
    const map: CausalLink[] = JSON.parse(mapJson);
    const link = map.find(l => l.cause === cause && l.effect === effect);
    return link ? link.confidence : 0;
  }
}
