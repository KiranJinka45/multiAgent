import { ThresholdCrypto, KeyShare, PartialSignature, DEFAULT_THRESHOLD, DEFAULT_NODE_IDS } from './crypto-utils';
import { TelemetryData, SreDecision, TrustAttestation } from './types';

const logger = console;

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
      attestation.partialSignature = await ThresholdCrypto.signPartial(
        payload, 
        this.keyShare.share, 
        this.verifierId, 
        DEFAULT_THRESHOLD, 
        DEFAULT_NODE_IDS
      );
    }

    return attestation;
  }
}

export const sidecarVerifier = new SidecarVerifier();
