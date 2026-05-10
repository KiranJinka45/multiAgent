import { EquilibriumMetrics } from './equilibrium';
import { InstitutionalTrustState } from './trust';
import { GovernanceDecision } from './federation';

export interface SystemHealth {
  readonly status: 'HEALTHY' | 'DEGRADED' | 'HALTED';
  readonly version: string;
  readonly activeWitnesses: number;
  readonly lastFinalizedEpoch: string;
}

/**
 * 🛡️ OperatorConsole
 * Provides the interface for human operators to monitor and govern the institutional substrate.
 * Focuses on clarity, explainability, and operational ergonomics.
 */
export class OperatorConsole {
  /**
   * Generates a high-level Governance Dashboard snapshot.
   */
  public getDashboardSnapshot(
    health: SystemHealth, 
    equilibrium: EquilibriumMetrics,
    trustMap: Map<string, InstitutionalTrustState>
  ): string {
    const trustStats = Array.from(trustMap.values()).reduce((acc, state) => {
      acc[state] = (acc[state] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    return `
--- 🛡️ ZTAN GOVERNANCE DASHBOARD ---
[SYSTEM HEALTH]  : ${health.status} (v${health.version})
[ACTIVE NODES]   : ${health.activeWitnesses}
[LAST EPOCH]     : ${health.lastFinalizedEpoch}

[GOVERNANCE EQUILIBRIUM]
- Entropy       : ${(equilibrium.quorumEntropy * 100).toFixed(2)}%
- Concentration : ${(equilibrium.coalitionConcentration * 100).toFixed(2)}%
- Pluralism     : ${equilibrium.quorumEntropy > 0.8 ? 'STRONG' : 'DEGRADED'}

[INSTITUTIONAL POSTURE]
- TRUSTED      : ${trustStats[InstitutionalTrustState.TRUSTED] || 0}
- LIMITED      : ${trustStats[InstitutionalTrustState.LIMITED_TRUST] || 0}
- SUSPENDED    : ${trustStats[InstitutionalTrustState.SUSPENDED] || 0}
- REVOKED      : ${trustStats[InstitutionalTrustState.REVOKED] || 0}

[OPERATOR ACTIONS REQUIRED]
${health.status !== 'HEALTHY' ? '⚠️ IMMEDIATE ACTION: System Degraded. Check Chaos Logs.' : '✅ No active alerts.'}
------------------------------------
    `;
  }

  /**
   * Exports forensic evidence for a specific decision.
   */
  public exportForensicEvidence(decisionId: string, trace: any): string {
    return JSON.stringify({
      decisionId,
      timestamp: new Date().toISOString(),
      evidence: trace,
      status: 'AUDIT_READY'
    }, null, 2);
  }
}
