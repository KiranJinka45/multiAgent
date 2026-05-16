import { ConsensusResult, TrustAttestation, CeremonyStatus } from './types';
export type ProofStatus = 'INITIALIZED' | 'MODEL_CHECKED' | 'PARTIALLY_PROVEN' | 'VERIFIED' | 'ABSENT';
export type RefinementConfidence = 'NONE' | 'GUARDED' | 'AUDITED' | 'PARTIAL_REFINEMENT' | 'FULL_REFINEMENT';
export interface DashboardEntry {
    claim: string;
    empirical: boolean;
    formal: ProofStatus;
    verificationMethod: 'RUNTIME_GUARD' | 'MODEL_CHECK' | 'FORMAL_PROOF';
    refinementConfidence: RefinementConfidence;
    audit: boolean;
    operational: boolean | string;
    assumptions?: string[];
    modelBounds?: 'BOUNDED' | 'UNBOUNDED';
    proofType?: 'MODEL_CHECK' | 'THEOREM';
    correspondence?: 'NONE' | 'PARTIAL' | 'FULL';
    scope?: 'PROTOCOL' | 'OPERATIONAL_SLO';
}
/**
 * ZTAN-TSAC Consensus Engine (Phase 25: Formal Verification Execution & Proof Status Granularity)
 * Implements granular proof status tracking and TLA+ Semantic Mapping Freeze.
 */
export declare class ConsensusEngine {
    private ledger;
    private receipts;
    private archive;
    private archiveRoot;
    private trustWeights;
    private slashedNodes;
    private stateMap;
    private isSurfaceFrozen;
    private isPermanentlyFrozen;
    private isTlaMappingFrozen;
    private isRefinementFrozen;
    private semanticAuditLog;
    private operationalMetrics;
    private readonly VERIFICATION_DASHBOARD;
    private PROTOCOL_VERSION;
    private RELEASE_VERSION;
    private readonly N_IDS;
    private readonly BASE_T;
    private readonly AUDIT_STABILITY_IDS;
    private readonly NON_PROVEN_AREAS;
    constructor(t?: number, n?: number, nodeIds?: string[]);
    freezeConstitutionalPermanency(): void;
    freezeTlaSemanticMapping(): void;
    freezeRefinementManifest(): void;
    /**
     * Returns the Refinement Coverage Manifest detailing the correspondence between
     * the implementation transitions and the formal model.
     */
    getRefinementManifest(): any;
    /**
     * Validates that an implementation transition preserves modeled TLA+ semantics.
     * This is the foundation for Implementation-to-Model Correspondence.
     */
    verifySemanticCorrespondence(transition: string, params: any): boolean;
    getPublicCertificationBundle(): any;
    generateOperationalGovernanceReport(): any;
    getReplayCorpus(): any[];
    private ensureCeremonyState;
    private issueReceipt;
    enforceSlashing(nodeId: string, proof: any): void;
    attestEmergency(eventId: string, nodeId: string): void;
    private addEvent;
    private calculateQuorumWeight;
    recordAttestation(attestation: TrustAttestation): Promise<ConsensusResult | null>;
}
export declare const consensusEngine: ConsensusEngine;
export interface CeremonySnapshot {
    snapshotId: string;
    eventId: string;
    status: CeremonyStatus;
    nodeIds: string[];
    threshold: number;
    lastEventHash: string;
    stateRoot: string;
    timestamp: number;
    protocolVersion: string;
}
export interface GovernanceReceipt {
    receiptId: string;
    type: 'SLASHING' | 'EMERGENCY_ACTIVATION' | 'PROTOCOL_MIGRATION' | 'QUORUM_ROTATION';
    eventId: string;
    details: any;
    timestamp: number;
    protocolVersion: string;
    signature: string;
}
//# sourceMappingURL=consensus-engine.d.ts.map