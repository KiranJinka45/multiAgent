import { ThresholdBls } from '../packages/ztan-crypto/src/ztan-bls';
import { Canonical } from '../packages/ztan-crypto/src/canonical';

async function main() {
    const threshold = 2;
    const participantIds = ["Node-A", "Node-B", "Node-C"];
    
    // 1. DKG
    const { masterPublicKey, shares } = await ThresholdBls.dkg(threshold, participantIds.length, participantIds);
    const eligiblePks = shares.map(s => s.verificationKey);
    
    // 2. Build Canonical Payload (Audit Hash)
    const auditId = "RFC-v1.5-FINAL-🧪";
    const timestamp = 1710000000000;
    const payloadHash = "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b";
    
    const versionTag = "ZTAN_CANONICAL_V1";
    const auditIdBytes = Buffer.from(auditId, 'utf-8');
    const payloadHashBytes = Buffer.from(payloadHash, 'hex');
    
    const buffer = Buffer.concat([
        Canonical.encodeField(Buffer.from(versionTag, 'utf-8')),
        Canonical.encodeField(auditIdBytes),
        Canonical.encodeUint64BE(BigInt(timestamp)),
        Canonical.encodeField(payloadHashBytes),
        Canonical.encodeUint32BE(threshold),
        Canonical.encodeUint32BE(participantIds.length)
    ]);
    
    // Sort and add participants
    const sortedNodes = [...participantIds].sort().map(id => Buffer.from(id, 'utf-8'));
    const nodesBuffer = Buffer.concat(sortedNodes.map(n => Canonical.encodeField(n)));
    
    const finalPayload = Buffer.concat([buffer, nodesBuffer]);
    const crypto = require('crypto');
    const canonicalHash = crypto.createHash('sha256').update(finalPayload).digest('hex');
    
    // 3. Sign with Node A and Node B
    const ceremonyId = "CEREMONY-v1.5-GOLD";
    const shareA = shares.find(s => s.nodeId === "Node-A")!;
    const shareB = shares.find(s => s.nodeId === "Node-B")!;
    
    const sigA = await ThresholdBls.signShare(canonicalHash, shareA.secretShare, ceremonyId, threshold, eligiblePks);
    const sigB = await ThresholdBls.signShare(canonicalHash, shareB.secretShare, ceremonyId, threshold, eligiblePks);
    
    const aggregated = await ThresholdBls.aggregate([sigA, sigB]);
    
    // 4. Verify
    const isValid = await ThresholdBls.verify(aggregated, canonicalHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, threshold, eligiblePks);
    
    console.log(JSON.stringify({
        name: "ZTAN-RFC-v1.5: Final Semantic Binding",
        type: "SUCCESS",
        input: {
            auditId,
            timestamp,
            payloadHash,
            threshold,
            nodeIds: participantIds
        },
        ceremonyId,
        eligiblePublicKeys: eligiblePks,
        expectedHash: canonicalHash,
        expectedMasterPk: masterPublicKey,
        expectedSignature: aggregated
    }, null, 2));
}

main();
