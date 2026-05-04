import { logger } from '@packages/observability';
import { multiMetricVerifier, MetricsSnapshot } from './multi-metric-verifier';

export interface CanaryStage {
  percent: number;
  durationMs: number;
}

/**
 * ProgressiveCanary: Implements multi-stage rollout with gating at every step.
 * Prevents "all-or-nothing" failures by gradually increasing blast radius.
 */
export class ProgressiveCanary {
  private stages: CanaryStage[] = [
    { percent: 5,   durationMs: 60_000 },
    { percent: 10,  durationMs: 60_000 },
    { percent: 25,  durationMs: 90_000 },
    { percent: 50,  durationMs: 120_000 },
    { percent: 100, durationMs: 0 }
  ];

  constructor(
    private actuator: (percent: number) => Promise<void>,
    private rollback: () => Promise<void>
  ) {}

  public async execute() {
    logger.info('[CANARY] Starting Progressive Staged Rollout');
    
    // Capture absolute baseline
    const initialBaseline = await multiMetricVerifier.getSnapshot();

    for (const stage of this.stages) {
      logger.warn(`[CANARY] Advancing to Stage: ${stage.percent}%`);
      
      try {
        // 1. Actuate Stage
        await this.actuator(stage.percent);

        // 2. If not the final stage, verify before proceeding
        if (stage.durationMs > 0) {
          const ok = await multiMetricVerifier.verify(initialBaseline, stage.durationMs);
          
          if (!ok) {
            logger.error(`[CANARY] Stage ${stage.percent}% validation FAILED. Initiating safety rollback.`);
            await this.rollback();
            return false;
          }
          logger.info(`[CANARY] Stage ${stage.percent}% verified. Confidence high.`);
        }
      } catch (error) {
        logger.error({ error, stage: stage.percent }, '[CANARY] Actuation error. Reverting.');
        await this.rollback();
        return false;
      }
    }

    logger.info('[CANARY] Global rollout complete. System nominal.');
    return true;
  }
}
