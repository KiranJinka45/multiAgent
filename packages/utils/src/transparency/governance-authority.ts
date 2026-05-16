import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { governanceSignablePayload } from './governance.js';
import type { GovernanceReceipt, GovernanceAction, CouncilMember } from './governance.js';
import { LocalSigner } from './signer.js';
import type { ISigner } from './signer.js';

import { MerkleTree } from './merkle.js';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);


const GOVERNANCE_DIR_DEFAULT = path.resolve(__dirname, '../../../../.ztan-transparency/governance');


/**
 * 🛡️ GovernanceCouncilMember
 * Represents a single member of the governance council using the ISigner abstraction.
 */
export class GovernanceCouncilMember {
    private signer: ISigner;

    constructor(memberDir: string) {
        const keyDir = path.join(memberDir, 'keys');
        if (!fs.existsSync(keyDir)) fs.mkdirSync(keyDir, { recursive: true });

        const privPath = path.join(keyDir, 'authority.key');
        const pubPath = path.join(keyDir, 'authority.pub');

        if (!fs.existsSync(privPath) || !fs.existsSync(pubPath)) {
            const { privateKey, publicKey } = crypto.generateKeyPairSync('ed25519');
            fs.writeFileSync(privPath, privateKey.export({ type: 'pkcs8', format: 'pem' }));
            fs.writeFileSync(pubPath, publicKey.export({ type: 'spki', format: 'pem' }));
        }

        this.signer = new LocalSigner(
            fs.readFileSync(privPath, 'utf8'),
            fs.readFileSync(pubPath, 'utf8')
        );
    }

    getKeyId(): string { return this.signer.getKeyId(); }
    getPublicKeyPem(): string { return this.signer.getPublicKeyPem(); }

    async signProposal(receipt: Omit<GovernanceReceipt, 'signatures'>): Promise<{ signerKeyId: string, signature: string }> {
        const payload = governanceSignablePayload(receipt as any);
        const signature = await this.signer.sign(Buffer.from(payload, 'utf8'));
        return {
            signerKeyId: this.getKeyId(),
            signature
        };
    }
}

/**
 * 🛡️ GovernanceCoordinator
 * Manages the canonical governance log and Merkle root chaining.
 */
export class GovernanceCoordinator {
    private governanceDir: string;
    private governanceTree: MerkleTree;

    constructor(governanceDir?: string) {
        this.governanceDir = governanceDir || GOVERNANCE_DIR_DEFAULT;
        if (!fs.existsSync(this.governanceDir)) fs.mkdirSync(this.governanceDir, { recursive: true });
        this.governanceTree = new MerkleTree();
        this.rebuildTree();
    }

    private rebuildTree(): void {
        const log = this.loadGovernanceLog();
        this.governanceTree = new MerkleTree();
        for (const receipt of log) {
            const payload = governanceSignablePayload(receipt);
            this.governanceTree.append(MerkleTree.hashLeaf(payload));
        }
    }

    /**
     * Commits a receipt to the log and updates the Merkle tree.
     */
    commitReceipt(receipt: GovernanceReceipt): void {
        const logPath = path.join(this.governanceDir, 'governance.log.ndjson');
        
        // Verify gRoot against tree
        const payload = governanceSignablePayload(receipt);
        this.governanceTree.append(MerkleTree.hashLeaf(payload));
        
        if (receipt.gRoot !== this.governanceTree.getRoot()) {
            throw new Error(`Inconsistent gRoot: expected ${this.governanceTree.getRoot()}, got ${receipt.gRoot}`);
        }

        fs.appendFileSync(logPath, JSON.stringify(receipt) + '\n');
    }

    loadGovernanceLog(): GovernanceReceipt[] {
        const logPath = path.join(this.governanceDir, 'governance.log.ndjson');
        if (!fs.existsSync(logPath)) return [];
        return fs.readFileSync(logPath, 'utf8')
            .trim()
            .split('\n')
            .filter(l => l.length > 0)
            .map(l => JSON.parse(l) as GovernanceReceipt);
    }

    getEpochContext(): { epochId: number, lastSeq: number, gRoot: string } {
        const log = this.loadGovernanceLog();
        if (log.length === 0) {
            return { epochId: 0, lastSeq: -1, gRoot: crypto.createHash('sha256').digest('hex') };
        }
        const last = log[log.length - 1];
        return {
            epochId: last.epochId,
            lastSeq: last.sequenceNumber,
            gRoot: last.gRoot
        };
    }
}
