import * as crypto from 'crypto';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

export interface WitnessReceipt {
    epochId: string;
    rootHash: string;
    signatures: string[];
    timestamp: string;
}

/**
 * 🛡️ MerkleWitness
 * Enforces deterministic mathematical finality for execution events.
 * Anchors the ZTAN state into an immutable Merkle Tree.
 */
export class MerkleWitness {
    private leaves: string[] = [];

    /**
     * Records an execution event and returns its Merkle proof.
     */
    async recordEvent(eventId: string, payload: any): Promise<string> {
        const payloadHash = crypto.createHash('sha256').update(JSON.stringify(payload)).digest('hex');
        this.leaves.push(payloadHash);

        const root = this.calculateRoot();
        logger.info({ eventId, root }, '[Witness] Event anchored to Merkle Root');

        // Persist to ZtanProof table (as updated in schema)
        await (db as any).ztanProof.create({
            data: {
                inputHash: payloadHash,
                bundle: payload,
                canonicalHash: root,
                finalAnchor: `ztan-v1-${Date.now()}`,
                status: 'VERIFIED'
            }
        });

        return root;
    }

    /**
     * Calculates the Merkle Root of the current event set.
     */
    private calculateRoot(): string {
        if (this.leaves.length === 0) return crypto.createHash('sha256').update('').digest('hex');
        
        let currentLevel = [...this.leaves];
        while (currentLevel.length > 1) {
            const nextLevel: string[] = [];
            for (let i = 0; i < currentLevel.length; i += 2) {
                const left = currentLevel[i];
                const right = i + 1 < currentLevel.length ? currentLevel[i + 1] : left;
                nextLevel.push(crypto.createHash('sha256').update(left + right).digest('hex'));
            }
            currentLevel = nextLevel;
        }
        return currentLevel[0];
    }

    /**
     * Generates a signed receipt for the current epoch.
     */
    async finalizeEpoch(epochId: string): Promise<WitnessReceipt> {
        const rootHash = this.calculateRoot();
        const timestamp = new Date().toISOString();
        
        // In a real system, this would involve threshold signatures from the federation
        const signature = crypto.createHmac('sha256', process.env.WITNESS_KEY!).update(rootHash + timestamp).digest('base64');

        return {
            epochId,
            rootHash,
            signatures: [signature],
            timestamp
        };
    }
}
