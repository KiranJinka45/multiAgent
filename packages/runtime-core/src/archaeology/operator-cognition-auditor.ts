/**
 * ─── ZTAN SRE Operator Cognition Auditor ──────────────────────────────────────
 * Measures human operator response times, confusion indexes, and alert fatigue
 * to prevent cognitive overload in high-pressure recovery scenarios.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface CognitionReport {
  confusionScore: number;       // 0 to 100
  overloadIndex: number;        // 0 to 100
  fatigueScore: number;         // 0 to 100
  reconstructionScore: number;  // 0 to 100
  timeToRootCauseScore: number; // 0 to 100
  overallCognitiveLoad: number; // 0 to 100
}

export class OperatorCognitionAuditor {
  /**
   * Computes an operator confusion score using Levenshtein distance between
   * the actual operator actions and the standard playbook commands.
   */
  public measureResponseConfusion(operatorActions: string[], standardPlaybook: string[]): number {
    if (operatorActions.length === 0 && standardPlaybook.length === 0) return 0;
    if (operatorActions.length === 0 || standardPlaybook.length === 0) return 100;

    const m = operatorActions.length;
    const n = standardPlaybook.length;
    const dp = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));

    for (let i = 0; i <= m; i++) dp[i][0] = i;
    for (let j = 0; j <= n; j++) dp[0][j] = j;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (operatorActions[i - 1] === standardPlaybook[j - 1]) {
          dp[i][j] = dp[i - 1][j - 1];
        } else {
          dp[i][j] = Math.min(
            dp[i - 1][j] + 1,    // Deletion
            dp[i][j - 1] + 1,    // Insertion
            dp[i - 1][j - 1] + 1 // Substitution
          );
        }
      }
    }

    const maxLen = Math.max(m, n);
    const distance = dp[m][n];
    return Math.round((distance / maxLen) * 100);
  }

  /**
   * Measures cognitive latency in reconstructing causality of an incident.
   */
  public calculateArchaeologyReconstructionLatency(
    incidentSize: number,
    queryCount: number,
    elapsedSeconds: number
  ): number {
    if (incidentSize === 0) return 0;

    // Ideal time to query/analyze based on incident scale: 5 seconds per trace entry
    const idealSeconds = incidentSize * 5 + queryCount * 10;
    const ratio = elapsedSeconds / idealSeconds;

    // Fatigue/latency score scales up to 100 if elapsed time exceeds ideal baseline
    let score = Math.round(Math.min(1.0, ratio) * 100);
    if (elapsedSeconds > idealSeconds * 2) {
      score = 100;
    }

    return score;
  }

  /**
   * Evaluates cognitive overload from telemetry dashboard configuration and alert rate.
   */
  public scoreDashboardOverload(alertCount: number, telemetryResolutionSecs: number, panelCount: number): number {
    // High alert counts, high granularity (low resolution interval), and high panel count trigger overload
    const alertFactor = Math.min(1.0, alertCount / 20); // 20 alerts is extreme
    const resolutionFactor = telemetryResolutionSecs < 5 ? 1.0 : Math.max(0, 1.0 - (telemetryResolutionSecs / 60)); // resolution < 5s is noisy
    const panelFactor = Math.min(1.0, panelCount / 30); // >30 panels is visually overwhelming

    const overloadIndex = (alertFactor * 40) + (resolutionFactor * 30) + (panelFactor * 30);
    return Math.round(overloadIndex);
  }

  /**
   * Measures alert fatigue due to non-actionable alarms (false positive noise).
   */
  public scoreFalsePositiveFatigue(totalAlerts: number, actionableAlerts: number): number {
    if (totalAlerts === 0) return 0;
    const noiseRatio = (totalAlerts - actionableAlerts) / totalAlerts;
    return Math.round(noiseRatio * 100);
  }

  /**
   * Scores response efficiency to find root cause.
   */
  public evaluateTimeToRootCause(discoveryTimeMs: number, resolutionTimeMs: number): number {
    const totalMs = discoveryTimeMs + resolutionTimeMs;
    // Ideal MTTR target is under 5 minutes (300,000ms)
    const idealMs = 300000;
    if (totalMs <= idealMs) {
      return Math.round((totalMs / idealMs) * 50); // 0 to 50
    }
    const penaltyRatio = Math.min(1.0, (totalMs - idealMs) / (idealMs * 3)); // caps at 4x ideal
    return Math.round(50 + penaltyRatio * 50); // 50 to 100
  }

  /**
   * Generates a holistic Operator Cognition Report.
   */
  public generateReport(
    operatorActions: string[],
    standardPlaybook: string[],
    incidentSize: number,
    queryCount: number,
    elapsedSeconds: number,
    alertCount: number,
    telemetryResolutionSecs: number,
    panelCount: number,
    totalAlerts: number,
    actionableAlerts: number,
    discoveryTimeMs: number,
    resolutionTimeMs: number
  ): CognitionReport {
    const confusionScore = this.measureResponseConfusion(operatorActions, standardPlaybook);
    const reconstructionScore = this.calculateArchaeologyReconstructionLatency(incidentSize, queryCount, elapsedSeconds);
    const overloadIndex = this.scoreDashboardOverload(alertCount, telemetryResolutionSecs, panelCount);
    const fatigueScore = this.scoreFalsePositiveFatigue(totalAlerts, actionableAlerts);
    const timeToRootCauseScore = this.evaluateTimeToRootCause(discoveryTimeMs, resolutionTimeMs);

    const overallCognitiveLoad = Math.round(
      (confusionScore * 0.25) +
      (reconstructionScore * 0.25) +
      (overloadIndex * 0.20) +
      (fatigueScore * 0.15) +
      (timeToRootCauseScore * 0.15)
    );

    return {
      confusionScore,
      overloadIndex,
      fatigueScore,
      reconstructionScore,
      timeToRootCauseScore,
      overallCognitiveLoad
    };
  }
}
