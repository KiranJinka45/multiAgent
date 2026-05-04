import { logger } from '@packages/observability';

export interface DecisionInput {
  anomalyScore: number;
  burnRate: number;
}

export type SreDecision =
  | 'NO_ACTION'
  | 'OBSERVE'
  | 'ALERT'
  | 'ACT';

/**
 * DecisionEngine: Converts signals (Anomaly Score) and impact (Burn Rate)
 * into deterministic operational decisions.
 */
export class DecisionEngine {
  /**
   * Decide the next action based on signal strength and SLO impact.
   */
  public decide(input: DecisionInput): SreDecision {
    // 1. Critical Impact + Confirmed Anomaly -> ACT
    if (input.burnRate > 5 && input.anomalyScore > 0.7) {
      return 'ACT';
    }

    // 2. High Burn Rate -> ALERT (Even if anomaly is weak, impact is high)
    if (input.burnRate > 2) {
      return 'ALERT';
    }

    // 3. Signal Breach -> OBSERVE (Signal is high, but budget impact is low)
    if (input.anomalyScore > 0.7) {
      return 'OBSERVE';
    }

    return 'NO_ACTION';
  }
}

export const decisionEngine = new DecisionEngine();
