import { SreAnalyticsService } from './sre-analytics.js';
import { logger } from '@packages/observability';

export class AutonomousRoiTracker {
  /**
   * Tracks the financial uplift of an autonomous intervention.
   */
  public async trackUplift(interventionId: string, duration: number) {
    const evidence = await SreAnalyticsService.getCertificationEvidence(duration);
    
    logger.info({ 
        interventionId, 
        uplift: evidence.causalProof.uplift,
        isSignificant: evidence.causalProof.isSignificant
    }, '[AUTONOMOUS-ROI] Uplift tracked for intervention');

    return evidence.causalProof;
  }
}

export const roiTracker = new AutonomousRoiTracker();
