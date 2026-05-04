import { roiPipeline, TelemetrySnapshot } from '@packages/business';
import { logger } from '@packages/observability';
import { governanceAudit } from './audit-engine';
import { SreAnalyticsService } from './sre-analytics';


export class VerificationCoordinator {
  /**
   * Periodically checks for pending ROI verifications.
   */
  public async process(currentTelemetry: TelemetrySnapshot, trustScore: number) {
    // Note: roiPipeline.verify(currentTelemetry) already calls smooth internally.
    // Calling it here twice per cycle causes the EWMA to converge too fast or inaccurately.
    const results = roiPipeline.verify(currentTelemetry);

    for (const result of results) {
      if (result.status === 'VALID') {
        governanceAudit.verify(
          result.id,
          result.predicted,
          result.netImpact, // Use netImpact for accuracy audit
          trustScore
        );
        
        SreAnalyticsService.recordEvent({
          type: 'ROI',
          payload: result
        });


        logger.info({
          id: result.id,
          accuracy: result.accuracy,
          status: result.status,
          predicted: result.predicted,
          observed: result.observed
        }, '[VerificationCoordinator] Certified ROI verification complete');
      }
    }
  }

  public initiateBaseline(id: string, predicted: number, telemetry: TelemetrySnapshot, biz: any, cost: number = 0, scope: 'FULL' | 'CANARY' = 'FULL') {
    if (!roiPipeline.hasIntervention(id)) {
      roiPipeline.captureBaseline(id, predicted, telemetry, biz, cost, scope);
    }
  }


}

export const verificationCoordinator = new VerificationCoordinator();
