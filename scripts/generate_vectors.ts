import { Canonical, hashPayload, buildCanonicalPayload } from './packages/ztan-crypto/src';
import * as fs from 'fs';

async function generateVectors() {
    const vectors = [];

    // Vector 1: Standard ASCII
    const input1 = {
        auditId: "ZTAN-TEST-001",
        timestamp: 1710000000000,
        nodeIds: ["Node-A", "Node-B", "Node-C"],
        threshold: 2,
        payloadHash: "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b"
    };
    const res1 = buildCanonicalPayload(input1);
    vectors.push({
        name: "Standard ASCII Vector",
        input: input1,
        canonicalHex: Buffer.from(res1.boundPayloadBytes).toString('hex'),
        canonicalHash: hashPayload(res1)
    });

    // Vector 2: Unicode & Emojis (Normalization check)
    const input2 = {
        auditId: "ZTAN-🎉-UNICODE",
        timestamp: 1710000000000,
        nodeIds: ["é-node", "e\u0301-node", "Z-node"], // Note: é-node and e\u0301-node are NFC-equivalent
        threshold: 3,
        payloadHash: "00".repeat(32)
    };
    try {
        const res2 = buildCanonicalPayload(input2);
        vectors.push({
            name: "Unicode Normalization Vector",
            input: input2,
            canonicalHex: Buffer.from(res2.boundPayloadBytes).toString('hex'),
            canonicalHash: hashPayload(res2)
        });
    } catch (e) {
        console.log("Vector 2 rejected as expected (Duplicate NFC nodeIds)");
    }

    // Vector 3: Minimal Set
    const input3 = {
        auditId: "MIN-SET",
        timestamp: 1710000000000,
        nodeIds: ["Node-X"],
        threshold: 1,
        payloadHash: "ff".repeat(32)
    };
    const res3 = buildCanonicalPayload(input3);
    vectors.push({
        name: "Minimal Set Vector",
        input: input3,
        canonicalHex: Buffer.from(res3.boundPayloadBytes).toString('hex'),
        canonicalHash: hashPayload(res3)
    });

    fs.writeFileSync('vectors.json', JSON.stringify(vectors, null, 2));
    console.log("Generated vectors.json");
}

generateVectors();
