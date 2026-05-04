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
  partialSignature?: PartialSignature;
}

export class ExternalVerifier {
  private readonly verifierId = 'ZTAN-EXTERNAL-03';
  private keyShare: KeyShare | null = null;

  public setKeyShare(share: KeyShare) {
    this.keyShare = share;
  }

  public async verifyDecision(decision: SreDecision, telemetrySnapshot: TelemetryData[]): Promise<TrustAttestation> {
    logger.info({ eventId: decision.eventId }, '[EXTERNAL-VERIFIER] Verifying with Threshold Cryptography (Node C)...');

    let suspectedNode = 'UNKNOWN';
    let maxHeuristicScore = 0;

    for (const data of telemetrySnapshot) {
      const score = this.calculateHeuristicScore(data);
      if (score > maxHeuristicScore) {
        maxHeuristicScore = score;
        suspectedNode = data.nodeId;
      }
    }

    const isMatched = decision.targetNode === suspectedNode;
    const status = isMatched ? 'PASS' : 'FAIL';

    const attestation: TrustAttestation = {
      eventId: decision.eventId,
      status,
      verifierId: this.verifierId,
      expectedNode: suspectedNode,
      confidence: maxHeuristicScore,
      timestamp: Date.now()
    };

    // --- ELITE TIER: CRYPTOGRAPHIC SIGNING ---
    if (this.keyShare) {
      const payload = `${decision.eventId}|${status}|${suspectedNode}`;
      attestation.partialSignature = ThresholdCrypto.signPartial(payload, this.keyShare.share, this.keyShare.groupPublicKey, this.verifierId);
    }

    return attestation;
  }

  private calculateHeuristicScore(data: TelemetryData): number {
    const errorScore = data.metrics.errors > 5 ? 0.8 : 0;
    const latencyScore = data.metrics.latency > 1000 ? 0.2 : 0;
    return Math.min(1.0, errorScore + latencyScore);
  }
}

export const externalVerifier = new ExternalVerifier();
