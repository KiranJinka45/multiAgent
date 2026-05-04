import { describe, it, expect } from 'vitest';
import { ThresholdBls } from '../src/ztan-bls';

describe('ZTAN-RFC-001 v1.5: Final Semantic Binding', () => {
    it('should bind ceremonyId, threshold, and participant set into the signature', async () => {
        const threshold = 2;
        const participantIds = ["Node-A", "Node-B", "Node-C"];
        const ceremonyId = "CEREMONY-v1.5-VALIDATION";
        const messageHash = "7289f43e1d3e4b5a6c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b";

        // 1. DKG
        const { masterPublicKey, shares } = await ThresholdBls.dkg(threshold, participantIds.length, participantIds);
        const eligiblePks = shares.map(s => s.verificationKey);

        // 2. Sign correctly
        const shareA = shares.find(s => s.nodeId === "Node-A")!;
        const shareB = shares.find(s => s.nodeId === "Node-B")!;
        
        const sigA = await ThresholdBls.signShare(messageHash, shareA.secretShare, ceremonyId, threshold, eligiblePks);
        const sigB = await ThresholdBls.signShare(messageHash, shareB.secretShare, ceremonyId, threshold, eligiblePks);
        
        const aggregated = await ThresholdBls.aggregate([sigA, sigB]);

        // 3. Verify correctly
        const isValid = await ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, threshold, eligiblePks);
        expect(isValid).toBe(true);

        // 4. ADVERSARIAL: Threshold Mismatch
        const isInvalidThreshold = await ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, 3, eligiblePks);
        expect(isInvalidThreshold).toBe(false);

        // 5. ADVERSARIAL: Signer Set Mismatch
        const modifiedPks = [...eligiblePks];
        modifiedPks[2] = modifiedPks[0]; // Corrupt the set
        const isInvalidSet = await ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], ceremonyId, threshold, modifiedPks);
        expect(isInvalidSet).toBe(false);

        // 6. ADVERSARIAL: Context Mismatch
        const isInvalidContext = await ThresholdBls.verify(aggregated, messageHash, [shareA.verificationKey, shareB.verificationKey], "WRONG-CEREMONY", threshold, eligiblePks);
        expect(isInvalidContext).toBe(false);
        
        console.log("RFC v1.5 LIFT-OFF: Semantic Binding Verified Across 4 Dimensions");
    });
});
