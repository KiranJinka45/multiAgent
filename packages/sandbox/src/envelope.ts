/**
 * 🛡️ CanonicalReplayEnvelope
 * The immutable execution descriptor used for ZTAN Witness verification.
 * This structure must be bit-identical across all replay attempts.
 */
export interface CanonicalReplayEnvelope {
  /** Institutional context */
  missionId: string;
  projectId: string;
  tenantId: string;

  /** Execution Lineage (Calculated by CanonicalReplayLayer) */
  mountHash: string;
  executionHash: string;
  
  /** Outcome Truth (Normalized) */
  exitCode: number;
  securityEvent: string | null;

  /** Temporal anchoring (Normalized to ISO 8601) */
  timestamp: string;

  /** Orchestration Metadata */
  runtime: string; // The type of runtime used (e.g., "gvisor", "firecracker")
}

/**
 * 🛡️ ReplayValidationProof
 * The witness-signed proof of execution finality.
 */
export interface ReplayValidationProof {
  envelope: CanonicalReplayEnvelope;
  signature: string;
  witnessId: string;
  merkleRoot: string;
}
