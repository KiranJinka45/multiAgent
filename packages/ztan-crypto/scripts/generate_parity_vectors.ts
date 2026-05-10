import { ThresholdBls } from '../src/ztan-bls';
import { Canonical } from '../src/canonical';
import * as fs from 'fs';
import * as path from 'path';

async function generateVectors() {
    console.log("--- Generating Randomized Parity Vectors ---");
    
    const count = 100;
    const vectors = [];
    const nodeResults = [];
    
    const n = 5;
    const t = 3;
    const nodeIds = Array.from({ length: n }, (_, j) => `node-${j}`);

    for (let i = 0; i < count; i++) {
        // Random message hash (32 bytes)
        const msgHash = Canonical.bytesToHex(new Uint8Array(Array.from({ length: 32 }, () => Math.floor(Math.random() * 256))));
        const ceremonyId = `ceremony-rand-${i}`;
        
        // DKG
        const dkg = await ThresholdBls.dkg(t, n, nodeIds);
        const masterPk = dkg.masterPublicKey;
        const eligiblePks = dkg.shares.map(s => s.verificationKey);

        // Pick random subset of size t
        const subsetIndices = Array.from({ length: n }, (_, j) => j + 1)
            .sort(() => Math.random() - 0.5)
            .slice(0, t)
            .sort((a, b) => a - b);
        
        const subsetShares = subsetIndices.map(idx => dkg.shares[idx - 1]);

        // Node Sign (Generate ground truth)
        const sigShares = await Promise.all(subsetShares.map(s => 
            ThresholdBls.signShare(msgHash, s.secretShare, ceremonyId, t, eligiblePks)
        ));
        
        const aggregate = await ThresholdBls.aggregate(sigShares, subsetIndices);

        // Store vector (Inputs for Browser)
        vectors.push({
            id: i,
            messageHash: msgHash,
            ceremonyId: ceremonyId,
            threshold: t,
            eligiblePublicKeys: eligiblePks,
            subsetIndices: subsetIndices,
            shares: subsetShares.map((s, idx) => ({
                index: subsetIndices[idx],
                secretShare: s.secretShare
            }))
        });

        // Store Node result (Ground truth for Browser)
        nodeResults.push({
            id: i,
            masterPublicKey: masterPk,
            aggregateSignature: aggregate,
            individualSignatures: sigShares
        });
        
        if (i % 10 === 0) process.stdout.write('.');
    }

    // Add Edge Cases
    console.log("\nAdding Edge Cases...");
    
    // 1. Empty message
    const emptyMsg = ""; // Should probably be 32 bytes of zeros or error. ZTAN RFC says msg is hashed.
    // ... adding more edge cases if needed ...

    fs.writeFileSync(path.join(__dirname, '../test-vectors-random.json'), JSON.stringify(vectors, null, 2));
    fs.writeFileSync(path.join(__dirname, '../node-results-random.json'), JSON.stringify(nodeResults, null, 2));

    console.log(`\n✅ Generated ${count} random vectors.`);
}

generateVectors().catch(console.error);
