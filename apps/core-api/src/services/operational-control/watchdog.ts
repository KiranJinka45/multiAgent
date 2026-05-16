import { logger } from '@packages/observability';
import { operationalAudit } from './audit-engine.js';

export class OperationalWatchdog {
  private readonly BRIER_CRITICAL_THRESHOLD = 0.25;
  private readonly ROI_ACCURACY_THRESHOLD = 0.75;

  /**
   * Evaluates the overall health of the operational control loop.
   * If thresholds are violated, it forces the system into Safe Mode.
   */
  public async evaluateHealth() {
    const stats = operationalAudit.getStats();
    
    if ((stats.count || 0) < 1) return { status: 'INITIALIZING', action: 'NONE' };

    let status = 'HEALTHY';
    let action = 'NONE';

    // 1. Calibration Check (Brier Score)
    if ((stats.avgBrier || 0) > this.BRIER_CRITICAL_THRESHOLD) {
      status = 'CRITICAL_CALIBRATION_DRIFT';
      action = 'FORCE_SAFE_MODE';
    }

    // 2. ROI Accuracy Check
    if ((stats.avgRoiAccuracy || 0) < this.ROI_ACCURACY_THRESHOLD) {
      status = 'BUSINESS_LOGIC_CORRUPTION';
      action = 'INCREASE_HITL_GATING';
    }

    if (action !== 'NONE') {
      logger.warn({ status, stats }, '[OPERATIONAL-WATCHDOG] Safety intervention triggered');
    }

    return { status, action, stats };
  }
}

export const operationalWatchdog = new OperationalWatchdog();
