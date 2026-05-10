import { EpochExchangePacket } from './protocol';
import { logger } from '../../observability/src';

export enum EvidenceType {
  EQUIVOCATION = "EQUIVOCATION",         // Same witness, same epoch, different roots
  LINEAGE_BREACH = "LINEAGE_BREACH",     // Invalid prevRootHash
  REPLAY_CONFLICT = "REPLAY_CONFLICT",   // Replay execution produces divergent root
  STAGNATION = "STAGNATION"              // Deliberate inactivity (future)
}

export interface ByzantineEvidence {
  readonly type: EvidenceType;
  readonly witnessId: string;
  readonly epochId: number;
  readonly packets: EpochExchangePacket[]; // The raw evidence packets
  readonly replayHash?: string;           // Optional hash from independent replay
  readonly timestamp: string;
}

export interface SlashingPacket {
  readonly evidence: ByzantineEvidence;
  readonly severity: "CRITICAL" | "HIGH" | "MEDIUM";
  readonly recommendation: "SUSPEND" | "REJECT_TRUTH" | "OBSERVE";
  readonly justification: string;
}

/**
 * 🛡️ EvidenceEngine
 * Formalizes forensic accountability for Byzantine behavior.
 * Behavior is no longer just "wrong"; it is recorded as institutional evidence.
 */
export class EvidenceEngine {
  private evidenceVault: Map<string, ByzantineEvidence[]> = new Map();

  /**
   * Records Byzantine evidence for a specific witness.
   */
  public record(evidence: ByzantineEvidence): SlashingPacket {
    const witnessEvidence = this.evidenceVault.get(evidence.witnessId) || [];
    witnessEvidence.push(evidence);
    this.evidenceVault.set(evidence.witnessId, witnessEvidence);

    const packet: SlashingPacket = {
      evidence,
      severity: evidence.type === EvidenceType.EQUIVOCATION ? "CRITICAL" : "HIGH",
      recommendation: "REJECT_TRUTH",
      justification: `Byzantine behavior detected: ${evidence.type} on Epoch ${evidence.epochId}.`
    };

    logger.error({ packet }, '[EvidenceEngine] Byzantine evidence recorded');
    return packet;
  }

  public getEvidenceForWitness(witnessId: string): ByzantineEvidence[] {
    return this.evidenceVault.get(witnessId) || [];
  }
}
