import type { PartialSignature } from './crypto-utils.js';

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

export type GovernanceMode = 'AUTONOMOUS' | 'SAFE_MODE' | 'OPERATOR_REQUIRED' | 'EMERGENCY_RECOVERY';

export type CeremonyStatus = 
  | 'PENDING' 
  | 'ACTIVE' 
  | 'COMPLETED' 
  | 'FAILED' 
  | 'EXPIRED'
  | 'ABORTED';

export interface CeremonyEvent {
  eventId: string;
  type: 'CREATED' | 'PARTICIPANT_JOINED' | 'ATTESTATION_ADDED' | 'FINALIZED' | 'ABORTED' | 'EXPIRED' | 'EPOCH_CHANGE';
  payload: any;
  timestamp: number;
  sequence: number;
  hash: string;      // Current event hash
  prevHash: string;  // Link to previous event
}

export interface ConsensusResult {
  eventId: string;
  isTrusted: boolean;
  status: CeremonyStatus; // Added status
  governanceMode: GovernanceMode;
  attestations: TrustAttestation[];
  timestamp: number;
  aggregatedSignature?: string;
  events?: CeremonyEvent[]; // Added event trace
}

export type TrustLevel = 'FULL' | 'DEGRADED' | 'CONDITIONAL' | 'UNTRUSTED';

export interface VerificationNarrative {
  sequenceId: number;
  trustLevel: TrustLevel;
  confidence: number; // 0.0 - 1.0
  summary: string;
  findings: string[];
  forensicEvidence: {
    hashChainValid: boolean;
    quorumMet: boolean;
    zkProofValid: boolean;
    externalAnchorValid: boolean;
  };
  recommedation: string;
}
