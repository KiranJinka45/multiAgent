import { ThresholdCrypto, KeyShare, PartialSignature } from './crypto-utils';

const logger = console;

export interface TelemetryData {
  nodeId: string;
  metrics: {
    cpu: number;
    memory: number;
    latency: number;
    errors: number;
  };
}

export interface SreDecision {
  eventId: string;
  type: string;
  targetNode: string;
  reason: string;
  timestamp: number;
}

export interface TrustAttestation {
  eventId: string;
  status: 'PASS' | 'FAIL' | 'UNKNOWN';
  verifierId: string;
  expectedNode: string;
  confidence: number;
  timestamp: number;
  partialSignature?: PartialSignature; // Cryptographic share
}

export class SidecarVerifier {
  private readonly verifierId = 'ZTAN-SIDECAR-02';
  private telemetryBuffer: TelemetryData[] = [];
  private keyShare: KeyShare | null = null;

  public setKeyShare(share: KeyShare) {
    this.keyShare = share;
  }

  /**
   * Processes a new telemetry update and stores it in the local buffer.
   */
  public processTelemetry(data: TelemetryData) {
    this.telemetryBuffer.push(data);
    if (this.telemetryBuffer.length > 100) this.telemetryBuffer.shift();
  }

  /**
   * Independently validates an SRE decision.
   */
  public async verifyDecision(decision: SreDecision): Promise<TrustAttestation> {
    logger.info({ eventId: decision.eventId }, '[SIDECAR] Verifying with Threshold Cryptography (Node B)...');

    let suspectedNode = 'UNKNOWN';
    let maxCpu = 0;

    for (const data of this.telemetryBuffer) {
      if (data.metrics.cpu > maxCpu) {
        maxCpu = data.metrics.cpu;
        suspectedNode = data.nodeId;
      }
    }

    const isMatched = decision.targetNode === suspectedNode && maxCpu > 80;
    const status = isMatched ? 'PASS' : 'FAIL';

    const attestation: TrustAttestation = {
      eventId: decision.eventId,
      status,
      verifierId: this.verifierId,
      expectedNode: suspectedNode,
      confidence: maxCpu / 100,
      timestamp: Date.now()
    };

    // --- ELITE TIER: CRYPTOGRAPHIC SIGNING ---
    if (this.keyShare) {
      const payload = `${decision.eventId}|${status}|${suspectedNode}`;
      attestation.partialSignature = ThresholdCrypto.signPartial(payload, this.keyShare.share, this.keyShare.groupPublicKey, this.verifierId);
    }

    return attestation;
  }
}

export const sidecarVerifier = new SidecarVerifier();
