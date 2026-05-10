import { EquilibriumMetrics } from './equilibrium';
import { GovernancePower } from './power';

export interface GovernanceDecision {
  readonly type: 'STATE_TRANSITION' | 'TRUST_UPDATE' | 'CONSTITUTIONAL_ACT' | 'EMERGENCY_HALT';
  readonly targetId: string;
  readonly parameters: Record<string, any>;
  readonly outcome: 'APPROVED' | 'REJECTED' | 'DISPUTED';
}

/**
 * 🛡️ FederatedGovernanceReceipt
 * A cryptographically persistent institutional artifact representing a governed decision.
 * Ensures that governance itself is replayable and auditable.
 */
export interface FederatedGovernanceReceipt {
  readonly receiptId: string;
  readonly timestamp: string;
  readonly decision: GovernanceDecision;
  readonly participants: string[];
  readonly weights: Record<string, number>;
  readonly equilibriumMetrics: EquilibriumMetrics;
  readonly quorumProof: string; // Merkle root or aggregate signature
  readonly constitutionalBasis: string; // Reference to the rule-set applied
  readonly arbitrationTrace?: string; // If ARBITRATED, link to the trace
}

/**
 * 🛡️ FederatedQuorumEngine
 * Orchestrates multi-institutional governance coordination.
 */
export class FederatedQuorumEngine {
  private receipts: FederatedGovernanceReceipt[] = [];

  /**
   * Emits a Federated Governance Receipt.
   * "Justification Rotation": Warns if a single operator is dominating the 
   * constitutional narrative.
   */
  public emitReceipt(receipt: FederatedGovernanceReceipt, proposerId: string, lastAuthorId: string): void {
    if (proposerId === lastAuthorId) {
      console.warn(`[Federation] DOMINANCE ALERT: ${proposerId} is attempting repeated authorship. Rotation encouraged.`);
    }
    this.receipts.push(receipt);
  }

  public getReceipt(receiptId: string): FederatedGovernanceReceipt | undefined {
    return this.receipts.find(r => r.receiptId === receiptId);
  }

  public listReceipts(): FederatedGovernanceReceipt[] {
    return [...this.receipts];
  }
}
