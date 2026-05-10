import { QuorumEngine, QuorumState } from './quorum';
import { IdentityRegistry } from './identity';
import { EvidenceEngine, EvidenceType } from './evidence';
import { logger } from '../../observability/src';

export interface ArbitrationJustification {
  readonly epochId: number;
  readonly winningRoot: string;
  readonly losingRoots: string[];
  readonly policy: string;
  readonly decisionBasis: string;
}

/**
 * 🛡️ ArbitrationEngine
 * Deterministically resolves institutional truth conflicts.
 * In a distributed world, disagreement is inevitable; governance must be deterministic.
 */
export class ArbitrationEngine {
  constructor(
    private readonly quorumEngine: QuorumEngine,
    private readonly registry: IdentityRegistry,
    private readonly evidenceEngine?: EvidenceEngine
  ) {}

  /**
   * Arbitrates a disputed epoch based on constitutional precedence rules.
   */
  public arbitrate(epochId: number): ArbitrationJustification {
    const currentState = this.quorumEngine.getEpochState(epochId);
    if (currentState !== QuorumState.DISPUTED) {
      throw new Error(`[ArbitrationEngine] Cannot arbitrate epoch ${epochId}: Not in DISPUTED state`);
    }

    // Accessing internal attestations (via public API in reality)
    const attestations = (this.quorumEngine as any).attestations.get(epochId);
    
    // 1. Group and Count
    const rootCounts: Map<string, string[]> = new Map(); // rootHash -> witnessIds[]
    for (const [witnessId, att] of (attestations as Map<string, any>).entries()) {
      const witnesses = rootCounts.get(att.rootHash) || [];
      witnesses.push(witnessId);
      rootCounts.set(att.rootHash, witnesses);
    }

    const sortedRoots = Array.from(rootCounts.entries()).sort((a, b) => {
      // Primary Policy: Higher Attestation Count wins
      if (a[1].length !== b[1].length) {
        return b[1].length - a[1].length;
      }

      // Secondary Policy: Seniority (Oldest registered witness wins)
      const aSeniority = Math.min(...a[1].map(id => 
        new Date(this.registry.getWitness(id)?.registeredAt || "").getTime()
      ));
      const bSeniority = Math.min(...b[1].map(id => 
        new Date(this.registry.getWitness(id)?.registeredAt || "").getTime()
      ));
      return aSeniority - bSeniority;
    });

    const [winningRoot, winningWitnesses] = sortedRoots[0];
    const losingRoots = sortedRoots.slice(1).map(r => r[0]);

    const justification: ArbitrationJustification = {
      epochId,
      winningRoot,
      losingRoots,
      policy: "Institutional Seniority & Quorum Dominance",
      decisionBasis: `Root ${winningRoot} won with ${winningWitnesses.length} attestations.`
    };

    logger.info({ justification }, '[ArbitrationEngine] Institutional arbitration complete');

    // 2. Generate Evidence for Lapsers (Byzantine Evidence)
    if (this.evidenceEngine) {
      for (const losingRoot of losingRoots) {
        const losers = rootCounts.get(losingRoot) || [];
        for (const witnessId of losers) {
          this.evidenceEngine.record({
            type: EvidenceType.EQUIVOCATION,
            witnessId,
            epochId,
            packets: [], // In real implementation, would include raw packets
            timestamp: new Date().toISOString()
          });
        }
      }
    }

    // 3. Force QuorumEngine state update
    (this.quorumEngine as any).epochStates.set(epochId, QuorumState.ARBITRATED);

    return justification;
  }
}
