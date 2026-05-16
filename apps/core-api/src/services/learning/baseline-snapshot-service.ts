import { redis } from '@packages/utils';
import { logger } from '@packages/observability';
import { sreEngine } from '../sre-engine.js';
import { CalibrationEngine } from '../calibration-engine.js';
import { CausalityMapper } from './causality-mapper.js';

export class BaselineSnapshotService {
  private static SHORT_WINDOW_KEY = 'sre:baseline:snapshots:short';
  private static LONG_WINDOW_KEY = 'sre:baseline:snapshots:long';

  public static async startAutoSnapshots() {
    // Take a snapshot every 15 minutes
    setInterval(() => this.takeSnapshot(this.SHORT_WINDOW_KEY, 96), 15 * 60000);
    // Take a long-term snapshot every 2 hours
    setInterval(() => this.takeSnapshot(this.LONG_WINDOW_KEY, 168), 2 * 3600000);
  }

  /**
   * Captures a comprehensive system snapshot for baseline analysis.
   */
  private static async takeSnapshot(key: string, limit: number) {
    const state = await sreEngine.getCurrentStateAsync();
    const brier = await CalibrationEngine.calculateBrierScore();
    const samples = await CausalityMapper.getRecentSamples();
    const scores = samples.map((s: any) => s.confidence);
    const avg = scores.reduce((a: number, b: number) => a + b, 0) / (scores.length || 1);
    
    const snapshot = {
      time: new Date().toISOString(),
      metrics: {
        brierScore: brier,
        avgConfidence: avg,
        weightedConfidence: state.perception.weightedConfidence,
        consensus: state.perception.consensus,
        signalQuality: state.perception.signalQuality,
        slidingP95TTAC: state.operationalControl.performance.slidingP95TTAC
      }
    };

    const currentJson = await redis.get(key);
    const snapshots = currentJson ? JSON.parse(currentJson) : [];
    
    snapshots.push(snapshot);
    if (snapshots.length > limit) snapshots.shift();

    await redis.set(key, JSON.stringify(snapshots));
    logger.info({ key, count: snapshots.length }, '[SRE] System baseline snapshot recorded');
  }
}
