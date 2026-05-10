import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


export interface SignedCheckpoint {
    treeSize: number;
    rootHash: string;
    timestamp: string;
    witnessKeyId: string;
    signature: string;
    signatureAlgorithm: string;
}

/**
 * A simulated public registry for gossiping checkpoints.
 * In production, this would be a distributed network or public log (e.g. Google Trillian).
 */
export class GossipRegistry {
    private registryDir: string;

    constructor() {
        // Use relative path from this file to reach project root
        this.registryDir = path.resolve(__dirname, '../../../../.ztan-transparency/gossip');
        if (!fs.existsSync(this.registryDir)) {
            fs.mkdirSync(this.registryDir, { recursive: true });
        }
    }

    /**
     * Publishes a checkpoint to the public registry.
     */
    async publish(checkpoint: SignedCheckpoint): Promise<void> {
        // Validation: Ensure signature is valid before accepting (Anti-Spam)
        // Note: Real implementation would verify the signature here.
        
        // Include rootHash hash in filename to prevent overwrites of conflicting roots
        const rootSummary = crypto.createHash('sha256').update(checkpoint.rootHash).digest('hex').slice(0, 8);
        const fileName = `${checkpoint.witnessKeyId}-${checkpoint.treeSize}-${rootSummary}.json`;
        const filePath = path.join(this.registryDir, fileName);
        
        fs.writeFileSync(filePath, JSON.stringify(checkpoint, null, 2));
    }

    /**
     * Lists all gossiped checkpoints for a specific witness.
     */
    async listCheckpoints(witnessKeyId: string): Promise<SignedCheckpoint[]> {
        const files = fs.readdirSync(this.registryDir);
        const checkpoints: SignedCheckpoint[] = [];

        for (const file of files) {
            if (file.startsWith(witnessKeyId)) {
                const content = fs.readFileSync(path.join(this.registryDir, file), 'utf8');
                checkpoints.push(JSON.parse(content));
            }
        }

        // Sort by treeSize
        return checkpoints.sort((a, b) => a.treeSize - b.treeSize);
    }

    /**
     * Get the latest gossiped checkpoint for a witness.
     */
    async getLatest(witnessKeyId: string): Promise<SignedCheckpoint | null> {
        const list = await this.listCheckpoints(witnessKeyId);
        return list.length > 0 ? list[list.length - 1] : null;
    }
}

export const gossipRegistry = new GossipRegistry();
