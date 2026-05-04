import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { sreEngine } from '../sre-engine';
import { CalibrationEngine } from '../calibration-engine';

export class BaselineSnapshotService {
  private static SHORT_WINDOW_KEY = 'sre:baseline:snapshots:short';
  private static LONG_WINDOW_KEY = 'sre:baseline:snapshots:long';

  public static start() {
    logger.info('[SRE] Baseline Snapshot Service started (5m & 1h resolutions)');
    
    // High-Resolution: 5 minutes
    setInterval(async () => {
      await this.takeSnapshot(this.SHORT_WINDOW_KEY, 144); // Keep 12 hours of high-res
    }, 5 * 60 * 1000);

    // Baseline-Resolution: 1 hour
    setInterval(async () => {
      await this.takeSnapshot(this.LONG_WINDOW_KEY, 48); // Keep 48 hours of long-term
    }, 3600 * 1000);
  }

  private static async takeSnapshot(key: string, limit: number) {
    const state = await sreEngine.getCurrentStateAsync();
    const brier = await CalibrationEngine.calculateBrierScore();
    
    const snapshot = {
      time: new Date().toISOString(),
      metrics: {
        brierScore: brier,
        weightedConfidence: state.perception.weightedConfidence,
        consensus: state.perception.consensus,
        signalQuality: state.perception.signalQuality,
        signalIntegrity: state.perception.signalIntegrityState,
        expectedTTAC: state.governance.expectedTTAC,
        slidingP95TTAC: state.governance.slidingP95TTAC
      },
      observers: (state.observers || []).map(o => ({
        id: o.id,
        reliability: o.reliabilityScore
      }))
    };

    const existingJson = await redis.get(key);
    const existing = existingJson ? JSON.parse(existingJson) : [];
    existing.push(snapshot);
    if (existing.length > limit) existing.shift();

    await redis.set(key, JSON.stringify(existing));
    logger.debug({ key, snapshot }, '[SRE] Baseline snapshot captured');
  }
}
