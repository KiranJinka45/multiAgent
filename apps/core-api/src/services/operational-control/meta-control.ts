import { logger } from '@packages/observability';
import { SreAnalyticsService } from './sre-analytics.js';

export class MetaControlController {
  private static readonly SAFETY_THRESHOLD = 0.25; // Brier Score limit

  /**
   * Evaluates if the system should continue in AUTONOMOUS mode.
   */
  public async validateMode(autonomyMode: string): Promise<string> {
    const evidence = await SreAnalyticsService.getCertificationEvidence(24); // Last 24h
    
    if (evidence.avgBrier > MetaControlController.SAFETY_THRESHOLD) {
      logger.warn({ avgBrier: evidence.avgBrier }, '[META-CONTROL] Brier score threshold breached. Forcing HITL.');
      return 'HITL';
    }

    if (evidence.regretRatio > 0.15) {
      logger.warn({ regretRatio: evidence.regretRatio }, '[META-CONTROL] High regret ratio detected. Forcing HITL.');
      return 'HITL';
    }

    return autonomyMode;
  }
}

export const metaControl = new MetaControlController();
