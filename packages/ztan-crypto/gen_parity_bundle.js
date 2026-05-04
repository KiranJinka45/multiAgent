const { ThresholdBls, buildCanonicalPayload, hashPayload } = require('./src/index.ts');
const fs = require('fs');

async function generateParityVector() {
    const input = {
        version: "ZTAN_CANONICAL_V1",
        auditId: "PARITY-TEST-🎉",
        timestamp: 1710000000000,
        nodeIds: ["Node-A", "Node-B", "Node-C"],
        threshold: 2,
        payloadHash: "72".repeat(32)
    };

    const canonical = buildCanonicalPayload(input);
    const hash = hashPayload(canonical);

    console.log("Canonical Hash:", hash);

    // DKG
    const { masterPublicKey, shares } = await ThresholdBls.dkg(2, 3, input.nodeIds);
    
    // Sign with A and B
    const sigA = await ThresholdBls.signShare(hash, shares[0].secretShare);
    const sigB = await ThresholdBls.signShare(hash, shares[1].secretShare);
    
    const aggregated = await ThresholdBls.aggregate([sigA, sigB]);

    const bundle = {
        version: "1.7.0",
        input: {
            raw: JSON.stringify(input),
            fingerprint: require('crypto').createHash('sha256').update(JSON.stringify(input)).digest('hex')
        },
        reproducibility: {
            spec: "ZTAN-RFC-001 v1.4"
        },
        integrity: {
            canonicalHash: hash,
            finalAnchor: "anchor"
        },
        output: {
            hash: hash,
            tss: {
                masterPublicKey,
                aggregatedSignature: aggregated,
                currentSigners: ["Node-A", "Node-B"],
                shares: shares.map(s => ({ nodeId: s.nodeId, verificationKey: s.verificationKey }))
            }
        }
    };

    fs.writeFileSync('parity_bundle.json', JSON.stringify(bundle, null, 2));
    console.log("Generated parity_bundle.json");
}

generateParityVector();
