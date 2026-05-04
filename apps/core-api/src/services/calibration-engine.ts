import { redis } from '@packages/utils';
import { logger } from '@packages/observability';

export class CalibrationEngine {
  private static STORAGE_KEY = 'sre:calibration:samples';

  public static async recordSample(confidence: number, outcome: number, hypothesisType?: string, actualType?: string) {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    const samples = samplesJson ? JSON.parse(samplesJson) : [];

    samples.push({
      time: new Date().toISOString(),
      confidence,
      outcome,
      hypothesisType,
      actualType
    });

    // Keep last 500 samples for calibration
    if (samples.length > 500) samples.shift();

    await redis.set(this.STORAGE_KEY, JSON.stringify(samples));
  }

  public static async calculateHypothesisPrecision(type: string): Promise<number> {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    if (!samplesJson) return 1.0;

    const samples = JSON.parse(samplesJson);
    const relevant = samples.filter((s: any) => s.hypothesisType === type);
    if (relevant.length === 0) return 1.0;

    const correct = relevant.filter((s: any) => s.outcome === 1.0).length;
    return correct / relevant.length;
  }

  public static async calculateRecall(type: string): Promise<number> {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    if (!samplesJson) return 1.0;

    const samples = JSON.parse(samplesJson);
    // Recall: Predicted_Anomaly / Actual_Anomaly
    const actualAnomalies = samples.filter((s: any) => s.actualType === type);
    if (actualAnomalies.length === 0) return 1.0;

    const correctlyPredicted = actualAnomalies.filter((s: any) => s.hypothesisType === type).length;
    return correctlyPredicted / actualAnomalies.length;
  }

  public static async getSupportCount(type: string, isActual: boolean = false): Promise<number> {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    if (!samplesJson) return 0;

    const samples = JSON.parse(samplesJson);
    return samples.filter((s: any) => isActual ? s.actualType === type : s.hypothesisType === type).length;
  }

  public static async calculateF1(type: string): Promise<number> {
    const precision = await this.calculateHypothesisPrecision(type);
    const recall = await this.calculateRecall(type);
    if (precision + recall === 0) return 0;
    return 2 * (precision * recall) / (precision + recall);
  }

  /**
   * Calculate Brier Score: Mean Squared Error of predictions
   * Ranges from 0.0 (Perfect) to 1.0 (Total Failure)
   */
  public static async calculateBrierScore(): Promise<number> {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    if (!samplesJson) return 0;

    const samples = JSON.parse(samplesJson);
    if (samples.length === 0) return 0;

    const squaredErrors = samples.map((s: any) => Math.pow(s.confidence - s.outcome, 2));
    const meanSquaredError = squaredErrors.reduce((a: number, b: number) => a + b, 0) / samples.length;

    return meanSquaredError;
  }

  public static async getAnomalyArrivalRate(): Promise<number> {
    const samplesJson = await redis.get(this.STORAGE_KEY);
    if (!samplesJson) return 0;

    const samples = JSON.parse(samplesJson);
    const anomalies = samples.filter((s: any) => s.actualType && s.actualType !== 'NOMINAL');
    if (anomalies.length === 0) return 0;

    const first = new Date(samples[0].time).getTime();
    const last = new Date(samples[samples.length - 1].time).getTime();
    const durationHours = (last - first) / (3600 * 1000);

    return anomalies.length / (durationHours || 1);
  }

  public static async isStatisticallySignificant(type: string): Promise<boolean> {
    const support = await this.getSupportCount(type, true);
    const rate = await this.getAnomalyArrivalRate();
    
    // Significance requires at least 30 samples OR enough to cover the expected rate
    const minSupport = Math.max(30, rate * 6); // 6-hour coverage equivalent
    return support >= minSupport;
  }
}
