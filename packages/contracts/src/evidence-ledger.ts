/**
 * @packages/contracts/evidence-ledger
 * 
 * Formal Evidence and Causal Chain definitions for the Nexus ZTAN Replay Explorer.
 * This file establishes the deterministic invariants required for forensic replay.
 */

/**
 * Event Semantic Categories
 * Ensures that the Replay Engine can distinguish between telemetry, 
 * state changes, and autonomous heal actions.
 */
export enum EventCategory {
    MUTATION = 'mutation',      // Configuration change, deployment, pod restart
    OBSERVATION = 'observation', // Metric crossing threshold, health check failure
    DECISION = 'decision',     // Autonomous agent selecting a recovery strategy
    HEAL = 'heal',             // Execution of a recovery action
    GOVERNANCE = 'governance'  // Trust rotation, signature verification
}

/**
 * Causal Linkage
 * Enables the Replay Explorer to reconstruct the "Why" behind a state transition.
 */
export interface CausalLink {
    parentEventId: string;    // The immediate cause
    linkType: 'trigger' | 'dependency' | 'remediation';
    confidence: number;       // 0.0 to 1.0 (for AI-driven causality)
}

/**
 * Verification States
 * Defines the institutional trust level for a forensic chain or entry.
 */
export enum VerificationState {
    VERIFIED = 'verified',             // Full chain + valid signatures + current epoch
    DEGRADED = 'degraded',             // Chain valid, but some signatures from expired epochs
    UNTRUSTED = 'untrusted',           // Integrity hash mismatch or signature failure
    REVOKED = 'revoked',               // Signer was manually revoked for this period
    PARTIALLY_VERIFIED = 'partial'     // Root hash notarized, but local chain pending
}

/**
 * Trust Epoch
 * Defines a rotating institutional boundary for cryptographic authority.
 */
export interface TrustEpoch {
    id: string;                        // e.g., '2026-Q2-GOV-ROTATION-03'
    startTime: number;
    endTime?: number;                  // Null if active
    algorithm: 'ed25519' | 'ecdsa';
    status: 'active' | 'rotated' | 'compromised';
}

/**
 * Evidence Signature
 * The cryptographic proof of origin and authority.
 */
export interface EvidenceSignature {
    signerId: string;                  // ID of the operator or automated node
    algorithm: 'ed25519';
    signature: string;
    signedAt: number;
    trustEpochId: string;              // Pointer to the active TrustEpoch
    scope: 'entry' | 'checkpoint' | 'audit_root';
}

/**
 * Forensic Evidence Ledger Entry
 * The atomic unit of the Replay Engine. 
 * Designed for append-only, immutable storage.
 */
export interface EvidenceEntry {
    id: string;               // Unique UUID or Content-Addressable Hash
    timestamp: number;        // Deterministic Unix Epoch (Nanosecond precision)
    sequence: number;         // Monotonic incrementing counter within a shard/actor
    correlationId: string;    // Global trace/incident ID
    category: EventCategory;
    source: {
        service: string;
        node: string;
        version: string;
    };
    payload: Record<string, any>; // The raw state or delta
    causality?: CausalLink;   // Pointer to the cause
    
    /**
     * Integrity Metadata
     * Bound to the 'Stewardship' era for forensic trust.
     */
    integrity: {
        hash: string;         // SHA-256 of payload + timestamp + causality
        previousHash: string; // Hash of the previous sequence entry (Blockchain-style)
        signature?: EvidenceSignature; // Cryptographic attestation
        witnessId?: string;   // ID of the validator that certified this entry
        verificationState: VerificationState;
    };
}

/**
 * Replay Boundary Invariants
 * Defines the constraints for a deterministic replay session.
 */
export interface ReplayScope {
    startTime: number;
    endTime: number;
    targetNodes?: string[];
    targetServices?: string[];
    filterCategories?: EventCategory[];
}

/**
 * Evidence Chain
 * A collection of ordered, verified entries for a specific incident.
 */
export interface EvidenceChain {
    incidentId: string;
    rootCauseEntryId?: string;
    entries: EvidenceEntry[];
    verificationState: VerificationState;
    verificationEpoch: number;
    lastCheckpointId?: string;
    
    // Institutional Context
    governanceContext?: {
      id: string;
      quorum: string;
      notaryAnchor: string;
      authorityStatus: 'verified' | 'revoked' | 'degraded';
    };
    
    // Forensic Reliability
    metrics: ForensicResilienceMetrics;
}

/**
 * Ledger Checkpoint
 * A signed Merkle root of the entire ledger state for a specific epoch.
 * Used for external notarization and WORM compliance.
 */
export interface LedgerCheckpoint {
    id: string;
    timestamp: number;
    epochId: string;
    merkleRoot: string;               // Hash of all entries in this period
    count: number;
    signature: EvidenceSignature;     // Signed by the Notary Service
    externalReference?: string;       // e.g., KMS key version or external HSM proof
}

/**
 * Forensic Resilience Metrics
 * Measurable indices of institutional trust and operational survivability.
 */
export interface ForensicResilienceMetrics {
    chainIntegrityRate: number;       // % verified evidence continuity
    epochTrustValidity: number;       // Active authority health (0-1)
    replaySurvivability: number;      // Replay usability under degradation
    recoveryConfidence: number;       // Rollback trust score based on invariants
    evidenceCompleteness: number;     // Telemetry continuity score
    causalCertainty: number;          // Confidence in root-cause lineage
}
