import express from 'express';
import cors from 'cors';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

import { MerkleTree } from '@packages/utils';
import { LocalFileKeyProvider } from './key-provider';
import { gossipRegistry } from '@packages/utils';


const app = express();
app.use(cors());
app.use(express.json());

const WITNESS_DIR = process.env.WITNESS_DIR || path.join(process.cwd(), '.ztan-witness');
const KEYS_DIR = path.join(WITNESS_DIR, 'keys');
const LOG_FILE = path.join(WITNESS_DIR, 'witness.log.ndjson');

// Ensure directories exist
if (!fs.existsSync(WITNESS_DIR)) fs.mkdirSync(WITNESS_DIR, { recursive: true });
if (!fs.existsSync(KEYS_DIR)) fs.mkdirSync(KEYS_DIR, { recursive: true });

const keyProvider = new LocalFileKeyProvider(
    path.join(KEYS_DIR, 'witness.key'),
    path.join(KEYS_DIR, 'witness.pub')
);

const witnessKeyId = keyProvider.getKeyId();
const publicKey = keyProvider.getPublicKey();

// Governance State
const GOVERNANCE_LOG_FALLBACK = path.join(WITNESS_DIR, '..', '.ztan-transparency', 'governance', 'governance.log.ndjson');
const GOVERNANCE_LOG_ROOT = path.join(process.cwd(), '.ztan-transparency', 'governance', 'governance.log.ndjson');
const GOVERNANCE_LOG = fs.existsSync(GOVERNANCE_LOG_ROOT) ? GOVERNANCE_LOG_ROOT : GOVERNANCE_LOG_FALLBACK;

let currentGovSequence = -1;
let currentGovEpoch = 0;
let currentGovRoot = crypto.createHash('sha256').digest('hex');

function updateGovState() {
    if (fs.existsSync(GOVERNANCE_LOG)) {
        const content = fs.readFileSync(GOVERNANCE_LOG, 'utf8').trim();
        if (content) {
            const lines = content.split('\n');
            const govTree = new MerkleTree();
            let lastEpoch = 0;
            let lastSeq = -1;

            for (const line of lines) {
                try {
                    const receipt = JSON.parse(line);
                    const payload = {
                        action: receipt.action,
                        sequenceNumber: receipt.sequenceNumber,
                        epochId: receipt.epochId,
                        previousGRoot: receipt.previousGRoot,
                        effectiveTimestamp: receipt.effectiveTimestamp,
                        reason: receipt.reason,
                    };
                    // Handle optional fields for payload consistency
                    if (receipt.targetWitnessId !== undefined) (payload as any).targetWitnessId = receipt.targetWitnessId;
                    if (receipt.targetWitnessConfig !== undefined) (payload as any).targetWitnessConfig = receipt.targetWitnessConfig;
                    if (receipt.newThreshold !== undefined) (payload as any).newThreshold = receipt.newThreshold;
                    if (receipt.newCouncil !== undefined) (payload as any).newCouncil = receipt.newCouncil;

                    govTree.append(MerkleTree.hashLeaf(JSON.stringify(payload, Object.keys(payload).sort())));
                    lastEpoch = receipt.epochId;
                    lastSeq = receipt.sequenceNumber;
                } catch (e) {
                    console.error('[Witness] Failed to parse governance line:', e);
                }
            }
            
            currentGovSequence = lastSeq;
            currentGovEpoch = lastEpoch;
            currentGovRoot = govTree.getRoot();
            console.log(`[Witness] Governance state updated: epoch=${currentGovEpoch}, seq=${currentGovSequence}, root=${currentGovRoot.slice(0, 16)}...`);
        } else {
            console.log(`[Witness] Governance log is empty at ${GOVERNANCE_LOG}`);
        }
    } else {
        console.log(`[Witness] Governance log NOT FOUND at ${GOVERNANCE_LOG}`);
    }
}
updateGovState();

// Initialize Merkle Tree from existing log
const merkleTree = new MerkleTree();
if (fs.existsSync(LOG_FILE)) {
    const lines = fs.readFileSync(LOG_FILE, 'utf8').split('\n').filter(l => l.trim());
    for (const line of lines) {
        try {
            const entry = JSON.parse(line);
            const leafPayload = {
                missionId: entry.missionId,
                chainRoot: entry.chainRoot,
                tailHash: entry.tailHash,
                operatorSignerKeyId: entry.operatorSignerKeyId,
                operatorGovernanceReceipt: entry.operatorGovernanceReceipt,
                governanceSequence: entry.governanceSequence,
                governanceRoot: entry.governanceRoot
            };
            const leafHash = crypto.createHash('sha256')
                .update(JSON.stringify(leafPayload, Object.keys(leafPayload).sort()))
                .digest('hex');
            merkleTree.append(leafHash);
        } catch (e) {
            console.error('[Witness] Failed to parse log line for Merkle replay:', e);
        }
    }
    console.log(`[Witness] Rebuilt Merkle Tree with ${merkleTree.getLeafCount()} leaves. Root: ${merkleTree.getRoot()}`);
}

app.post('/witness/receipt', (req, res) => {
    try {
        const receipt = req.body;
        
        if (!receipt || !receipt.missionId || !receipt.chainRoot || !receipt.tailHash || !receipt.governanceReceipt || !receipt.signerKeyId) {
            return res.status(400).json({ error: 'Invalid receipt payload' });
        }

        // Refresh governance state before each attestation
        updateGovState();

        const witnessTimestamp = new Date().toISOString();
        
        const witnessPayload = {
            missionId: receipt.missionId,
            chainRoot: receipt.chainRoot,
            tailHash: receipt.tailHash,
            operatorSignerKeyId: receipt.signerKeyId,
            operatorGovernanceReceipt: receipt.governanceReceipt,
            governanceSequence: currentGovSequence,
            governanceEpoch: currentGovEpoch, // NEW
            governanceRoot: currentGovRoot     // G-Tree Root
        };

        const payloadString = JSON.stringify(witnessPayload, Object.keys(witnessPayload).sort());
        const leafHash = crypto.createHash('sha256').update(payloadString).digest('hex');
        const leafIndex = merkleTree.getLeafCount();
        merkleTree.append(leafHash);
        const treeSize = merkleTree.getLeafCount();
        const merkleRoot = merkleTree.getRoot();
        const inclusionProof = merkleTree.getProof(leafIndex);

        const signature = keyProvider.sign(Buffer.from(payloadString, 'utf8'));
        
        const witnessedReceipt = {
            ...witnessPayload,
            witnessTimestamp: witnessTimestamp,
            witnessSignatureAlgorithm: 'ed25519',
            witnessKeyId: witnessKeyId,
            witnessSignature: signature.toString('base64'),
            merkleRoot: merkleRoot,
            treeSize: treeSize,
            leafIndex: leafIndex,
            inclusionProof: inclusionProof
        };

        // Append to local transparency log
        const fd = fs.openSync(LOG_FILE, 'a');
        fs.appendFileSync(fd, JSON.stringify(witnessedReceipt) + '\n');
        fs.closeSync(fd);

        console.log(`[Witness] Received receipt request for mission: ${receipt.missionId}`);
        console.log(`[Witness] Logged and signed receipt (Index: ${leafIndex}, Root: ${merkleRoot.substring(0, 8)}...)`);

        // Phase 7: AUTOMATIC GOSSIP
        // We push a signed checkpoint immediately so auditors can detect split-views
        try {
            const checkpoint = {
                treeSize: treeSize,
                rootHash: merkleRoot,
                timestamp: witnessTimestamp,
                witnessKeyId: witnessKeyId,
                signature: signature.toString('base64'),
                signatureAlgorithm: 'ed25519'
            };
            gossipRegistry.publish(checkpoint).then(() => {
                console.log(`[Witness] Gossiped checkpoint for tree size ${treeSize}`);
            });
        } catch (gossipErr: any) {
            console.error('[Witness] Gossip failed:', gossipErr.message);
        }

        res.json(witnessedReceipt);
    } catch (e: any) {
        console.error('[Witness] Error processing receipt:', e);
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/witness/consistency', (req, res) => {
    try {
        const m = parseInt(req.query.m as string);
        const n = parseInt(req.query.n as string);

        if (isNaN(m) || isNaN(n) || m <= 0 || n < m || n > merkleTree.getLeafCount()) {
            return res.status(400).json({ error: 'Invalid range' });
        }

        const proof = merkleTree.getConsistencyProof(m);
        res.json({
            m,
            n,
            proof,
            oldRoot: "RECONSTRUCT_FROM_HISTORY", // In a real system, we'd look this up
            newRoot: merkleTree.getRoot()
        });
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/witness/checkpoint', (req, res) => {
    try {
        const treeSize = merkleTree.getLeafCount();
        const rootHash = merkleTree.getRoot();
        const timestamp = new Date().toISOString();

        const checkpointPayload = {
            treeSize,
            rootHash,
            timestamp,
            witnessKeyId
        };

        const checkpointString = JSON.stringify(checkpointPayload, Object.keys(checkpointPayload).sort());
        const signature = keyProvider.sign(Buffer.from(checkpointString, 'utf8'));

        res.json({
            ...checkpointPayload,
            signature: signature.toString('base64'),
            signatureAlgorithm: 'ed25519'
        });
    } catch (e) {
        res.status(500).json({ error: 'Internal server error' });
    }
});

app.get('/witness/public-key', (req, res) => {
    res.type('text/plain').send(publicKey.export({ type: 'spki', format: 'pem' }));
});

const PORT = process.env.WITNESS_PORT || 8080;
app.listen(PORT, () => {
    console.log(`[Witness] Server listening on port ${PORT}`);
    console.log(`[Witness] Public Key ID: ${witnessKeyId}`);
});
