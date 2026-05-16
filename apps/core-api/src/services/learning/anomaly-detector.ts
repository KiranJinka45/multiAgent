import { logger } from '@packages/observability';
import { isolationForestService } from './isolation-forest.service.js';

export class AnomalyDetector {
  /**
   * Detects anomalies in system metrics using unsupervised learning.
   */
  public async detect(metrics: any) {
    const score = await isolationForestService.predict(metrics);
    
    if (score > 0.8) {
      logger.error({ score, metrics }, '[SRE] Anomaly detected by Isolation Forest');
      return true;
    }

    return false;
  }
}

export const anomalyDetector = new AnomalyDetector();
