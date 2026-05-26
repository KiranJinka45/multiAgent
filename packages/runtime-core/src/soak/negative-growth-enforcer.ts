/**
 * ─── ZTAN Telemetry Negative Growth Enforcer ──────────────────────────────────
 * Enforces strict limits on telemetry metrics and source file cardinality,
 * preventing hidden feature creep under the guise of "observability."
 * Provides telemetry consolidation logic to compress high-cardinality keys.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface TelemetryLimitReport {
  isValid: boolean;
  activeMetricsCount: number;
  fileCount: number;
  metricCeiling: number;
  fileCeiling: number;
  error?: string;
}

export class TelemetryNegativeGrowthEnforcer {
  private metricCeiling: number;
  private fileCeiling: number;

  constructor(metricCeiling: number = 50, fileCeiling: number = 15) {
    this.metricCeiling = metricCeiling;
    this.fileCeiling = fileCeiling;
  }

  /**
   * Validates if the current telemetry footprint violates negative growth constraints.
   */
  public validateTelemetryLimit(activeMetricsCount: number, fileCount: number): TelemetryLimitReport {
    const isValid = activeMetricsCount <= this.metricCeiling && fileCount <= this.fileCeiling;
    let error: string | undefined;

    if (!isValid) {
      error = `Telemetry growth constraint violated. Active metrics: ${activeMetricsCount}/${this.metricCeiling}, File count: ${fileCount}/${this.fileCeiling}. Consolidation or deletion required.`;
    }

    return {
      isValid,
      activeMetricsCount,
      fileCount,
      metricCeiling: this.metricCeiling,
      fileCeiling: this.fileCeiling,
      error
    };
  }

  /**
   * Consolidates high-cardinality metrics into unified summary payloads.
   * e.g., groups individual lock/memory counters into aggregated statistics.
   */
  public consolidateTelemetry(metrics: Record<string, number[]>): Record<string, { min: number; max: number; avg: number; count: number }> {
    const consolidated: Record<string, { min: number; max: number; avg: number; count: number }> = {};

    for (const [key, values] of Object.entries(metrics)) {
      if (values.length === 0) continue;

      const min = Math.min(...values);
      const max = Math.max(...values);
      const sum = values.reduce((acc, v) => acc + v, 0);
      const avg = Math.round((sum / values.length) * 100) / 100;

      consolidated[key] = {
        min,
        max,
        avg,
        count: values.length
      };
    }

    return consolidated;
  }
}
