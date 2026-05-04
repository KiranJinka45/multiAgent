"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const ztan_bls_1 = require("../src/ztan-bls");
(0, vitest_1.describe)('ZTAN-RFC-001 v1.5: Final Semantic Binding', () => {
    (0, vitest_1.it)('should bind ceremonyId, threshold, and participant set into the signature', async () => {
        const threshold = 2;
        const participantIds = ["Node-A", "Node-B", "Node-C"];
        const ceremonyId = "CEREMONY-v1.5-VALIDATION";
        const messageHash = "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b";
        // 1. DKG
        const { masterPublicKey, shares } = await ztan_bls_1.ThresholdBls.dkg(threshold, participantIds.length, participantIds);
        const eligiblePks = shares.map(s => s.verificationKey);
        // 2. Sign correctly
        const shareA = shares.find(s => s.nodeId === "Node-A");
        const shareB = shares.find(s => s.nodeId === "Node-B");
        const sigA = await ztan_bls_1.ThresholdBls.signShare(messageHash, shareA.secretShare, ceremonyId, threshold, eligiblePks);
        const sigB = await ztan_bls_1.ThresholdBls.signShare(messageHash, shareB.secretShare, ceremonyId, threshold, eligiblePks);
        const aggregated = await ztan_bls_1.ThresholdBls.aggregate([sigA, sigB]);
        // 3. Verify correctly
        const isValid = await ztan_bls_1.ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, threshold, eligiblePks);
        (0, vitest_1.expect)(isValid).toBe(true);
        // 4. ADVERSARIAL: Threshold Mismatch
        const isInvalidThreshold = await ztan_bls_1.ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, 3, eligiblePks);
        (0, vitest_1.expect)(isInvalidThreshold).toBe(false);
        // 5. ADVERSARIAL: Signer Set Mismatch
        const modifiedPks = [...eligiblePks];
        modifiedPks[2] = modifiedPks[0]; // Corrupt the set
        const isInvalidSet = await ztan_bls_1.ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, threshold, modifiedPks);
        (0, vitest_1.expect)(isInvalidSet).toBe(false);
        // 6. ADVERSARIAL: Context Mismatch
        const isInvalidContext = await ztan_bls_1.ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], "WRONG-CEREMONY", threshold, eligiblePks);
        (0, vitest_1.expect)(isInvalidContext).toBe(false);
        console.log("RFC v1.5 LIFT-OFF: Semantic Binding Verified Across 4 Dimensions");
    });
});
