import { RootEpoch } from './ledger';
import { logger } from '../../observability/src';

export enum QuorumState {
  PROPOSED = "PROPOSED",
  ATTESTED = "ATTESTED",
  QUORUM_REACHED = "QUORUM_REACHED",
  FINALIZED = "FINALIZED",
  DISPUTED = "DISPUTED",     // Multiple quorums detected for same ID
  ARBITRATED = "ARBITRATED", // Conflict resolved by policy
  RECONCILED = "RECONCILED", // Merged back into main lineage
  EXPIRED = "EXPIRED",       // Quorum not reached within timeout
  HALTED = "HALTED",         // Critical failure requiring intervention
  DIVERGED = "DIVERGED"
}

export interface QuorumThresholds {
  readonly minWitnessCount: number;
  readonly percentageRequired: number; // e.g. 0.67 for 2/3
}

export interface EpochAttestation {
  readonly witnessId: string;
  readonly signature: string;
  readonly rootHash: string; // The root hash the witness is attesting to
  readonly timestamp: string;
}

/**
 * 🛡️ QuorumEngine
 * Governs the convergence of institutional truth across multiple witnesses.
 * Truth is only FINALIZED when institutional quorum is reached.
 */
export class QuorumEngine {
  private attestations: Map<number, Map<string, EpochAttestation>> = new Map();
  private epochStates: Map<number, QuorumState> = new Map();

  constructor(
    private readonly thresholds: QuorumThresholds,
    private readonly authorizedWitnessCount: number
  ) {}

  /**
   * Registers an attestation from a witness for a specific epoch.
   */
  public attest(epochId: number, attestation: EpochAttestation): QuorumState {
    if (!this.attestations.has(epochId)) {
      this.attestations.set(epochId, new Map());
      this.epochStates.set(epochId, QuorumState.PROPOSED);
    }

    const epochAttestations = this.attestations.get(epochId)!;
    epochAttestations.set(attestation.witnessId, attestation);

    return this.evaluateQuorum(epochId);
  }

  /**
   * Evaluates if quorum has been reached for a given epoch.
   * Now detects root divergence (Competing Quorums).
   */
  private evaluateQuorum(epochId: number): QuorumState {
    const epochAttestations = this.attestations.get(epochId)!;
    
    // Group attestations by root hash to detect divergence
    const rootGroups: Map<string, number> = new Map();
    for (const attestation of epochAttestations.values()) {
      const count = (rootGroups.get(attestation.rootHash) || 0) + 1;
      rootGroups.set(attestation.rootHash, count);
    }

    let state = QuorumState.ATTESTED;

    // Check for Competing Quorums (More than one root hash has attestations)
    if (rootGroups.size > 1) {
      state = QuorumState.DISPUTED;
      logger.warn({ epochId, roots: Array.from(rootGroups.keys()) }, '[QuorumEngine] CONFLICT DETECTED: Competing roots for same epoch');
    } else {
      const count = epochAttestations.size;
      const percentage = count / this.authorizedWitnessCount;

      if (count >= this.thresholds.minWitnessCount && percentage >= this.thresholds.percentageRequired) {
        state = QuorumState.QUORUM_REACHED;
      }
    }

    this.epochStates.set(epochId, state);
    
    logger.info({ 
      epochId, 
      state, 
      rootCount: rootGroups.size,
      threshold: this.thresholds.minWitnessCount 
    }, '[QuorumEngine] Quorum state updated');

    return state;
  }

  /**
   * Finalizes an epoch once institutional quorum is reached and verified.
   */
  public finalize(epochId: number): void {
    const currentState = this.epochStates.get(epochId);
    if (currentState !== QuorumState.QUORUM_REACHED) {
      throw new Error(`[QuorumEngine] Cannot finalize epoch ${epochId}: Quorum not reached (current state: ${currentState})`);
    }

    this.epochStates.set(epochId, QuorumState.FINALIZED);
    logger.info({ epochId }, '[QuorumEngine] Institutional Epoch FINALIZED');
  }

  public getEpochState(epochId: number): QuorumState {
    return this.epochStates.get(epochId) || QuorumState.PROPOSED;
  }

  public getAttestationCount(epochId: number): number {
    return this.attestations.get(epochId)?.size || 0;
  }
}
