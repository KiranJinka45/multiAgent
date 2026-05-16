import crypto from 'crypto';

// ─── Governance Action Types ────────────────────────────────────────────────

export type GovernanceAction =
    | 'WITNESS_ADD'
    | 'WITNESS_REMOVE'
    | 'THRESHOLD_UPDATE'
    | 'WITNESS_QUARANTINE'
    | 'COUNCIL_UPDATE' // Rotate the governance council itself
    | 'COUNCIL_RESET' // Emergency witness-led council reset
    | 'RECOVERY_CHALLENGE' // Original council challenging a pending recovery
    | 'GOVERNANCE_PROPOSAL' // Council proposing an action for federation ratification
    | 'COUNCIL_HEARTBEAT' // Periodic proof of council liveness
    | 'AUDITOR_SLASH' // Witness-led removal of a malicious auditor
    | 'AUDITOR_REMOVE' // Formal removal of an auditor
    | 'INSTITUTIONAL_ANCHOR' // Anchoring remote institution state
    | 'GUARDIAN_REGISTER' // Registering a remote guardian institution
    | 'STATE_CHECKPOINT' // Anchoring a full state snapshot into the log
    | 'INSTITUTIONAL_HANDOVER' // Full replacement of the Witness Federation
    | 'CONSTITUTIONAL_MIGRATE' // Updating the institutional rules
    | 'PROTOCOL_UPGRADE' // Updating the protocol logic
    | 'GOVERNANCE_SNAPSHOT'; // Pruning the log history with a continuity proof

// ─── Witness Member ─────────────────────────────────────────────────────────

export interface WitnessMember {
    id: string;
    publicKey: string; // PEM format
    url: string;
}

// ─── Governance Council Schema ──────────────────────────────────────────────

export interface CouncilMember {
    id: string;
    publicKey: string; // PEM format
}

export interface CouncilState {
    members: CouncilMember[];
    threshold: number;
    effectiveTimestamp: string;
}

// ─── Institutional Roles ────────────────────────────────────────────────────

export enum InstitutionalRole {
    COUNCIL = 'COUNCIL',
    WITNESS_FEDERATION = 'WITNESS_FEDERATION',
    AUDITOR = 'AUDITOR'
}

export enum InstitutionalState {
    QUIESCENT = 'QUIESCENT', // Normal operations
    PROPOSING = 'PROPOSING', // Active governance proposal pending
    RECOVERING = 'RECOVERING', // Recovery pending finalization
    LOCKED = 'LOCKED', // Catastrophic failure/Transition window
    HIBERNATING = 'HIBERNATING', // Cold storage/Archival state
    EMERGENCY_RECOVERY = 'EMERGENCY_RECOVERY' // Meta-state for bootstrap/reset
}

export interface AuditorMember {
    id: string;
    publicKey: string; // PEM format
    status: 'ACTIVE' | 'QUARANTINED' | 'REMOVED';
}

export interface AuditorState {
    members: AuditorMember[];
    threshold: number;
    effectiveTimestamp: string;
}


// ─── Governance Receipt Schema ──────────────────────────────────────────────

export interface GovernanceSignature {
    signerKeyId: string;
    signature: string; // base64
}

export interface GovernanceReceipt {
    /** The governance action being performed. */
    action: GovernanceAction;
    /** Target witness ID (SHA-256 of public key PEM). For ADD/REMOVE/QUARANTINE. */
    targetWitnessId?: string;
    /** Configuration for a new witness being added. */
    targetWitnessConfig?: {
        publicKey: string;  // PEM format
        url: string;
    };
    /** New witness quorum threshold. For THRESHOLD_UPDATE only. */
    newThreshold?: number;
    /** New council configuration. For COUNCIL_UPDATE only. */
    newCouncil?: {
        members: CouncilMember[];
        threshold: number;
    };
    /** ISO 8601 timestamp when this governance action takes effect. */
    effectiveTimestamp: string;
    /** Human-readable justification for this governance action. */
    reason: string;
    /** Monotonically increasing sequence number within the epoch. */
    sequenceNumber: number;
    /** 
     * NEW: Monotonically increasing epoch ID.
     * Incremented on every COUNCIL_UPDATE.
     */
    epochId: number;
    /** NEW: Hash of the governance tree BEFORE this receipt. */
    previousGRoot: string;
    /** NEW: Hash of the governance tree AFTER this receipt (The Anchor). */
    gRoot: string;
    /** NEW: Hash of the receipt being challenged (Optional). */
    targetReceiptHash?: string;
    /** 
     * Multiple Ed25519 signatures from the CURRENT COUNCIL. 
     */
    signatures: GovernanceSignature[];
    /**
     * NEW: Recovery signatures from the WITNESS FEDERATION.
     * Required ONLY for COUNCIL_RESET actions.
     */
    recoverySignatures?: GovernanceSignature[];
    /** NEW: Byzantine sequence checkpoint (Optional). */
    checkpoint?: SequenceCheckpoint;
    /** NEW: Evidence of council failure. Required for COUNCIL_RESET. */
    inactivityProof?: {
        lastEvidenceHashes: string[];
        witnessAttestations: GovernanceSignature[];
    };
    /** NEW: Auditor signature ratifying a constitutional transition. */
    auditorRatification?: GovernanceSignature;
    /** NEW: Federated auditor signatures for quorum-based ratification. */
    auditorSignatures?: GovernanceSignature[];
    /** NEW: Hash of the constitution enforced during this action. */
    constitutionHash?: string;
    /** NEW: Hash of the institutional archive (Optional). */
    archiveHash?: string;
    /** NEW: Cross-institutional anchor data. */
    remoteAnchor?: {
        institutionId: string;
        gRoot: string;
        epochId: number;
    };
    /** NEW: ID of the guardian institution ratifying a reset. */
    guardianId?: string;
    /** NEW: Full state snapshot for black-box recovery. */
    stateSnapshot?: string;
    /** NEW: Hash of the previous log segment (for rotation). */
    previousLogHash?: string;
    /** NEW: Target config for institutional handover. */
    newWitnessFederation?: { members: WitnessMember[]; threshold: number };
    /** NEW: Target config for constitutional migration. */
    newConstitution?: any;
    /** NEW: Target version for protocol upgrade. */
    newProtocolVersion?: string;
    /** NEW: Snapshot metadata for log pruning. */
    snapshotMetadata?: { prunedSeqRange: { start: number; end: number }; recursiveGenesisHash: string };
}

/**
 * ─── Governance Proposal ────────────────────────────────────────────────────
 * A pending governance action awaiting witness federation ratification.
 * ────────────────────────────────────────────────────────────────────────────
 */
export interface GovernanceProposal {
    proposalId: string;
    receipt: GovernanceReceipt;
    proposerId: string;
    proposedAt: string;
}

/**
 * ─── Byzantine Sequence Checkpoint ──────────────────────────────────────────
 * Provides a quorum-signed commitment to the order of governance actions.
 * ────────────────────────────────────────────────────────────────────────────
 */
export interface SequenceCheckpoint {
    sequenceNumber: number;
    receiptHash: string;
    witnessSignatures: GovernanceSignature[];
}

// ─── Canonical Serialization ────────────────────────────────────────────────

/**
 * Extracts the signable payload from a governance receipt.
 * The signatures field is excluded because it IS the set of signatures.
 * Fields are sorted deterministically for cross-platform reproducibility.
 */
export function governanceSignablePayload(receipt: GovernanceReceipt): string {
    const payload: Record<string, any> = {
        action: receipt.action,
        sequenceNumber: receipt.sequenceNumber,
        epochId: receipt.epochId,
        previousGRoot: receipt.previousGRoot,
        effectiveTimestamp: receipt.effectiveTimestamp,
        reason: receipt.reason,
    };

    if (receipt.targetWitnessId !== undefined) {
        payload.targetWitnessId = receipt.targetWitnessId;
    }
    if (receipt.targetWitnessConfig !== undefined) {
        payload.targetWitnessConfig = receipt.targetWitnessConfig;
    }
    if (receipt.newThreshold !== undefined) {
        payload.newThreshold = receipt.newThreshold;
    }
    if (receipt.newCouncil !== undefined) {
        payload.newCouncil = receipt.newCouncil;
    }
    if (receipt.constitutionHash !== undefined) {
        payload.constitutionHash = receipt.constitutionHash;
    }
    if (receipt.remoteAnchor !== undefined) {
        payload.remoteAnchor = receipt.remoteAnchor;
    }
    if (receipt.guardianId !== undefined) {
        payload.guardianId = receipt.guardianId;
    }
    if (receipt.stateSnapshot !== undefined) {
        payload.stateSnapshot = receipt.stateSnapshot;
    }
    if (receipt.previousLogHash !== undefined) {
        payload.previousLogHash = receipt.previousLogHash;
    }
    if (receipt.newWitnessFederation !== undefined) {
        payload.newWitnessFederation = receipt.newWitnessFederation;
    }
    if (receipt.newConstitution !== undefined) {
        payload.newConstitution = receipt.newConstitution;
    }
    if (receipt.newProtocolVersion !== undefined) {
        payload.newProtocolVersion = receipt.newProtocolVersion;
    }
    if (receipt.snapshotMetadata !== undefined) {
        payload.snapshotMetadata = receipt.snapshotMetadata;
    }

    return JSON.stringify(payload, Object.keys(payload).sort());
}

// ─── Governance Receipt Verification ────────────────────────────────────────

export interface GovernanceVerificationResult {
    valid: boolean;
    validSignerIds: string[];
    errors: string[];
}

/**
 * Verifies a governance receipt's cryptographic integrity against a council.
 */
export function verifyGovernanceReceiptMultiSig(
    receipt: GovernanceReceipt,
    council: CouncilState
): GovernanceVerificationResult {
    const results: GovernanceVerificationResult = {
        valid: false,
        validSignerIds: [],
        errors: []
    };

    // 1. Verify required fields for action type
    const fieldError = validateGovernanceFields(receipt);
    if (fieldError) {
        results.errors.push(fieldError);
        return results;
    }

    const payload = governanceSignablePayload(receipt);
    const payloadBuffer = Buffer.from(payload, 'utf8');

    // 2. Verify signatures against council members
    const councilKeys = new Map<string, crypto.KeyObject>();
    for (const m of council.members) {
        try {
            councilKeys.set(m.id, crypto.createPublicKey(m.publicKey));
        } catch (e: any) {
            results.errors.push(`Invalid council member public key for ${m.id}: ${e.message}`);
        }
    }

    for (const sig of receipt.signatures) {
        const pubKey = councilKeys.get(sig.signerKeyId);
        if (!pubKey) {
            results.errors.push(`Signature from non-council member: ${sig.signerKeyId.slice(0, 8)}...`);
            continue;
        }

        try {
            const isValid = crypto.verify(
                null,
                payloadBuffer,
                pubKey,
                Buffer.from(sig.signature, 'base64')
            );

            if (isValid) {
                results.validSignerIds.push(sig.signerKeyId);
            } else {
                results.errors.push(`Invalid signature from council member ${sig.signerKeyId.slice(0, 8)}...`);
            }
        } catch (e: any) {
            results.errors.push(`Signature verification error for ${sig.signerKeyId.slice(0, 8)}...: ${e.message}`);
        }
    }

    // 3. Check if threshold met
    if (results.validSignerIds.length >= council.threshold) {
        results.valid = true;
    } else {
        results.errors.push(`Insufficient signatures: ${results.validSignerIds.length}/${council.threshold} valid signatures found.`);
    }

    return results;
}

// ─── Field Validation ───────────────────────────────────────────────────────

export function validateGovernanceFields(receipt: GovernanceReceipt): string | null {
    if (typeof receipt.sequenceNumber !== 'number' || receipt.sequenceNumber < 0) {
        return 'Invalid sequence number: must be a non-negative integer.';
    }
    if (typeof receipt.epochId !== 'number' || receipt.epochId < 0) {
        return 'Invalid epochId: must be a non-negative integer.';
    }
    if (typeof receipt.previousGRoot !== 'string') {
        return 'Missing previousGRoot.';
    }
    if (typeof receipt.gRoot !== 'string') {
        return 'Missing gRoot.';
    }
    if (!receipt.effectiveTimestamp) {
        return 'Missing effectiveTimestamp.';
    }
    if (!receipt.signatures || receipt.signatures.length === 0) {
        return 'Missing signatures.';
    }

    switch (receipt.action) {
        case 'WITNESS_ADD':
            if (!receipt.targetWitnessId) return 'WITNESS_ADD requires targetWitnessId.';
            if (!receipt.targetWitnessConfig) return 'WITNESS_ADD requires targetWitnessConfig.';
            break;
        case 'WITNESS_REMOVE':
        case 'WITNESS_QUARANTINE':
            if (!receipt.targetWitnessId) return `${receipt.action} requires targetWitnessId.`;
            break;
        case 'THRESHOLD_UPDATE':
            if (typeof receipt.newThreshold !== 'number' || receipt.newThreshold < 1) {
                return 'THRESHOLD_UPDATE requires a positive newThreshold.';
            }
            break;
        case 'COUNCIL_UPDATE':
            if (!receipt.newCouncil) return 'COUNCIL_UPDATE requires newCouncil.';
            if (!receipt.newCouncil.members || receipt.newCouncil.members.length === 0) return 'COUNCIL_UPDATE requires members.';
            if (typeof receipt.newCouncil.threshold !== 'number' || receipt.newCouncil.threshold < 1) return 'COUNCIL_UPDATE requires threshold.';
            break;
        case 'COUNCIL_RESET':
            if (!receipt.newCouncil) return 'COUNCIL_RESET requires newCouncil.';
            if (!receipt.recoverySignatures || receipt.recoverySignatures.length === 0) return 'COUNCIL_RESET requires recoverySignatures from witnesses.';
            if (!receipt.inactivityProof) return 'COUNCIL_RESET requires inactivityProof to justify emergency bypass.';
            break;
        case 'RECOVERY_CHALLENGE':
            if (!receipt.targetReceiptHash) return 'RECOVERY_CHALLENGE requires targetReceiptHash of the reset to challenge.';
            break;
        case 'GOVERNANCE_PROPOSAL':
        case 'COUNCIL_HEARTBEAT':
            // Proposals and heartbeats are verified via signatures
            break;
        default:
            return `Unknown governance action: ${receipt.action}`;
    }

    return null;
}

// ─── Governance Services (Stubs) ───────────────────────────────────────────

export const CostGovernanceService = {
    decrementActiveJobs: async (tenantId: string) => {
        // console.log(`[CostGovernance] Decrementing active jobs for ${tenantId}`);
    },
    getTenantLimits: async (tenantId: string) => {
        return { plan: 'free' };
    }
};

export const regionalGovernance = {
    getRegionConfig: async (region: string) => ({})
};

export const quotaEngine = {
    getTenantLimits: async (tenantId: string) => {
        return { plan: 'free' };
    }
};
