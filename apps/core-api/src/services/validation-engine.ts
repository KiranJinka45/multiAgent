import { logger } from '@packages/observability';
import { chaosOrchestrator } from './chaos-orchestrator.js';

export interface ValidationStats {
  truePositives: number;
  falsePositives: number;
  falseNegatives: number;
  rcaAccuracy: number;
  mttr: number;
}

export class ValidationEngine {
  private stats: ValidationStats = {
    truePositives: 0,
    falsePositives: 0,
    falseNegatives: 0,
    rcaAccuracy: 0,
    mttr: 0
  };

  /**
   * Validates the SRE engine's detection and attribution accuracy.
   */
  public async validateIteration(expectedRoot: string, actualRoot: string, detected: boolean) {
    if (detected) {
      if (expectedRoot === actualRoot) {
        this.stats.truePositives++;
        this.stats.rcaAccuracy = (this.stats.rcaAccuracy + 1.0) / 2;
      } else {
        this.stats.falsePositives++;
        this.stats.rcaAccuracy = (this.stats.rcaAccuracy + 0.0) / 2;
      }
    } else {
      this.stats.falseNegatives++;
    }

    logger.info({ stats: this.stats }, '[VALIDATION] Iteration complete');
  }

  public getScore(): number {
    const precision = this.stats.truePositives / (this.stats.truePositives + this.stats.falsePositives || 1);
    const recall = this.stats.truePositives / (this.stats.truePositives + this.stats.falseNegatives || 1);
    return (precision + recall) / 2;
  }
}

export const validationEngine = new ValidationEngine();
