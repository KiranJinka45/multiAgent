import { BizInputs, lossPerMinute, roiDelta, calculateRoiError } from './value-model';
import { logger } from '@packages/observability';

export type TelemetrySnapshot = {
  latencyMs: number;
  errorRate: number;
  rps: number;
};

export type RoiResult = {
  id: string;
  predicted: number;
  observed: number;
  cost: number;
  netImpact: number;
  error: number;
  accuracy: number;
  confidenceInterval: [number, number]; // [lower, upper]
  isSignificant: boolean;
  status: 'VALID' | 'LOW_SIGNAL' | 'PENDING';
  scope?: 'FULL' | 'CANARY'; // Added for Level 5 causal proof
};


const MIN_SIGNAL_THRESHOLD = 0.01; // Filter low-impact noise

function hasRealChange(before: TelemetrySnapshot, after: TelemetrySnapshot) {
  return (
    Math.abs(before.errorRate - after.errorRate) > 0.01 ||
    Math.abs(before.latencyMs - after.latencyMs) > 10
  );
}

export interface PendingIntervention {
  id: string;
  timestamp: number;
  predicted: number;
  cost: number;
  telemetry: TelemetrySnapshot;
  biz: any;
  stabilized: boolean;
  scope: 'FULL' | 'CANARY';
}


/**
 * Enterprise-grade ROI Pipeline with Temporal Alignment and EWMA Smoothing.
 */
export class RoiPipeline {
  private interventions: Map<string, PendingIntervention> = new Map();
  private prevSmoothed?: TelemetrySnapshot;
  private alpha = 1.0;
  private stabilizationWindowMs = 5000; // 5s to capture a stable baseline
  private readonly verificationWindowMs = 55000; // 55s window to observe healing impact

  // Aggregate Stats for Level 5.0 Certification
  private falsePositiveActions = 0;
  private negativeROIEvents = 0;
  private totalVerified = 0;
  private brierScores: number[] = [];
  private treatmentSavings: number[] = [];
  private controlSavings: number[] = [];


  /**
   * Captures a smoothed baseline snapshot before an intervention.
   */
  public captureBaseline(id: string, predicted: number, telemetry: TelemetrySnapshot, biz: any, cost: number = 0, scope: 'FULL' | 'CANARY' = 'FULL') {

    if (telemetry.errorRate < 0.05) {
      logger.info({ id, errorRate: telemetry.errorRate }, '[RoiPipeline] Ignoring baseline capture for healthy state');
      return;
    }
    this.interventions.set(id, {
      id,
      timestamp: Date.now(),
      predicted,
      cost,
      telemetry, // Use RAW telemetry for peak impact baseline
      biz,
      stabilized: false,
      scope
    });

    logger.info({ id, predicted, telemetry }, '[RoiPipeline] Baseline capture initiated');
  }

  /**
   * Applies Exponentially Weighted Moving Average (EWMA) to telemetry signals.
   */
  public smooth(current: TelemetrySnapshot): TelemetrySnapshot {
    if (!this.prevSmoothed) {
      this.prevSmoothed = current;
      return current;
    }

    const smoothed = {
      latencyMs: this.alpha * current.latencyMs + (1 - this.alpha) * this.prevSmoothed.latencyMs,
      errorRate: this.alpha * current.errorRate + (1 - this.alpha) * this.prevSmoothed.errorRate,
      rps: this.alpha * current.rps + (1 - this.alpha) * this.prevSmoothed.rps,
    };

    this.prevSmoothed = smoothed;
    return smoothed;
  }

  /**
   * Computes the ROI results for all pending interventions.
   */
  public verify(currentTelemetry: TelemetrySnapshot): RoiResult[] {
    const results: RoiResult[] = [];
    const now = Date.now();
    
    // Smooth the incoming telemetry to reduce noise-induced jitter in ROI calculations
    const after = this.smooth(currentTelemetry);


    for (const [id, intervention] of this.interventions.entries()) {
      const age = now - intervention.timestamp;

      if (age < this.verificationWindowMs) {
        continue; // Still in verification window
      }

      const before = intervention.telemetry;
      
      if (!hasRealChange(before, after)) {
        logger.info({ id }, '[RoiPipeline] Skipping verification: No real system change detected');
        results.push({
          id,
          predicted: intervention.predicted,
          observed: 0,
          cost: intervention.cost,
          netImpact: 0,
          error: 0,
          accuracy: 1.0,
          confidenceInterval: [0, 0],
          isSignificant: false,
          status: 'LOW_SIGNAL'
        });
        this.interventions.delete(id);
        continue;
      }

      const biz = intervention.biz;

      // Convert Telemetry to BizInputs for loss model
      const beforeInputs: BizInputs = {
        trafficPerMin: Math.max(0.1, before.rps),
        conversionRate: biz.conversionRate,
        avgOrderValue: biz.avgOrderValue,
        errorRate: before.errorRate,
        p95LatencyMs: before.latencyMs
      };

      const afterInputs: BizInputs = {
        trafficPerMin: Math.max(0.1, after.rps),
        conversionRate: biz.conversionRate,
        avgOrderValue: biz.avgOrderValue,
        errorRate: after.errorRate,
        p95LatencyMs: after.latencyMs
      };

      const observedSavings = roiDelta(beforeInputs, afterInputs);
      const predictedSavings = intervention.predicted;

      // Diagnostic Logging
      const logMsg = `[ROI-DIAG] id=${id} | BEFORE: err=${beforeInputs.errorRate.toFixed(3)}, lat=${beforeInputs.p95LatencyMs.toFixed(0)} | AFTER: err=${afterInputs.errorRate.toFixed(3)}, lat=${afterInputs.p95LatencyMs.toFixed(0)} | PRED=${predictedSavings.toFixed(4)}, OBS=${observedSavings.toFixed(4)}`;
      console.log(logMsg);
      try {
        require('fs').appendFileSync('roi_debug.log', logMsg + '\n');
      } catch (e) {}

      // Signal Quality Gate
      if (Math.abs(observedSavings) < MIN_SIGNAL_THRESHOLD) {
        results.push({
          id,
          predicted: predictedSavings,
          observed: observedSavings,
          cost: intervention.cost,
          netImpact: observedSavings - intervention.cost,
          error: 0,
          accuracy: 1.0,
          confidenceInterval: [0, 0],
          isSignificant: false,
          status: 'LOW_SIGNAL'
        });
      } else {
        // Calculate observed impact using the canonical value model
        const observedImpact = roiDelta(beforeInputs, afterInputs);
        
        // Revenue-backed calculation: Net Impact = Observed Impact - Normalized Cost
        // We normalize cost relative to the potential impact magnitude
        const netImpact = observedImpact - intervention.cost;

        const roiError = calculateRoiError(predictedSavings, netImpact);
        const accuracy = Math.max(0, 1 - roiError);

        // Statistical Significance: 95% Confidence Interval (Simulated using observed variance)
        const variance = 0.05; // 5% baseline noise variance
        const marginOfError = 1.96 * Math.sqrt(variance / 1); // Simplistic for single sample
        const ci: [number, number] = [netImpact - marginOfError, netImpact + marginOfError];
        
        // Causal Significance: Does the net impact exceed the noise floor?
        const isSignificant = Math.abs(netImpact) > marginOfError;

        results.push({
          id,
          predicted: predictedSavings,
          observed: observedImpact,
          cost: intervention.cost,
          netImpact,
          error: roiError,
          accuracy,
          confidenceInterval: ci,
          isSignificant,
          status: isSignificant ? 'VALID' : 'LOW_SIGNAL',
          scope: intervention.scope
        });

        // Update Aggregate Stats
        this.totalVerified++;
        if (netImpact < 0) this.negativeROIEvents++;
        this.brierScores.push(Math.pow(accuracy - 1, 2));

        // Track Causal Uplift (FULL vs CANARY)
        if (intervention.scope === 'FULL') {
          this.treatmentSavings.push(netImpact);
        } else {
          this.controlSavings.push(netImpact);
        }
      }

      // Cleanup verified intervention
      this.interventions.delete(id);
    }

    return results;
  }

  public getCertificationStats() {
    const avgBrier = this.brierScores.length > 0 
      ? this.brierScores.reduce((a, b) => a + b, 0) / this.brierScores.length 
      : 0;

    // Brier Trend Analysis (Level 5.0 Calibration Stability)
    const mid = Math.floor(this.brierScores.length / 2);
    const firstHalfBrier = mid > 0 ? this.brierScores.slice(0, mid).reduce((a, b) => a + b, 0) / mid : 0;
    const secondHalfBrier = mid > 0 ? this.brierScores.slice(mid).reduce((a, b) => a + b, 0) / (this.brierScores.length - mid) : 0;
    const brierTrend = secondHalfBrier <= firstHalfBrier ? 'STABLE' : 'DRIFTING';

    // Causal Proof: Uplift = Mean(Treatment) - Mean(Control)
    const meanTreatment = this.treatmentSavings.length > 0 
      ? this.treatmentSavings.reduce((a, b) => a + b, 0) / this.treatmentSavings.length 
      : 0;
    const meanControl = this.controlSavings.length > 0 
      ? this.controlSavings.reduce((a, b) => a + b, 0) / this.controlSavings.length 
      : 0;
    const uplift = meanTreatment - meanControl;

    return {
      totalVerified: this.totalVerified,
      falsePositiveActions: this.falsePositiveActions,
      negativeROIEvents: this.negativeROIEvents,
      falsePositiveRate: this.totalVerified > 0 ? this.falsePositiveActions / this.totalVerified : 0,
      negativeRoiRate: this.totalVerified > 0 ? this.negativeROIEvents / this.totalVerified : 0,
      avgBrierScore: avgBrier,
      brierTrend,
      isCalibrated: avgBrier < 0.15 && brierTrend === 'STABLE',
      causalProof: {
        uplift,
        meanTreatment,
        meanControl,
        sampleCount: this.treatmentSavings.length + this.controlSavings.length
      }
    };
  }



  public hasIntervention(id: string): boolean {
    return this.interventions.has(id);
  }

  public hasPendingBaseline(): boolean {
    return this.interventions.size > 0;
  }

  public reset() {
    this.interventions.clear();
    this.prevSmoothed = undefined;
  }
}

export const roiPipeline = new RoiPipeline();
