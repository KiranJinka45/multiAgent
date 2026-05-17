/**
 * @packages/ztan-witness
 * 
 * The Evidence Ledger and Replay Engine implementation.
 * This service ensures that every operational event is signed, chained, 
 * and causally indexed for forensic reconstruction.
 */

import { 
    EvidenceEntry, 
    EventCategory, 
    EvidenceChain, 
    CausalLink,
    VerificationState,
    EvidenceSignature,
    TrustEpoch,
    LedgerCheckpoint
} from '@packages/contracts';
import { RollbackInvariants, RollbackImpactAssessment } from '@packages/contracts/src/rollback-invariants';
import { logger } from '@packages/observability';
import { redis } from '@packages/utils';
import crypto from 'crypto';
import { v4 as uuidv4 } from 'uuid';

export class EvidenceLedgerService {
    private static readonly LEDGER_PREFIX = 'ztan:evidence:';
    private static readonly CHAIN_PREFIX = 'ztan:chain:';
    private static readonly EPOCH_KEY = 'ztan:gov:active_epoch';
    private static readonly CHECKPOINT_PREFIX = 'ztan:checkpoint:';

    /**
     * Ingests a new operational event with cryptographic attestation.
     */
    static async append(params: {
        category: EventCategory;
        source: { service: string; node: string; version: string };
        payload: Record<string, any>;
        correlationId: string;
        parentEventId?: string;
        signerId: string;
    }): Promise<EvidenceEntry> {
        const { category, source, payload, correlationId, parentEventId, signerId } = params;
        
        const id = uuidv4();
        const timestamp = Date.now();
        
        // 1. Fetch Active Trust Epoch
        const activeEpoch = await this.getActiveEpoch();
        
        // 2. Sequence & Chaining
        const sequence = await redis.incr(`${this.CHAIN_PREFIX}${correlationId}:seq`);
        const previousHash = (await redis.get(`${this.CHAIN_PREFIX}${correlationId}:last_hash`)) || '0x0';
        
        let causality: CausalLink | undefined;
        if (parentEventId) {
            causality = { parentEventId, linkType: 'trigger', confidence: 1.0 };
        }

        // 3. Calculate Integrity Hash
        const hash = this.calculateHash({ payload, timestamp, sequence, previousHash, causality });

        // 4. Generate Evidence Signature (Ed25519)
        // In production, this would call a secure KMS or local TPM
        const signature: EvidenceSignature = {
            signerId,
            algorithm: 'ed25519',
            signature: this.signHash(hash, signerId), // Mocked for now
            signedAt: timestamp,
            trustEpochId: activeEpoch.id,
            scope: 'entry'
        };

        const entry: EvidenceEntry = {
            id,
            timestamp,
            sequence,
            correlationId,
            category,
            source,
            payload,
            causality,
            integrity: {
                hash,
                previousHash,
                signature,
                verificationState: VerificationState.VERIFIED
            }
        };

        // 5. Commit to Ledger
        const pipeline = redis.pipeline();
        pipeline.set(`${this.LEDGER_PREFIX}${id}`, JSON.stringify(entry));
        pipeline.rpush(`${this.CHAIN_PREFIX}${correlationId}:ledger`, id);
        pipeline.set(`${this.CHAIN_PREFIX}${correlationId}:last_hash`, hash);
        await pipeline.exec();

        // 6. Check for Checkpoint Boundary (Every 100 entries per correlation)
        if (sequence % 100 === 0) {
            await this.checkpoint(correlationId);
        }

        return entry;
    }

    /**
     * Reconstructs and verifies an Evidence Chain for forensic replay.
     */
    static async getChain(incidentId: string): Promise<EvidenceChain> {
        const entryIds = await redis.lrange(`${this.CHAIN_PREFIX}${incidentId}:ledger`, 0, -1);
        const entries: EvidenceEntry[] = [];
        
        for (const id of entryIds) {
            const data = await redis.get(`${this.LEDGER_PREFIX}${id}`);
            if (data) entries.push(JSON.parse(data));
        }

        // Perform Multi-Pillar Verification
        const verificationState = await this.verifyChainIntegrity(entries);
        const metrics = this.calculateResilienceMetrics(entries, verificationState);
        
        // Fetch Institutional Context
        const epochData = await redis.get('ztan:gov:active_epoch');
        const governanceContext = epochData ? JSON.parse(epochData) : null;

        return {
            incidentId,
            entries,
            verificationState,
            verificationEpoch: Date.now(),
            metrics,
            governanceContext
        };
    }

    /**
     * Quantifies the forensic trust and survivability of a chain.
     */
    private static calculateResilienceMetrics(entries: EvidenceEntry[], state: VerificationState) {
        const hasCausality = entries.some(e => !!e.causality);
        const hasMissingTelemetry = entries.some(e => e.payload?.dependency_health === 'MISSING');
        
        // Detect sequence gaps (Injection B)
        let hasTemporalGaps = false;
        for (let i = 1; i < entries.length; i++) {
            if (entries[i].sequence > entries[i-1].sequence + 1) {
                hasTemporalGaps = true;
            }
        }

        return {
            chainIntegrityRate: state === VerificationState.UNTRUSTED ? 0.5 : 1.0,
            epochTrustValidity: state === VerificationState.DEGRADED ? 0.3 : 1.0,
            replaySurvivability: entries.length > 0 ? 0.9 : 0,
            recoveryConfidence: (state === VerificationState.VERIFIED && !hasTemporalGaps) ? 1.0 : 0.6,
            evidenceCompleteness: hasMissingTelemetry || hasTemporalGaps ? 0.7 : 1.0,
            causalCertainty: hasCausality ? 0.9 : 0.4
        };
    }

    /**
     * Verifies the cryptographic and causal integrity of an entry sequence.
     */
    private static async verifyChainIntegrity(entries: EvidenceEntry[]): Promise<VerificationState> {
        if (entries.length === 0) return VerificationState.VERIFIED;

        let lastHash = entries[0].integrity.previousHash;
        let hasRevokedSigner = false;

        const { ForensicResilienceEngine } = await import('./resilience-engine');

        for (const entry of entries) {
            // 1. Hash Linkage Check (Structural Integrity)
            if (entry.integrity.previousHash !== lastHash) {
                logger.error({ entryId: entry.id }, '[EvidenceLedger] Chain broken: hash linkage failure');
                return VerificationState.UNTRUSTED;
            }

            // 2. Signature Validation (Origin Authenticity)
            if (!this.isValidSignature(entry.integrity.hash, entry.integrity.signature)) {
                logger.error({ entryId: entry.id }, '[EvidenceLedger] Signature invalid: authenticity failure');
                return VerificationState.UNTRUSTED;
            }

            // 3. Signer Revocation Check (Current Authority)
            const signerId = entry.integrity.signature?.signerId;
            if (signerId && await ForensicResilienceEngine.isSignerRevoked(signerId)) {
                hasRevokedSigner = true;
            }

            lastHash = entry.integrity.hash;
        }

        // Return DEGRADED if chain is intact but signers are compromised
        return hasRevokedSigner ? VerificationState.DEGRADED : VerificationState.VERIFIED;
    }

    /**
     * Notarizes the current ledger state with a Merkle Root.
     */
    private static async checkpoint(correlationId: string): Promise<LedgerCheckpoint> {
        const entryIds = await redis.lrange(`${this.CHAIN_PREFIX}${correlationId}:ledger`, 0, -1);
        const merkleRoot = this.calculateMerkleRoot(entryIds); // Simplified implementation
        
        const activeEpoch = await this.getActiveEpoch();
        const checkpoint: LedgerCheckpoint = {
            id: uuidv4(),
            timestamp: Date.now(),
            epochId: activeEpoch.id,
            merkleRoot,
            count: entryIds.length,
            signature: {
                signerId: 'system-notary-01',
                algorithm: 'ed25519',
                signature: 'signed-merkle-root',
                signedAt: Date.now(),
                trustEpochId: activeEpoch.id,
                scope: 'checkpoint'
            }
        };

        await redis.set(`${this.CHECKPOINT_PREFIX}${checkpoint.id}`, JSON.stringify(checkpoint));
        logger.info({ correlationId, checkpointId: checkpoint.id }, '[EvidenceLedger] Checkpoint notarized');
        
        return checkpoint;
    }

    // --- Cryptographic Helpers ---

    private static calculateHash(data: any): string {
        return crypto.createHash('sha256').update(JSON.stringify(data)).digest('hex');
    }

    private static signHash(hash: string, signerId: string): string {
        // Mock Ed25519 signing
        return `sig:${signerId}:${hash.substring(0, 8)}`;
    }

    private static isValidSignature(hash: string, signature?: EvidenceSignature): boolean {
        if (!signature) return false;
        // Mock verification
        return signature.signature.endsWith(hash.substring(0, 8));
    }

    private static calculateMerkleRoot(ids: string[]): string {
        // Rolling XOR hash for mock Merkle root
        return ids.reduce((acc, id) => crypto.createHash('md5').update(acc + id).digest('hex'), 'genesis');
    }

    private static async getActiveEpoch(): Promise<TrustEpoch> {
        const data = await redis.get(this.EPOCH_KEY);
        if (data) return JSON.parse(data);
        
        // Genesis Epoch
        return {
            id: 'GENESIS-EPOCH-001',
            startTime: Date.now(),
            algorithm: 'ed25519',
        };
    }
    
    /**
     * Evaluates a specific evidence entry as a potential rollback target.
     */
    static async assessRollbackImpact(entryId: string): Promise<RollbackImpactAssessment> {
        const data = await redis.get(`${this.LEDGER_PREFIX}${entryId}`);
        if (!data) throw new Error('Evidence entry not found');
        const entry = JSON.parse(data);

        // Mock Invariants for Drill IFD-001
        const invariants: RollbackInvariants = {
            baselineSoftwareVersion: '2.4.0',
            prohibitedStates: ['vulnerable-kernel-01'],
            mandatoryDependencies: ['identity-service', 'audit-vault'],
            maxBlastRadiusNodes: 5
        };

        const violated: string[] = [];
        if (entry.payload?.version && entry.payload.version < invariants.baselineSoftwareVersion) {
            violated.push(`Unsafe software baseline: ${entry.payload.version} < ${invariants.baselineSoftwareVersion}`);
        }
        
        if (entry.payload?.dependency_health === 'MISSING') {
            violated.push('Mandatory dependency telemetry missing');
        }

        const isSafe = violated.length === 0;

        return {
            isSafe,
            blastRadiusNodes: ['ztan-edge-01', 'ztan-edge-02'], // Mocked for drill
            violatedInvariants: violated,
            dependencyHealth: {
                'identity-service': 'HEALTHY',
                'audit-vault': entry.payload?.dependency_health === 'MISSING' ? 'MISSING' : 'HEALTHY'
            },
            recommendation: violated.length > 0 ? 'PROHIBITED' : 'PROCEED'
        };
    }
}
