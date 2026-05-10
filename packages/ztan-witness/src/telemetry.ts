import { EquilibriumMetrics } from './equilibrium';
import { SystemHealth } from './console';
import { db } from '@packages/db';
import { logger } from '../../observability/src';

export enum TelemetryTier {
  T0_SAFETY = 'T0_SAFETY',             // Existential threats (Divergence, Compromise)
  T1_INTEGRITY = 'T1_INTEGRITY',       // Governance rules (Anti-capture, Quorum)
  T2_OPERATIONAL = 'T2_OPERATIONAL',   // Degradation (Latency, Stagnation)
  T3_ANALYTICS = 'T3_ANALYTICS'        // Informational (Metrics, Entropy drift)
}

export interface OperatorMetrics {
  meanTimeToResolve: number; // Minutes
  runbookAdherenceRate: number; // 0.0 - 1.0
  manualInterventionCount: number;
  alertFatigueScore: number; // 0.0 - 1.0
  skippedAuditCount: number;  // Stewardship decay metric
  ignoredAlertCount: number;  // Stewardship decay metric
  performativeAdherenceScore: number; // 0.0 - 1.0 (Theater detection)
  escalationAvoidanceRate: number;    // 0.0 - 1.0 (Sociological drift)
  exceptionDependencyRate: number;    // 0.0 - 1.0 (Constitutional overfitting)
  normalcyRestorationRate: number;    // 0.0 - 1.0 (Healing effectiveness)
  retrospectiveDisagreementRate: number; // 0.0 - 1.0 (Legitimacy divergence)
  postRestorationDissentRate: number;    // 0.0 - 1.0 (Ritualization drift)
  reopenedArbitrationCount: number;      // Count of re-opened cases
  symbolicToOperationalRatio: number; 
  auditVigilanceScore: number; 
  decisionDominanceIndex: Map<string, number>; 
  silenceRiskScore: number; // 0.0 - 1.0 (Higher = excessive smoothness/hidden capture)
  infrastructureHealth: number; // Technical Correctness
  legitimacyHealth: number; // Institutional Sincerity
}

export interface OperationalSnapshot {
  timestamp: string;
  epochId: string;
  health: SystemHealth;
  metrics: EquilibriumMetrics;
  operatorMetrics: OperatorMetrics;
  sloAdherence: Record<string, boolean>;
  tier: TelemetryTier;
}

/**
 * 🛡️ LongitudinalEvidenceEngine
 * Collects and persists institutional evidence over time to prove long-term trustworthiness.
 */
export class LongitudinalEvidenceEngine {
  private history: OperationalSnapshot[] = [];

  /**
   * Captures an operational snapshot including human operator metrics and tiering.
   */
  public async captureSnapshot(
    epochId: string, 
    health: SystemHealth, 
    metrics: EquilibriumMetrics,
    operatorMetrics: OperatorMetrics,
    sloAdherence: Record<string, boolean>,
    tier: TelemetryTier = TelemetryTier.T3_ANALYTICS
  ): Promise<void> {
    const snapshot: OperationalSnapshot = {
      timestamp: new Date().toISOString(),
      epochId,
      health,
      metrics,
      operatorMetrics,
      sloAdherence,
      tier
    };

    this.history.push(snapshot);
    logger.info({ epochId }, `[Evidence] Snapshot captured for Epoch. History size: ${this.history.length}`);
    
    // 🛡️ PERSISTENCE: Save to Merkleized Audit Store
    try {
        await (db as any).operationalSnapshot.create({
            data: {
                epochId,
                healthStatus: health.status,
                quorumEntropy: metrics.quorumEntropy,
                activeWitnesses: metrics.witnessCount,
                priesthoodRisk: operatorMetrics.decisionDominanceIndex ? 
                    Math.max(...Object.values(Object.fromEntries(operatorMetrics.decisionDominanceIndex))) : 0,
                silenceRisk: operatorMetrics.silenceRiskScore,
                infrastructureHealth: operatorMetrics.infrastructureHealth,
                legitimacyHealth: operatorMetrics.legitimacyHealth,
                sloAdherence: sloAdherence,
                operatorMetrics: operatorMetrics as any,
                tier,
                // Generate a simple hash of the state for tamper-detection
                hash: this.calculateSnapshotHash(snapshot)
            }
        });
        logger.debug({ epochId }, '[Evidence] Snapshot persisted to ZTAN Audit Store');
    } catch (err: any) {
        logger.error({ err: err.message, epochId }, '[Evidence] FAILED TO PERSIST SNAPSHOT');
    }
  }

  private calculateSnapshotHash(snapshot: OperationalSnapshot): string {
    const { timestamp, ...data } = snapshot;
    const crypto = require('crypto');
    return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
  }

  /**
   * Tracks "Audit Vigilance" via randomized forensic sampling.
   * "Probabilistic Deep Audit" - Humans cannot maintain perfect vigilance.
   */
  public performRandomizedAudit(epochId: string): boolean {
    const auditProbability = 0.1; // 10% sampling rate
    if (Math.random() < auditProbability) {
      console.log(`[Telemetry] RANDOMIZED AUDIT INITIATED: Deep forensic review of Epoch ${epochId}`);
      return true; 
    }
    return false;
  }

  /**
   * Calculates Governance Compression.
   * Target: Low symbolic-to-operational ratio.
   */
  public calculateCompression(): void {
    const ratio = this.history[this.history.length - 1]?.operatorMetrics.symbolicToOperationalRatio ?? 0;
    console.log(`[Telemetry] Governance Compression Metric: ${ratio.toFixed(2)}`);
  }

  /**
   * Performs an Anti-Metric Audit.
   * Checks if metrics themselves are becoming performative/gamed.
   */
  public performAntiMetricAudit(): void {
    const latest = this.history[this.history.length - 1];
    if (!latest) return;

    if (latest.operatorMetrics.performativeAdherenceScore > 0.9) {
      console.warn("[Telemetry] ANTI-METRIC ALERT: High performative score detected. Metrics may be gamed.");
    }

    // 🛡️ Quantitative Decision Dominance Enforcement
    for (const [node, authorship] of latest.operatorMetrics.decisionDominanceIndex.entries()) {
      if (authorship > 0.3) {
        console.error(`[Telemetry] PRIESTHOOD ALERT: Node ${node} has exceeded the 30% Authorship Ceiling (${(authorship * 100).toFixed(2)}%). Institutional pluralism is at risk.`);
      }
    }
  }

  /**
   * Generates an Operational Posture Report.
   * "Boring" procedural language - No civilizational rhetoric.
   */
  public generatePostureReport(): string {
    const latest = this.history[this.history.length - 1];
    if (!latest) return "Operational state: Unknown.";

    return `
ZTAN OPERATIONAL REPORT 🛡️
--------------------------------
STATUS      : OPERATIONAL
INFRA HEALTH: ${(latest.operatorMetrics.infrastructureHealth * 100).toFixed(2)}%
LEGITIMACY  : ${(latest.operatorMetrics.legitimacyHealth * 100).toFixed(2)}%
SILENCE RISK: ${latest.operatorMetrics.silenceRiskScore.toFixed(2)}
--------------------------------
DOMINANCE INDEX:
${JSON.stringify(Object.fromEntries(latest.operatorMetrics.decisionDominanceIndex))}
--------------------------------
    `;
  }
}
