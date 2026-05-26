import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import { 
    governanceSignablePayload, 
    type GovernanceReceipt, 
    type CouncilState,
    type CouncilMember
} from './governance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const ATTENTION_DIR_DEFAULT = path.resolve(__dirname, '../../../../.ztan-transparency/attention');

export type AnomalyType = 'HASH_MISMATCH' | 'SIGNATURE_FORGERY' | 'EPOCH_DISCONTINUITY';

export interface AttentionDrill {
    drillId: string;
    anomalyType: AnomalyType;
    poisonedReceiptHash: string;
    nominalReceiptHash: string;
    timestamp: string;
    status: 'PENDING' | 'PASSED' | 'FAILED';
}

export interface AttentionRegistry {
    drills: Record<string, AttentionDrill>;
    degradedKeys: Record<string, { degradedAt: string; alignmentAttempts: number }>;
}

export class ProofOfAttentionEngine {
    private registryDir: string;
    private registryPath: string;
    private registry: AttentionRegistry;

    constructor(registryDir?: string) {
        this.registryDir = registryDir || ATTENTION_DIR_DEFAULT;
        if (!fs.existsSync(this.registryDir)) {
            fs.mkdirSync(this.registryDir, { recursive: true });
        }
        this.registryPath = path.join(this.registryDir, 'attention.registry.json');
        this.registry = this.loadRegistry();
    }

    private loadRegistry(): AttentionRegistry {
        if (fs.existsSync(this.registryPath)) {
            try {
                return JSON.parse(fs.readFileSync(this.registryPath, 'utf8'));
            } catch {
                // Return default on corruption
            }
        }
        return { drills: {}, degradedKeys: {} };
    }

    private saveRegistry(): void {
        fs.writeFileSync(this.registryPath, JSON.stringify(this.registry, null, 2), 'utf8');
    }

    /**
     * Injects a controlled cryptographic or structural flaw into a nominal Governance Receipt,
     * producing a synthetic "Poison Drill" block.
     */
    public generatePoisonDrill(
        nominalReceipt: Omit<GovernanceReceipt, 'signatures'>,
        anomalyType: AnomalyType
    ): Omit<GovernanceReceipt, 'signatures'> {
        const poison = { ...nominalReceipt };
        const nominalPayload = governanceSignablePayload(nominalReceipt as any);
        const nominalHash = crypto.createHash('sha256').update(nominalPayload).digest('hex');

        switch (anomalyType) {
            case 'HASH_MISMATCH':
                // Mutate the previous root hash to simulate a chain-link fracture
                poison.previousGRoot = crypto.createHash('sha256').update('corrupted_anchor_state').digest('hex');
                break;
            case 'EPOCH_DISCONTINUITY':
                // Deliberately leap the epoch or sequence number to simulate Byzantine jumping
                poison.epochId = nominalReceipt.epochId + 5;
                poison.sequenceNumber = nominalReceipt.sequenceNumber + 10;
                break;
            case 'SIGNATURE_FORGERY':
                // Forgery is achieved by altering the structural contents of the reason string
                // without modifying other parameters, causing previous multi-signatures to fail verification.
                poison.reason = `[PROVENANCE DRILL] ${nominalReceipt.reason} (Synthetic payload mutation!)`;
                break;
        }

        const poisonPayload = governanceSignablePayload(poison as any);
        const poisonHash = crypto.createHash('sha256').update(poisonPayload).digest('hex');
        const drillId = crypto.randomUUID();

        const drill: AttentionDrill = {
            drillId,
            anomalyType,
            poisonedReceiptHash: poisonHash,
            nominalReceiptHash: nominalHash,
            timestamp: new Date().toISOString(),
            status: 'PENDING'
        };

        this.registry.drills[poisonHash] = drill;
        this.saveRegistry();

        console.log(`[ProofOfAttention] Registered synthetic poison drill ${drillId.slice(0, 8)}... (Type: ${anomalyType})`);
        return poison;
    }

    /**
     * Intercepts operator actions. If an operator signs/approves a poison drill,
     * they fail the vigilance check, triggering key degradation.
     */
    public evaluateOperatorResponse(receipt: GovernanceReceipt, approved: boolean): 'PASSED' | 'FAILED' | 'NOMINAL' {
        const payload = governanceSignablePayload(receipt);
        const receiptHash = crypto.createHash('sha256').update(payload).digest('hex');

        const drill = this.registry.drills[receiptHash];
        if (!drill) {
            return 'NOMINAL';
        }

        if (drill.status !== 'PENDING') {
            return drill.status === 'PASSED' ? 'PASSED' : 'FAILED';
        }

        if (approved) {
            // Operator blindly approved a corrupted block! Degradation sequence starts.
            drill.status = 'FAILED';
            this.saveRegistry();

            // Degrade all signers who participated in this blind approval
            for (const sig of receipt.signatures) {
                this.degradeKey(sig.signerKeyId);
            }
            return 'FAILED';
        } else {
            // Operator successfully caught the anomaly and rejected/quarantined it!
            drill.status = 'PASSED';
            this.saveRegistry();
            console.log(`[ProofOfAttention] Operator successfully detected and isolated synthetic anomaly! Drill ${drill.drillId.slice(0, 8)}... PASSED.`);
            return 'PASSED';
        }
    }

    /**
     * Marks a key as degraded, stripping its authority weight to 0.
     */
    public degradeKey(keyId: string): void {
        if (!this.registry.degradedKeys[keyId]) {
            this.registry.degradedKeys[keyId] = {
                degradedAt: new Date().toISOString(),
                alignmentAttempts: 0
            };
            this.saveRegistry();
            console.warn(`[ProofOfAttention] ⚠️ KEY DEGRADED: Council member ${keyId.slice(0, 8)}... failed attention check! Authority weight set to 0.`);
        }
    }

    /**
     * Returns whether a key is currently degraded.
     */
    public isKeyDegraded(keyId: string): boolean {
        return !!this.registry.degradedKeys[keyId];
    }

    /**
     * Modifies the active council state to dynamically strip degraded members.
     * This naturally degrades their cryptographic multi-sig authority to 0.
     */
    public filterActiveCouncil(baseCouncil: CouncilState): CouncilState {
        const activeMembers = baseCouncil.members.filter(m => !this.isKeyDegraded(m.id));
        return {
            ...baseCouncil,
            members: activeMembers,
            // Keep threshold standard to prevent automatic security relaxation
            threshold: baseCouncil.threshold
        };
    }

    /**
     * Generates a set of 3 alignment challenges for a degraded operator to rehabilitate.
     * Each challenge contains a target payload and a boolean representing if it is valid (true) or tampered (false).
     */
    public generateAlignmentPuzzles(keyId: string): Array<{ id: string; payload: string; isNominal: boolean }> {
        if (!this.isKeyDegraded(keyId)) {
            throw new Error(`Key ${keyId.slice(0, 8)}... is not degraded. Alignment ceremony is not required.`);
        }

        const puzzles = [
            {
                id: crypto.randomUUID(),
                payload: "Nominal checkpoint synchronization. Parity hashes match across all active database shards.",
                isNominal: true
            },
            {
                id: crypto.randomUUID(),
                payload: "Byzantine transaction hijack! Forged signature injection detected from malicious node 0x9a8b.",
                isNominal: false
            },
            {
                id: crypto.randomUUID(),
                payload: "Substrate ledger replication successful. Compaction bounds established at block 5000.",
                isNominal: true
            }
        ];

        return puzzles;
    }

    /**
     * Validates operator answers to rehabilitation alignment challenges.
     * If 100% correct, restores their key authority.
     */
    public verifyAlignmentResolution(keyId: string, answers: boolean[], expected: boolean[]): boolean {
        if (!this.isKeyDegraded(keyId)) {
            return true;
        }

        this.registry.degradedKeys[keyId].alignmentAttempts++;

        const isCorrect = answers.length === expected.length && answers.every((val, idx) => val === expected[idx]);

        if (isCorrect) {
            delete this.registry.degradedKeys[keyId];
            this.saveRegistry();
            console.log(`[ProofOfAttention] ✅ KEY RESTORED: Council member ${keyId.slice(0, 8)}... successfully completed the Alignment Ceremony! Key weight restored to 1.`);
            return true;
        } else {
            this.saveRegistry();
            console.warn(`[ProofOfAttention] Alignment ceremony FAILED for member ${keyId.slice(0, 8)}... Attempt: ${this.registry.degradedKeys[keyId].alignmentAttempts}`);
            return false;
        }
    }
}
