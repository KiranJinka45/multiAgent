import crypto from 'crypto';
import { MerkleTree } from './merkle.js';
import { InstitutionalConstitution, SovereigntyHierarchy } from './constitutional.js';

import {
    GovernanceReceipt,
    CouncilMember,
    CouncilState,
    verifyGovernanceReceiptMultiSig,
    governanceSignablePayload,
    InstitutionalRole,
    GovernanceProposal,
    AuditorMember,
    AuditorState,
    InstitutionalState,
    WitnessMember,
} from './governance.js';


export interface PersistenceProvider {
    save(state: any): Promise<void>;
    load(): Promise<any | null>;
}

// ─── Witness Member ─────────────────────────────────────────────────────────

export interface WitnessStateEntry {
    member: WitnessMember;
    status: 'ACTIVE' | 'REMOVED' | 'QUARANTINED';
    addedAt: string;
    removedAt?: string;
}

// ─── Witness Federation ─────────────────────────────────────────────────────

export class WitnessFederation {
    private memberState: Map<string, WitnessStateEntry> = new Map();
    private thresholdHistory: { threshold: number; effectiveTimestamp: string }[] = [];
    private councilHistory: CouncilState[] = [];
    private governanceLog: { receipt: GovernanceReceipt; appliedAt: string }[] = [];
    private governanceTree = new MerkleTree();
    private currentEpochId = 0;
    private defaultThresholdRatio = 2 / 3;
    private pendingRecovery: { receipt: GovernanceReceipt; expiresAt: string } | null = null;
    private constitution = new InstitutionalConstitution();
    private pendingProposals: Map<string, GovernanceProposal> = new Map();
    private auditorHistory: AuditorState[] = [];
    private currentState: InstitutionalState = InstitutionalState.QUIESCENT;
    private auditorSlashingLog: Set<string> = new Set();
    /** NEW: Map of pre-approved Guardian Institutions for remote recovery. */
    private guardianInstitutions: Map<string, { id: string; name: string; publicKey: string }> = new Map();
    private persistence: PersistenceProvider | null = null;

    constructor(members: WitnessMember[], threshold?: number, auditors: AuditorMember[] = [], persistence?: PersistenceProvider) {
        this.persistence = persistence || null;
        const bootstrapTime = '1970-01-01T00:00:00.000Z';

        for (const m of members) {
            this.memberState.set(m.id, {
                member: m,
                status: 'ACTIVE',
                addedAt: bootstrapTime,
            });
        }

        const initialThreshold = threshold || Math.ceil(members.length * this.defaultThresholdRatio);
        this.thresholdHistory.push({
            threshold: initialThreshold,
            effectiveTimestamp: bootstrapTime,
        });

        // Bootstrap Council: same as initial witnesses for Phase 10 start
        this.councilHistory.push({
            members: members.map(m => ({ id: m.id, publicKey: m.publicKey })),
            threshold: initialThreshold,
            effectiveTimestamp: bootstrapTime,
        });

        // Bootstrap Auditors
        this.auditorHistory.push({
            members: auditors.map(a => ({ ...a, status: 'ACTIVE' as const })),
            threshold: auditors.length > 0 ? Math.ceil(auditors.length / 2) : 1,
            effectiveTimestamp: bootstrapTime,
        });
    }

    // ─── Queries ────────────────────────────────────────────────────────────

    getMembers(): WitnessMember[] {
        return Array.from(this.memberState.values())
            .filter(e => e.status === 'ACTIVE')
            .map(e => e.member);
    }

    getMembersAt(timestamp: string): WitnessMember[] {
        const ts = new Date(timestamp).getTime();
        const result: WitnessMember[] = [];
        for (const entry of this.memberState.values()) {
            const addedAt = new Date(entry.addedAt).getTime();
            const removedAt = entry.removedAt ? new Date(entry.removedAt).getTime() : Infinity;
            if (addedAt <= ts && ts < removedAt) result.push(entry.member);
        }
        return result;
    }

    getGovernanceLog(): { receipt: GovernanceReceipt; appliedAt: string }[] {
        return [...this.governanceLog];
    }

    getThresholdAt(timestamp: string): number {
        const ts = new Date(timestamp).getTime();
        for (let i = this.thresholdHistory.length - 1; i >= 0; i--) {
            if (new Date(this.thresholdHistory[i].effectiveTimestamp).getTime() <= ts) {
                return this.thresholdHistory[i].threshold;
            }
        }
        return this.getMembersAt(timestamp).length >= 1 ? Math.ceil(this.getMembersAt(timestamp).length * 2 / 3) : 1;
    }

    getCouncilAt(timestamp: string): CouncilState {
        const ts = new Date(timestamp).getTime();
        for (let i = this.councilHistory.length - 1; i >= 0; i--) {
            if (new Date(this.councilHistory[i].effectiveTimestamp).getTime() <= ts) {
                return this.councilHistory[i];
            }
        }
        return this.councilHistory[0];
    }

    isQuorumMetAt(witnessIds: string[], timestamp: string): boolean {
        const activeIds = new Set(this.getMembersAt(timestamp).map(m => m.id));
        const validIds = Array.from(new Set(witnessIds)).filter(id => activeIds.has(id));
        return validIds.length >= this.getThresholdAt(timestamp);
    }

    wasMemberAt(witnessId: string, timestamp: string): boolean {
        const entry = this.memberState.get(witnessId);
        if (!entry) return false;
        const ts = new Date(timestamp).getTime();
        const addedAt = new Date(entry.addedAt).getTime();
        const removedAt = entry.removedAt ? new Date(entry.removedAt).getTime() : Infinity;
        return addedAt <= ts && ts < removedAt;
    }

    // ─── Governance ─────────────────────────────────────────────────────────

    private validateTransitionSafety(action: string) {
        const matrix = this.exportStateTransitionMatrix();
        const allowedActions = matrix.transitions[this.currentState];

        if (!allowedActions || !allowedActions.includes(action)) {
            const errorMsg = `[FORMAL_SAFETY_VIOLATION] Illegal State Jump: Action '${action}' is not permitted from state '${this.currentState}'.`;
            console.error(errorMsg);
            throw new Error(errorMsg);
        }
    }

    public async applyAction(receipt: GovernanceReceipt): Promise<string | null> {
        try {
            this.validateTransitionSafety(receipt.action);
        } catch (e: any) {
            return e.message;
        }

        const role = (receipt.action === 'COUNCIL_RESET' || receipt.action === 'AUDITOR_SLASH') ? InstitutionalRole.WITNESS_FEDERATION : InstitutionalRole.COUNCIL;
        if (!SovereigntyHierarchy.hasAuthority(role, receipt.action)) {
            return `SOVEREIGNTY_VIOLATION: Role ${role} cannot perform action ${receipt.action}`;
        }

        if (receipt.action === 'GOVERNANCE_PROPOSAL') {
            this.currentState = InstitutionalState.PROPOSING;
            return this.handleGovernanceProposal(receipt);
        }

        if (receipt.action === 'COUNCIL_RESET') {
            const justificationError = SovereigntyHierarchy.validateRecoveryJustification(receipt, this.constitution.policy);
            if (justificationError) return justificationError;

            const auditorState = this.getAuditorAt(receipt.effectiveTimestamp);
            const validAuditors: string[] = [];
            
            if (this.constitution.policy.requireAuditorRatification) {
                if (!receipt.auditorSignatures || receipt.auditorSignatures.length === 0) {
                    return "CONSTITUTIONAL_VIOLATION: Recovery requires AuditorQuorum signatures.";
                }

                const payload = governanceSignablePayload(receipt);
                const payloadBuffer = Buffer.from(payload, 'utf8');

                for (const sig of receipt.auditorSignatures) {
                    const auditor = auditorState.members.find(a => a.id === sig.signerKeyId);
                    if (!auditor) continue;
                    try {
                        const pubKey = crypto.createPublicKey(auditor.publicKey);
                        if (crypto.verify(null, payloadBuffer, pubKey, Buffer.from(sig.signature, 'base64'))) {
                            validAuditors.push(sig.signerKeyId);
                        }
                    } catch (e) {}
                }

                if (validAuditors.length < auditorState.threshold) {
                    return `CONSTITUTIONAL_VIOLATION: Insufficient auditor signatures. Got ${validAuditors.length}, need ${auditorState.threshold}`;
                }
            }
        }

        if (receipt.epochId !== this.currentEpochId) {
            return `Epoch mismatch: expected ${this.currentEpochId}, got ${receipt.epochId}`;
        }

        const currentRoot = this.governanceTree.getRoot();
        if (receipt.previousGRoot !== currentRoot) {
            return `Lineage breach: previousGRoot mismatch. Expected ${currentRoot.slice(0, 8)}, got ${receipt.previousGRoot.slice(0, 8)}`;
        }

        const isGenesis = receipt.sequenceNumber === 0 && this.governanceLog.length === 0;
        if (!isGenesis) {
            if (receipt.action === 'COUNCIL_RESET') {
                const witnesses = this.getMembersAt(receipt.effectiveTimestamp);
                const witnessThreshold = Math.ceil(witnesses.length * 2 / 3);
                const validSigners: string[] = [];

                if (!receipt.recoverySignatures) return 'COUNCIL_RESET requires recoverySignatures';

                const payload = governanceSignablePayload(receipt);
                const payloadBuffer = Buffer.from(payload, 'utf8');

                for (const sig of receipt.recoverySignatures) {
                    const witness = witnesses.find(w => w.id === sig.signerKeyId);
                    if (!witness) continue;
                    
                    try {
                        const pubKey = crypto.createPublicKey(witness.publicKey);
                        if (crypto.verify(null, payloadBuffer, pubKey, Buffer.from(sig.signature, 'base64'))) {
                            validSigners.push(sig.signerKeyId);
                        }
                    } catch (e) {}
                }

                if (validSigners.length < witnessThreshold) {
                    return `Recovery failed: insufficient witness signatures. Got ${validSigners.length}, need ${witnessThreshold}`;
                }
            } else {
                const effectiveCouncil = this.getCouncilAt(receipt.effectiveTimestamp);
                const verResult = verifyGovernanceReceiptMultiSig(receipt, effectiveCouncil);
                if (!verResult.valid) {
                    return `Governance multi-sig rejected: ${verResult.errors.join('; ')}`;
                }
            }
        }

        const lastInEpoch = [...this.governanceLog].reverse().find(e => e.receipt.epochId === this.currentEpochId);
        const expectedSeq = lastInEpoch ? lastInEpoch.receipt.sequenceNumber + 1 : 0;
        
        if (receipt.sequenceNumber !== expectedSeq) {
            return `Sequence mismatch in Epoch ${this.currentEpochId}: expected ${expectedSeq}, got ${receipt.sequenceNumber}`;
        }

        const payload = governanceSignablePayload(receipt);
        const leafHash = MerkleTree.hashLeaf(payload);
        this.governanceTree.append(leafHash);
        
        if (receipt.gRoot !== this.governanceTree.getRoot()) {
            return `Finality breach: gRoot mismatch after append. Expected ${this.governanceTree.getRoot().slice(0, 8)}, got ${receipt.gRoot.slice(0, 8)}`;
        }

        switch (receipt.action) {
            case 'WITNESS_ADD': this.handleWitnessAdd(receipt); break;
            case 'WITNESS_REMOVE': this.handleWitnessRemove(receipt); break;
            case 'THRESHOLD_UPDATE': this.handleThresholdUpdate(receipt); break;
            case 'COUNCIL_UPDATE': this.handleCouncilUpdate(receipt); break;
            case 'COUNCIL_RESET': this.handleCouncilReset(receipt); break;
            case 'RECOVERY_CHALLENGE': this.handleRecoveryChallenge(receipt); break;
            case 'AUDITOR_SLASH': this.handleAuditorSlash(receipt); break;
            case 'INSTITUTIONAL_HANDOVER': this.handleInstitutionalHandover(receipt); break;
            case 'CONSTITUTIONAL_MIGRATE': this.handleConstitutionalMigrate(receipt); break;
            case 'PROTOCOL_UPGRADE': this.handleProtocolUpgrade(receipt); break;
            case 'GOVERNANCE_SNAPSHOT': this.handleGovernanceSnapshot(receipt); break;
            case 'GUARDIAN_REGISTER': this.handleGuardianRegister(receipt); break;
            case 'STATE_CHECKPOINT': console.log(`[FEDERATION] Checkpoint at ${receipt.sequenceNumber}`); break;
        }

        this.governanceLog.push({ receipt, appliedAt: new Date().toISOString() });
        this.currentState = InstitutionalState.QUIESCENT;
        if (this.persistence) await this.persistence.save(this.getInstitutionalHealth());
        this.checkRecoveryFinalization();
        return null;
    }

    private handleWitnessAdd(receipt: GovernanceReceipt) {
        this.memberState.set(receipt.targetWitnessId!, {
            member: { id: receipt.targetWitnessId!, ...receipt.targetWitnessConfig! },
            status: 'ACTIVE',
            addedAt: receipt.effectiveTimestamp,
        });
    }

    private handleWitnessRemove(receipt: GovernanceReceipt) {
        const entry = this.memberState.get(receipt.targetWitnessId!);
        if (entry) {
            entry.status = 'REMOVED';
            entry.removedAt = receipt.effectiveTimestamp;
        }
    }

    private handleThresholdUpdate(receipt: GovernanceReceipt) {
        this.thresholdHistory.push({
            threshold: receipt.newThreshold!,
            effectiveTimestamp: receipt.effectiveTimestamp,
        });
    }

    private handleCouncilUpdate(receipt: GovernanceReceipt) {
        this.councilHistory.push({
            members: receipt.newCouncil!.members,
            threshold: receipt.newCouncil!.threshold,
            effectiveTimestamp: receipt.effectiveTimestamp,
        });
        this.currentEpochId++;
    }

    private handleCouncilReset(receipt: GovernanceReceipt) {
        this.currentState = InstitutionalState.RECOVERING;
        const expiresAt = this.constitution.getChallengeExpiry(receipt.effectiveTimestamp);
        this.pendingRecovery = { receipt, expiresAt };
        console.log(`[GOVERNANCE] EMERGENCY RECOVERY RECORDED. Pending until ${expiresAt}.`);
    }

    private handleRecoveryChallenge(receipt: GovernanceReceipt) {
        if (!this.pendingRecovery) return;
        this.pendingRecovery = null;
        this.currentState = InstitutionalState.QUIESCENT;
        console.log(`[GOVERNANCE] EMERGENCY RECOVERY CANCELLED BY CHALLENGE.`);
    }

    private handleAuditorSlash(receipt: GovernanceReceipt): void {
        const targetId = receipt.targetWitnessId;
        if (!targetId) return;

        const currentAuditors = this.getAuditorAt(receipt.effectiveTimestamp);
        const updatedMembers = currentAuditors.members.map(m => {
            if (m.id === targetId) return { ...m, status: 'QUARANTINED' as const };
            return m;
        });

        this.auditorHistory.push({
            members: updatedMembers,
            threshold: currentAuditors.threshold,
            effectiveTimestamp: receipt.effectiveTimestamp
        });
    }

    private handleInstitutionalHandover(receipt: GovernanceReceipt) {
        if (!receipt.newWitnessFederation) return;

        for (const entry of this.memberState.values()) if (entry.status === 'ACTIVE') entry.status = 'REMOVED';
        for (const m of receipt.newWitnessFederation.members) {
            this.memberState.set(m.id, { member: m, status: 'ACTIVE', addedAt: receipt.effectiveTimestamp });
        }

        this.thresholdHistory.push({
            threshold: receipt.newWitnessFederation.threshold,
            effectiveTimestamp: receipt.effectiveTimestamp
        });

        this.currentEpochId++;
    }

    private handleConstitutionalMigrate(receipt: GovernanceReceipt) {
        if (!receipt.newConstitution) return;
        
        let isCoreModified = false;
        for (const key in receipt.newConstitution) {
            if (this.constitution.isCoreClause(key) && receipt.newConstitution[key] !== (this.constitution.policy as any)[key]) {
                isCoreModified = true;
                break;
            }
        }

        if (isCoreModified) {
            const witnesses = this.getMembersAt(receipt.effectiveTimestamp);
            if (!receipt.signatures || receipt.signatures.length < witnesses.length) {
                 throw new Error("CONSTITUTIONAL_VIOLATION: Core Clause migration requires 100% witness ratification.");
            }
        }

        this.constitution = new InstitutionalConstitution(receipt.newConstitution);
    }

    private handleProtocolUpgrade(receipt: GovernanceReceipt) {
        this.currentEpochId++;
    }

    private handleGovernanceSnapshot(receipt: GovernanceReceipt) {
        if (!receipt.snapshotMetadata) return;
        const { end } = receipt.snapshotMetadata.prunedSeqRange;
        this.governanceLog = this.governanceLog.filter(r => r.receipt.sequenceNumber > end);
    }

    private handleGuardianRegister(receipt: GovernanceReceipt) {
        if (receipt.targetWitnessConfig) {
            this.guardianInstitutions.set(receipt.targetWitnessId!, {
                id: receipt.targetWitnessId!,
                name: receipt.reason,
                publicKey: receipt.targetWitnessConfig.publicKey
            });
        }
    }

    private handleGovernanceProposal(receipt: GovernanceReceipt): string | null {
        const lastInEpoch = [...this.governanceLog].reverse().find(e => e.receipt.epochId === this.currentEpochId);
        const expectedSeq = lastInEpoch ? lastInEpoch.receipt.sequenceNumber + 1 : 0;
        
        if (receipt.sequenceNumber !== expectedSeq) return `BFT_PROPOSAL_ERROR: Invalid sequence.`;

        const proposalId = crypto.createHash('sha256').update(JSON.stringify(receipt)).digest('hex');
        this.pendingProposals.set(proposalId, {
            proposalId,
            receipt,
            proposerId: receipt.signatures[0]?.signerKeyId || 'unknown',
            proposedAt: new Date().toISOString()
        });
        return null;
    }

    private checkRecoveryFinalization(): void {
        if (!this.pendingRecovery) return;

        const now = new Date();
        const expiresAt = new Date(this.pendingRecovery.expiresAt);
        const receipt = this.pendingRecovery.receipt;

        const auditorState = this.getAuditorAt(receipt.effectiveTimestamp);
        const validAuditors: string[] = [];
        const payload = governanceSignablePayload(receipt);
        const payloadBuffer = Buffer.from(payload, 'utf8');

        if (receipt.auditorSignatures) {
            for (const sig of receipt.auditorSignatures) {
                const auditor = auditorState.members.find(a => a.id === sig.signerKeyId && a.status === 'ACTIVE');
                if (!auditor) continue;
                try {
                    const pubKey = crypto.createPublicKey(auditor.publicKey);
                    if (crypto.verify(null, payloadBuffer, pubKey, Buffer.from(sig.signature, 'base64'))) {
                        validAuditors.push(sig.signerKeyId);
                    }
                } catch (e) {}
            }
        }

        const normalFinalization = now >= expiresAt && validAuditors.length >= auditorState.threshold;
        
        const recordedAt = new Date(receipt.effectiveTimestamp).getTime();
        const isDeadlocked = (now.getTime() - recordedAt) >= this.constitution.policy.degradedRecoveryTimeoutMs;
        
        let degradedFinalization = false;
        if (isDeadlocked && !normalFinalization) {
            const witnesses = this.getMembersAt(receipt.effectiveTimestamp);
            const validWitnesses: string[] = [];
            if (receipt.recoverySignatures) {
                for (const sig of receipt.recoverySignatures) {
                    const w = witnesses.find(witness => witness.id === sig.signerKeyId);
                    if (w) validWitnesses.push(sig.signerKeyId);
                }
            }
            if (validWitnesses.length >= this.constitution.policy.degradedWitnessThreshold) {
                degradedFinalization = true;
            }
        }

        if (normalFinalization || degradedFinalization) {
            this.councilHistory.push({
                members: receipt.newCouncil!.members,
                threshold: receipt.newCouncil!.threshold,
                effectiveTimestamp: receipt.effectiveTimestamp,
            });
            this.currentEpochId++;
            this.constitution.recordRecovery(receipt.effectiveTimestamp, this.currentEpochId);
            this.pendingRecovery = null;
            this.currentState = InstitutionalState.QUIESCENT;
        }
    }

    public getSovereignSnapshot() {
        return {
            epochId: this.currentEpochId,
            governanceRoot: this.governanceTree.getRoot(),
            constitutionalPolicy: this.constitution.policy,
            guardianGraph: Array.from(this.guardianInstitutions.values()),
            lastCheckpoint: this.governanceLog.filter(r => r.receipt.action === 'STATE_CHECKPOINT').pop(),
            fullLogSize: this.governanceLog.length
        };
    }

    public setInstitutionalStatus(status: 'ACTIVE' | 'HIBERNATING' | 'ARCHIVED') {
        if (status === 'HIBERNATING') this.currentState = InstitutionalState.HIBERNATING;
    }

    public getInstitutionalHealth() {
        return {
            state: this.currentState,
            epochId: this.currentEpochId,
            governanceRoot: this.governanceTree.getRoot(),
            witnesses: {
                total: this.getMembers().length,
                threshold: this.getThresholdAt(new Date().toISOString()),
                activeIds: this.getMembers().map(m => m.id)
            },
            council: this.getCouncilAt(new Date().toISOString()),
            auditors: this.getAuditorAt(new Date().toISOString()),
            guardians: Array.from(this.guardianInstitutions.values()),
            pendingRecovery: this.pendingRecovery,
            logSize: this.governanceLog.length
        };
    }

    public getAuditorAt(timestamp: string): AuditorState {
        const ts = new Date(timestamp).getTime();
        for (let i = this.auditorHistory.length - 1; i >= 0; i--) {
            if (new Date(this.auditorHistory[i].effectiveTimestamp).getTime() <= ts) {
                return this.auditorHistory[i];
            }
        }
        return this.auditorHistory[0];
    }

    public getThreshold(): number {
        return this.getThresholdAt(new Date().toISOString());
    }

    public validateLineageIntegrity(): { valid: boolean; errors: string[] } {
        const errors: string[] = [];
        let prevRoot = "";
        let expectedSeq = 0;
        let expectedEpoch = 0;

        for (let i = 0; i < this.governanceLog.length; i++) {
            const receipt = this.governanceLog[i].receipt;
            if (receipt.sequenceNumber !== expectedSeq) {
                errors.push(`Integrity Failure at Index ${i}: Expected Seq ${expectedSeq}, got ${receipt.sequenceNumber}`);
            }
            if (receipt.epochId < expectedEpoch) {
                errors.push(`Integrity Failure at Index ${i}: Epoch regression. Current ${receipt.epochId}, expected >= ${expectedEpoch}`);
            }
            if (i > 0 && receipt.previousGRoot !== prevRoot) {
                errors.push(`Integrity Failure at Index ${i}: previousGRoot breach. Link broken.`);
            }
            prevRoot = receipt.gRoot;
            expectedSeq = receipt.sequenceNumber + 1;
            expectedEpoch = receipt.epochId;

            if (receipt.action === 'COUNCIL_UPDATE' || receipt.action === 'INSTITUTIONAL_HANDOVER') {
                expectedEpoch++;
                expectedSeq = 0;
            }
        }
        return { valid: errors.length === 0, errors };
    }

    public exportStateTransitionMatrix() {
        return {
            states: [
                'QUIESCENT', 'PROPOSING', 'RECOVERING', 
                'LOCKED', 'HIBERNATING', 'EMERGENCY_RECOVERY'
            ],
            actions: [
                'GOVERNANCE_PROPOSAL', 'COUNCIL_UPDATE', 'COUNCIL_RESET', 
                'RECOVERY_CHALLENGE', 'AUDITOR_SLASH', 'STATE_CHECKPOINT',
                'INSTITUTIONAL_HANDOVER', 'CONSTITUTIONAL_MIGRATE', 
                'PROTOCOL_UPGRADE', 'GOVERNANCE_SNAPSHOT', 'GUARDIAN_REGISTER'
            ],
            transitions: {
                [InstitutionalState.QUIESCENT]: [
                    'GOVERNANCE_PROPOSAL', 'COUNCIL_RESET', 'AUDITOR_SLASH', 
                    'STATE_CHECKPOINT', 'CONSTITUTIONAL_MIGRATE', 
                    'PROTOCOL_UPGRADE', 'GOVERNANCE_SNAPSHOT', 'GUARDIAN_REGISTER',
                    'INSTITUTIONAL_HANDOVER'
                ],
                [InstitutionalState.PROPOSING]: [
                    'COUNCIL_UPDATE', 'AUDITOR_SLASH', 'STATE_CHECKPOINT'
                ],
                [InstitutionalState.RECOVERING]: [
                    'RECOVERY_CHALLENGE', 'COUNCIL_RESET', 'AUDITOR_SLASH'
                ],
                [InstitutionalState.LOCKED]: [
                    'COUNCIL_RESET', 'AUDITOR_SLASH'
                ],
                [InstitutionalState.HIBERNATING]: [
                    'COUNCIL_RESET', 'PROTOCOL_UPGRADE'
                ],
                [InstitutionalState.EMERGENCY_RECOVERY]: [
                    'COUNCIL_RESET', 'PROTOCOL_UPGRADE'
                ]
            },
            invariants: {
                sovereignty: "ACYCLIC_GUARDIAN_GRAPH",
                immutability: "CORE_CLAUSE_100_PERCENT_RATIFICATION"
            }
        };
    }
}

// ─── Default Static Federation (Bootstrap) ──────────────────────────────────

export const LOCAL_FEDERATION = new WitnessFederation([
    {
        id: '8a13f44fea2e2ae89acd0394c890961282dd0544e801058f93ae447376721368',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEA47klpFQCpq4kj4qvLCBQJpsjZAMtH6K5Jd9pdrywSs4=\n-----END PUBLIC KEY-----',
        url: 'http://localhost:8081'
    },
    {
        id: '5b85c135c30900cefff7edad9583ee68e362e34bc4d142d27ae7c4c733da48f0',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAG8jEhMcvFO5rQMJFs3osxPlQSxa5glVeISZRM/omex8=\n-----END PUBLIC KEY-----',
        url: 'http://localhost:8082'
    },
    {
        id: 'a88ce7ffe6733cf50cfb9292fe0c370f80bb9ccd104a2c15ad7398ec159da6ab',
        publicKey: '-----BEGIN PUBLIC KEY-----\nMCowBQYDK2VwAyEAU8bANjW6wL5dHtgCbHyIe+2lt5YSPPfbyEysJdfTpOo=\n-----END PUBLIC KEY-----',
        url: 'http://localhost:8083'
    }
], 2);
