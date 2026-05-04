import { ThresholdCrypto, PartialSignature } from './crypto-utils';

const logger = console;

export type GovernanceMode = 'AUTONOMOUS' | 'SAFE_MODE' | 'OPERATOR_REQUIRED';

export interface ConsensusResult {
  eventId: string;
  isTrusted: boolean;
  governanceMode: GovernanceMode;
  attestations: TrustAttestation[];
  timestamp: number;
  aggregatedSignature?: string; // Cryptographic group signature
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

export class ConsensusEngine {
  private attestationBuffer: Map<string, TrustAttestation[]> = new Map();
  private readonly N = 3; 
  private readonly T = 2; // Threshold

  private readonly N_IDS = ['node-a', 'node-b', 'node-c']; // Canonical node IDs

  public async recordAttestation(attestation: TrustAttestation): Promise<ConsensusResult | null> {
    const { eventId } = attestation;
    
    if (!this.attestationBuffer.has(eventId)) {
      this.attestationBuffer.set(eventId, []);
    }
    
    const buffer = this.attestationBuffer.get(eventId)!;
    if (buffer.some(a => a.verifierId === attestation.verifierId)) return null;

    buffer.push(attestation);

    if (buffer.length >= this.N) {
      return this.evaluateConsensus(eventId, buffer);
    }

    return null;
  }

  private evaluateConsensus(eventId: string, attestations: TrustAttestation[]): ConsensusResult {
    const passAttestations = attestations.filter(a => a.status === 'PASS');
    const passCount = passAttestations.length;
    
    // Byzantine Threshold Rule
    const isTrusted = passCount >= this.T;
    
    const governanceMode: GovernanceMode = isTrusted ? 'AUTONOMOUS' : 'SAFE_MODE';

    // --- ELITE TIER: SIGNATURE AGGREGATION ---
    let aggregatedSignature: string | undefined;
    if (isTrusted) {
      const partials = passAttestations
        .map(a => a.partialSignature)
        .filter((p): p is PartialSignature => !!p);
      
      aggregatedSignature = (await ThresholdCrypto.aggregate(partials, this.T, this.N_IDS)) || undefined;
    }

    if (!isTrusted) {
      logger.error({ eventId, passCount, threshold: this.T }, '[CONSENSUS] TSAC FAILURE: Threshold not met.');
    } else {
      logger.info({ eventId, passCount, aggregatedSignature }, '[CONSENSUS] TSAC PASS: Threshold signature generated.');
    }

    this.attestationBuffer.delete(eventId);

    return {
      eventId,
      isTrusted,
      governanceMode,
      attestations,
      timestamp: Date.now(),
      aggregatedSignature
    };
  }
}

export const consensusEngine = new ConsensusEngine();
