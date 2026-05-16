import { ConvergenceMonitor } from './convergence-monitor.js';
import { DistributionAnalyzer } from './distribution-analyzer.js';
import { CalibrationEngine } from '../calibration-engine.js';
import { logger } from '@packages/observability';

export class ConvergenceCertification {
  /**
   * Certifies that the model has converged and is safe for high-intensity autonomous actions.
   */
  public async certify(): Promise<boolean> {
    const isStable = await ConvergenceMonitor.checkStability();
    const distribution = await DistributionAnalyzer.analyze();
    const calibrationScore = await CalibrationEngine.calculateBrierScore();

    const isCertified = isStable && distribution.entropy < 0.5 && calibrationScore < 0.15;

    logger.info({ 
        isCertified, 
        isStable, 
        entropy: distribution.entropy, 
        calibration: calibrationScore 
    }, '[CONVERGENCE] Certification audit complete');

    return isCertified;
  }
}

export const convergenceCertifier = new ConvergenceCertification();
