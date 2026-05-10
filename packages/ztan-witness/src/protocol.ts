import * as crypto from 'crypto';
import { RootEpoch } from './ledger';
import { IdentityRegistry } from './identity';
import { QuorumEngine, QuorumState } from './quorum';
import { LivenessMonitor } from './liveness';
import { logger } from '../../observability/src';

export enum EpochState {
  PENDING = "PENDING",
  VALIDATED = "VALIDATED",
  ACCEPTED = "ACCEPTED",
  REJECTED = "REJECTED",
  QUARANTINED = "QUARANTINED", // Valid but missing lineage
  CONFLICTED = "CONFLICTED",   // Equivocation detected
  RECONCILED = "RECONCILED"    // Resolved conflict
}

export interface EpochExchangePacket {
  readonly protocol: string; // "ZFP/1.0"
  readonly sender: string;   // witnessId
  readonly epoch: RootEpoch;
}

export interface EpochAuditTrail {
  readonly packet: EpochExchangePacket;
  state: EpochState;
  readonly observedAt: string;
  failureReason?: string;
}

/**
 * 🛡️ FederationProtocolHandler
 * Enforces the constitutional rules of distributed reconciliation.
 * Rejects any epoch that violates lineage or identity invariants.
 */
export class FederationProtocolHandler {
  private auditTrail: EpochAuditTrail[] = [];
  private quarantineBuffer: Map<number, EpochExchangePacket> = new Map();

  constructor(
    private readonly registry: IdentityRegistry,
    private readonly latestLocalEpoch: RootEpoch | null,
    private readonly quorumEngine: QuorumEngine,
    private readonly livenessMonitor?: LivenessMonitor
  ) {}

  /**
   * Processes an incoming epoch packet and moves it through the fault state machine.
   */
  public process(packet: EpochExchangePacket): EpochAuditTrail {
    const trail: EpochAuditTrail = {
      packet,
      state: EpochState.PENDING,
      observedAt: new Date().toISOString()
    };
    this.auditTrail.push(trail);

    // 1. Identity Verification
    const witness = this.registry.getWitness(packet.sender);
    if (!witness) {
      return this.fail(trail, EpochState.REJECTED, "Unauthorized witness");
    }

    // 2. Protocol Integrity
    if (packet.protocol !== "ZFP/1.0") {
      return this.fail(trail, EpochState.REJECTED, "Unsupported protocol version");
    }

    // 3. Signature Verification
    const isSignatureValid = this.verifyEpochSignature(packet.epoch, witness.publicKey);
    if (!isSignatureValid) {
      return this.fail(trail, EpochState.REJECTED, "Invalid witness signature");
    }

    trail.state = EpochState.VALIDATED;

    // 4. Lineage Continuity (prevRootHash check)
    if (this.latestLocalEpoch) {
      // Check for Equivocation (Same ID, Different Root)
      if (packet.epoch.epochId === this.latestLocalEpoch.epochId && packet.epoch.rootHash !== this.latestLocalEpoch.rootHash) {
        return this.fail(trail, EpochState.CONFLICTED, "Equivocation detected: Divergent root for same epoch");
      }

      // Check for Lineage Breach
      if (packet.epoch.epochId === this.latestLocalEpoch.epochId + 1 && packet.epoch.prevRootHash !== this.latestLocalEpoch.rootHash) {
        return this.fail(trail, EpochState.REJECTED, "Lineage breach: prevRootHash mismatch");
      }

      // Check for Out-of-Order / Delayed Epochs
      if (packet.epoch.epochId > this.latestLocalEpoch.epochId + 1) {
        this.quarantineBuffer.set(packet.epoch.epochId, packet);
        return this.fail(trail, EpochState.QUARANTINED, "Lineage gap: Waiting for intermediate epochs");
      }

      // Check for Duplicates
      if (packet.epoch.epochId <= this.latestLocalEpoch.epochId) {
        return this.fail(trail, EpochState.REJECTED, "Duplicate epoch: Already committed or stale");
      }
    }

    trail.state = EpochState.ACCEPTED;
    
    // 5. Quorum Attestation & Liveness Monitoring
    this.livenessMonitor?.monitorEpoch(packet.epoch.epochId);
    this.quorumEngine.attest(packet.epoch.epochId, {
      witnessId: packet.sender,
      signature: packet.epoch.signature,
      rootHash: packet.epoch.rootHash,
      timestamp: new Date().toISOString()
    });

    logger.info({ epochId: packet.epoch.epochId }, '[ProtocolHandler] Epoch ACCEPTED and ATTESTED');
    return trail;
  }

  private fail(trail: EpochAuditTrail, state: EpochState, reason: string): EpochAuditTrail {
    trail.state = state;
    trail.failureReason = reason;
    logger.error({ 
      epochId: trail.packet.epoch.epochId, 
      state, 
      reason 
    }, '[ProtocolHandler] Epoch processing failed');
    return trail;
  }

  public getAuditTrail(): ReadonlyArray<EpochAuditTrail> {
    return Object.freeze([...this.auditTrail]);
  }

  public getQuarantineCount(): number {
    return this.quarantineBuffer.size;
  }

  private verifyEpochSignature(epoch: RootEpoch, publicKey: string): boolean {
    const { signature, ...summary } = epoch;
    return crypto.verify(
      "sha256",
      Buffer.from(JSON.stringify(summary)),
      {
        key: publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      Buffer.from(signature, 'base64')
    );
  }
}
