export interface PolicyEfficacyReport {
  efficacyRatio: number;
  costBenefitRatio: number; // Avg overhead ms per blocked violation
  efficacyScore: number; // 0 to 100
  recommendation: 'RETAIN' | 'OPTIMIZE' | 'RETIRE';
}

export interface RetirementDecision {
  policyName: string;
  retirementIndex: number; // 0 to 100
  shouldRetire: boolean;
  reasons: string[];
}

export interface PolicyLog {
  policyName: string;
  action: 'ENABLE' | 'DISABLE' | 'MODIFY';
  timestamp: string; // ISO String
  reason: string;
}

export interface RollbackAuditReport {
  churnCount: number;
  rollbackList: {
    policyName: string;
    disabledAt: string;
    reason: string;
  }[];
  churnRiskScore: number; // 0 to 100
  isVolatile: boolean;
}

export class PolicyRetirementEngine {
  /**
   * Evaluates the efficacy of a policy gate based on its blocking rate and runtime processing overhead.
   */
  public scorePolicyEfficacy(
    policyName: string,
    evaluations: number,
    rejections: number,
    avgOverheadMs: number
  ): PolicyEfficacyReport {
    if (evaluations === 0) {
      return { efficacyRatio: 0, costBenefitRatio: 0, efficacyScore: 0, recommendation: 'RETIRE' };
    }

    const efficacyRatio = rejections / evaluations;
    // Total ms spent per single blocked violation (lower is better)
    const totalMsSpent = avgOverheadMs * evaluations;
    const costBenefitRatio = Math.round((totalMsSpent / (rejections || 1)) * 100) / 100;

    let efficacyScore = 0;
    let recommendation: PolicyEfficacyReport['recommendation'] = 'RETAIN';

    if (rejections > 0) {
      // Benefit is high: base score on overhead
      // If costBenefitRatio < 50ms per block -> score 90+
      // If costBenefitRatio > 1000ms per block -> score decays
      const overheadFactor = Math.max(0, 1.0 - costBenefitRatio / 2000);
      efficacyScore = Math.round(50 + (overheadFactor * 50));
    } else {
      // Useless policy (0 rejections): score decays as evaluations and overhead increase
      const bloatFactor = Math.min(1.0, totalMsSpent / 5000); // 5s total overhead with 0 hits
      efficacyScore = Math.round(50 * (1.0 - bloatFactor));
    }

    if (efficacyScore >= 75) {
      recommendation = 'RETAIN';
    } else if (efficacyScore >= 40) {
      recommendation = 'OPTIMIZE';
    } else {
      recommendation = 'RETIRE';
    }

    return {
      efficacyRatio: Math.round(efficacyRatio * 10000) / 10000,
      costBenefitRatio,
      efficacyScore,
      recommendation
    };
  }

  /**
   * Evaluates whether a policy should be retired based on age, idle time, and complexity overhead.
   */
  public evaluateRetirementCandidate(
    policyName: string,
    ageDays: number,
    idleDays: number,
    complexityRank: number // 1 (low) to 5 (high)
  ): RetirementDecision {
    const reasons: string[] = [];

    // Base retirement calculation
    // Max baseline thresholds: 90 days idle is critical
    const idleFactor = Math.min(1.0, idleDays / 90);
    const ageFactor = Math.min(1.0, ageDays / 365);
    const complexityFactor = complexityRank / 5;

    const retirementIndexRaw = (idleFactor * 50) + (ageFactor * 25) + (complexityFactor * 25);
    const retirementIndex = Math.round(retirementIndexRaw);

    if (idleDays > 90) {
      reasons.push(`Policy has been idle/inactive for ${idleDays} days (Threshold: 90 days).`);
    }
    if (ageDays > 180 && idleDays > 60) {
      reasons.push(`Stale constraint: policy is ${ageDays} days old and idle for ${idleDays} days.`);
    }
    if (complexityRank >= 4 && idleDays > 30) {
      reasons.push(`High complexity policy (Rank ${complexityRank}) is idle for ${idleDays} days.`);
    }

    const shouldRetire = retirementIndex > 70;

    return {
      policyName,
      retirementIndex,
      shouldRetire,
      reasons
    };
  }

  /**
   * Audits historical policy changes to identify config churn and volatile rollback events.
   */
  public auditGovernanceRollback(policyLogs: PolicyLog[]): RollbackAuditReport {
    let churnCount = 0;
    const rollbackList: RollbackAuditReport['rollbackList'] = [];
    const stateMap = new Map<string, 'ENABLE' | 'DISABLE' | 'MODIFY'>();
    const changeCounts = new Map<string, number>();

    // Sort by timestamp
    const sortedLogs = [...policyLogs].sort(
      (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
    );

    for (const log of sortedLogs) {
      const prevAction = stateMap.get(log.policyName);
      stateMap.set(log.policyName, log.action);

      if (prevAction && prevAction !== log.action) {
        churnCount++;
        changeCounts.set(log.policyName, (changeCounts.get(log.policyName) ?? 0) + 1);
      }

      if (log.action === 'DISABLE') {
        rollbackList.push({
          policyName: log.policyName,
          disabledAt: log.timestamp,
          reason: log.reason
        });
      }
    }

    // Identify volatile policies (e.g. toggled more than 2 times)
    let maxChurn = 0;
    for (const count of changeCounts.values()) {
      if (count > maxChurn) {
        maxChurn = count;
      }
    }

    // Churn Risk Score (0 to 100)
    // Risk escalates if overall churn is high or single policies are toggled repeatedly
    const totalRiskRaw = (churnCount * 10) + (maxChurn * 20);
    const churnRiskScore = Math.min(100, Math.round(totalRiskRaw));
    const isVolatile = maxChurn >= 3 || churnRiskScore > 50;

    return {
      churnCount,
      rollbackList,
      churnRiskScore,
      isVolatile
    };
  }
}
