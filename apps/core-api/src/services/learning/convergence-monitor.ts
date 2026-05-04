import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export interface ConvergenceStats {
  velocity: number;
  velocityDecay: number; // ΔVelocity
  directionFlips: number;
  driftFromBaseline: number;
  state: 'INITIALIZING' | 'CONVERGING' | 'OSCILLATING' | 'FORMALLY_STABLE';
  isStable: boolean;
}

export class ConvergenceMonitor {
  private static HISTORY_KEY = 'sre:tuning:history';
  private static BASELINE_KEY = 'sre:tuning:original_baseline';

  public static async recordTuning(params: any) {
    const historyJson = await redis.get(this.HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    
    history.push({ params, timestamp: Date.now() });
    if (history.length > 50) history.shift(); // Keep last 50 cycles

    await redis.set(this.HISTORY_KEY, JSON.stringify(history));
    
    // Save the very first tuning as the original baseline if it doesn't exist
    const baseline = await redis.get(this.BASELINE_KEY);
    if (!baseline) {
      await redis.set(this.BASELINE_KEY, JSON.stringify(params));
    }
  }

  public static async getStats(paramName: string): Promise<ConvergenceStats> {
    const historyJson = await redis.get(this.HISTORY_KEY);
    const history = historyJson ? JSON.parse(historyJson) : [];
    const baselineJson = await redis.get(this.BASELINE_KEY);
    const baseline = baselineJson ? JSON.parse(baselineJson) : null;

    if (history.length < 5) {
      return { velocity: 0, velocityDecay: 0, directionFlips: 0, driftFromBaseline: 0, state: 'INITIALIZING', isStable: true };
    }

    const values = history.map((h: any) => h.params[paramName]).filter((v: any) => v !== undefined);
    
    // Calculate Velocity (Rate of change)
    const velocity = (values[values.length - 1] - values[0]) / values.length;

    // Calculate Velocity Decay (Rate of rate of change)
    const midPoint = Math.floor(values.length / 2);
    const v1 = (values[midPoint] - values[0]) / midPoint;
    const v2 = (values[values.length - 1] - values[midPoint]) / (values.length - midPoint);
    const velocityDecay = Math.abs(v2) - Math.abs(v1); // Negative = Settling

    // Calculate Direction Flips
    let flips = 0;
    for (let i = 2; i < values.length; i++) {
      const prevDelta = values[i-1] - values[i-2];
      const currDelta = values[i] - values[i-1];
      if ((prevDelta > 0 && currDelta < 0) || (prevDelta < 0 && currDelta > 0)) {
        flips++;
      }
    }

    // Calculate Drift from Baseline
    const drift = baseline ? Math.abs(values[values.length - 1] - baseline[paramName]) : 0;

    let state: ConvergenceStats['state'] = 'CONVERGING';
    if (flips >= 3) state = 'OSCILLATING';
    else if (Math.abs(velocity) < 0.01 && velocityDecay <= 0) state = 'FORMALLY_STABLE';

    return {
      velocity,
      velocityDecay,
      directionFlips: flips,
      driftFromBaseline: drift,
      state,
      isStable: state === 'FORMALLY_STABLE' || state === 'CONVERGING'
    };
  }
}
