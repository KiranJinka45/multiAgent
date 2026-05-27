/**
 * ─── ZTAN Codebase Simplification Enforcer ────────────────────────────────────
 * Enforces a strict deletion-to-addition ratio on codebase modifications
 * and blocks dependency creep to ensure long-term maintenance sanity.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface SimplificationReport {
  isCompliant: boolean;
  addedLoc: number;
  deletedLoc: number;
  deletionRatio: number;
  targetRatio: number;
  shrinkQuotient: number; // positive = net shrink, negative = net growth
  error?: string;
}

export interface DependencyAuditReport {
  isCompliant: boolean;
  currentCount: number;
  baselineCount: number;
  drift: number;
  error?: string;
}

export class CodebaseSimplificationEnforcer {
  private targetDeletionRatio: number; // e.g., 0.5 (delete 1 line for every 2 added)

  constructor(targetDeletionRatio: number = 0.5) {
    this.targetDeletionRatio = targetDeletionRatio;
  }

  /**
   * Evaluates if a code change meets the deletion quota requirements.
   */
  public evaluateSimplificationRatio(addedLoc: number, deletedLoc: number): SimplificationReport {
    const deletionRatio = addedLoc === 0 ? 1.0 : deletedLoc / addedLoc;
    const shrinkQuotient = deletedLoc - addedLoc;
    const isCompliant = addedLoc === 0 || deletionRatio >= this.targetDeletionRatio;

    let error: string | undefined;
    if (!isCompliant) {
      const requiredDeletion = Math.ceil(addedLoc * this.targetDeletionRatio);
      error = `Simplification quota check failed. Net growth: ${addedLoc} additions, ${deletedLoc} deletions. Deletion ratio is ${Math.round(deletionRatio * 100)}% (Target: ${Math.round(this.targetDeletionRatio * 100)}%). Deletion of at least ${requiredDeletion} lines required.`;
    }

    return {
      isCompliant,
      addedLoc,
      deletedLoc,
      deletionRatio: Math.round(deletionRatio * 100) / 100,
      targetRatio: this.targetDeletionRatio,
      shrinkQuotient,
      error
    };
  }

  /**
   * Enforces zero-dependency expansion, blocking any drift above the baseline.
   */
  public auditDependencyCount(currentCount: number, baselineCount: number): DependencyAuditReport {
    const drift = currentCount - baselineCount;
    const isCompliant = drift <= 0;

    let error: string | undefined;
    if (!isCompliant) {
      error = `Dependency limit violation. Baseline count: ${baselineCount}, Current count: ${currentCount}. Dependency creep of +${drift} detected. Approvals blocked.`;
    }

    return {
      isCompliant,
      currentCount,
      baselineCount,
      drift,
      error
    };
  }
}
