import * as fs from 'fs';
import * as path from 'path';

export type FailureScenarioClass = 'WAL_CORRUPTION' | 'REPLICA_FENCING' | 'DKG_KEY_FAILURE' | 'LEASE_STARVATION';

export interface RecoveryActionRecord {
  timestamp: number;
  actionName: string;
  isAmbiguous: boolean; // True if action is a redundant query or repeated retry
}

export interface OperatorCertificationReport {
  scenario: FailureScenarioClass;
  startTime: number;
  endTime: number;
  mttrMs: number;
  success: boolean;
  actions: RecoveryActionRecord[];
  ambiguityScore: number; // Penalty based on redundant/unproductive actions (0 = perfect)
  reproducibilityRate: number; // 0.0 to 1.0 based on path variance
}

export class OperatorRecoveryCertification {
  private activeScenario?: FailureScenarioClass;
  private startTime: number = 0;
  private actions: RecoveryActionRecord[] = [];
  private reportDir: string;

  constructor(reportDir: string) {
    this.reportDir = reportDir;
  }

  /**
   * Triggers a specific failure scenario and starts the recovery timer.
   */
  public triggerFailure(scenario: FailureScenarioClass): void {
    this.activeScenario = scenario;
    this.startTime = Date.now();
    this.actions = [];
  }

  /**
   * Records an operator action during a recovery drill.
   */
  public recordAction(actionName: string, isAmbiguous: boolean = false): void {
    this.actions.push({
      timestamp: Date.now(),
      actionName,
      isAmbiguous,
    });
  }

  /**
   * Finalizes the recovery drill and compiles the human recovery science metrics.
   */
  public completeRecovery(success: boolean): OperatorCertificationReport {
    if (!this.activeScenario) {
      throw new Error('[SECURITY] No active failure scenario to complete.');
    }

    const endTime = Date.now();
    const mttrMs = endTime - this.startTime;

    // Ambiguity Score calculation:
    // Every ambiguous action penalizes by 10 points. If MTTR is exceptionally long, apply minor time penalty.
    const ambiguousCount = this.actions.filter(a => a.isAmbiguous).length;
    const ambiguityScore = ambiguousCount * 10 + Math.min(50, Math.floor(mttrMs / 10000));

    // Reproducibility Rate:
    // Compares path actions against nominal expected sequence length.
    const expectedLength = 4; // Nominal recovery path actions count
    const actualLength = this.actions.length;
    const reproducibilityRate = Math.max(0, 1 - Math.abs(actualLength - expectedLength) / expectedLength);

    const report: OperatorCertificationReport = {
      scenario: this.activeScenario,
      startTime: this.startTime,
      endTime,
      mttrMs,
      success,
      actions: [...this.actions],
      ambiguityScore,
      reproducibilityRate: parseFloat(reproducibilityRate.toFixed(4)),
    };

    this.saveReport(report);
    this.activeScenario = undefined;

    return report;
  }

  private saveReport(report: OperatorCertificationReport): void {
    try {
      if (!fs.existsSync(this.reportDir)) {
        fs.mkdirSync(this.reportDir, { recursive: true });
      }
      const filepath = path.join(this.reportDir, `operator_drill_${report.scenario}_${Date.now()}.json`);
      fs.writeFileSync(filepath, JSON.stringify(report, null, 2), 'utf8');
    } catch (err) {
      // Safe fallback
    }
  }

  public getActiveScenario(): FailureScenarioClass | undefined {
    return this.activeScenario;
  }
}
