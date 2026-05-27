/**
 * ─── ZTAN Operational Economics Model ─────────────────────────────────────────
 * Computes storage cost growth curves, replay execution computer charges,
 * and SRE operator labor cost projections to bound the system financially.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface CostProjection {
  durationDays: number;
  uncompressedBytes: number;
  compressedBytes: number;
  estimatedStorageCostUsd: number;
}

export interface OperationalCostReport {
  computeCostUsd: number;
  laborCostUsd: number;
  totalCostUsd: number;
}

export class OperationalEconomicsModel {
  private costPerGbMonth: number;
  private costPerComputeSecond: number;
  private operatorHourlyRate: number;

  constructor(
    costPerGbMonth: number = 0.023,       // Standard AWS S3 Standard rate per GB-month
    costPerComputeSecond: number = 0.000016, // AWS Lambda / VM CPU second rate
    operatorHourlyRate: number = 75.00     // Average SRE labor cost per hour
  ) {
    this.costPerGbMonth = costPerGbMonth;
    this.costPerComputeSecond = costPerComputeSecond;
    this.operatorHourlyRate = operatorHourlyRate;
  }

  /**
   * Projects storage footprint and associated costs over time.
   */
  public projectStorageCostGrowth(
    baseBytesPerDay: number,
    durationDays: number,
    compactionRatio: number // 0 to 1.0 (e.g. 0.8 means 80% compression/pruning)
  ): CostProjection {
    const uncompressedBytes = baseBytesPerDay * durationDays;
    const compressedBytes = Math.round(uncompressedBytes * (1.0 - compactionRatio));

    const compressedGb = compressedBytes / (1024 * 1024 * 1024);
    // Cost calculation: (GBs * rate) * (months of storage accum)
    const months = durationDays / 30;
    // Average storage size over the period is compressedGb / 2 assuming linear accumulation
    const avgGb = compressedGb / 2;
    const estimatedStorageCostUsd = Math.round((avgGb * this.costPerGbMonth * Math.max(1, months)) * 100) / 100;

    return {
      durationDays,
      uncompressedBytes,
      compressedBytes,
      estimatedStorageCostUsd
    };
  }

  /**
   * Estimates compute resource consumption and SRE labor costs for incidents.
   */
  public estimateComputeAndLaborCost(
    replayCount: number,
    avgReplayMs: number,
    mttrHours: number
  ): OperationalCostReport {
    const computeSeconds = (replayCount * avgReplayMs) / 1000;
    const computeCostUsd = Math.round((computeSeconds * this.costPerComputeSecond) * 100) / 100;
    const laborCostUsd = Math.round((mttrHours * this.operatorHourlyRate) * 100) / 100;

    return {
      computeCostUsd,
      laborCostUsd,
      totalCostUsd: Math.round((computeCostUsd + laborCostUsd) * 100) / 100
    };
  }

  /**
   * Generates a holistic telemetry ingestion and retention cost analysis report.
   */
  public generateEconomicReport(
    ingestionRateBytesSec: number,
    retentionDays: number = 30
  ): Record<string, any> {
    const dailyBytes = ingestionRateBytesSec * 24 * 60 * 60;
    const monthlyBytes = dailyBytes * 30;
    const monthlyGb = monthlyBytes / (1024 * 1024 * 1024);
    const estimatedMonthlyIngestionCost = Math.round((monthlyGb * this.costPerGbMonth) * 100) / 100;

    return {
      ingestionRateBytesSec,
      dailyVolumeMb: Math.round((dailyBytes / (1024 * 1024)) * 100) / 100,
      monthlyVolumeGb: Math.round(monthlyGb * 100) / 100,
      estimatedMonthlyCostUsd: estimatedMonthlyIngestionCost,
      retentionDays,
      criticalAlertOverheadCost: Math.round((this.operatorHourlyRate * 0.5) * 100) / 100 // half hour triage cost
    };
  }
}
