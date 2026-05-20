import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { 
    verifyGovernanceReceiptMultiSig, 
    governanceSignablePayload, 
    type GovernanceReceipt, 
    type CouncilState 
} from './governance.js';
import { KmsSigner } from './signer.js';

async function runHsmCeremonyValidation() {
    console.log("=========================================================================");
    console.log("      ZTAN HSM Real-World Multi-Sig Ceremony Verification Suite          ");
    console.log("=========================================================================");

    // Clean any prior KMS simulated keys to ensure a clean validation run
    const kmsDir = path.join(process.cwd(), '.ztan-transparency', 'kms');
    if (fs.existsSync(kmsDir)) {
        fs.rmSync(kmsDir, { recursive: true, force: true });
        console.log("[HSM-TEST] Purged legacy simulated KMS directory to ensure clean keys.");
    }

    // 1. Instantiate 3 simulated HSM/KMS signers representing Council Members
    const arn1 = "arn:aws:kms:us-east-1:111122223333:key/hsm-council-member-01";
    const arn2 = "arn:aws:kms:us-east-1:111122223333:key/hsm-council-member-02";
    const arn3 = "arn:aws:kms:us-east-1:111122223333:key/hsm-council-member-03";

    console.log("[HSM-TEST] Provisioning 3 Hardware Security Module keys via Cloud KMS simulation...");
    const signer1 = new KmsSigner(arn1);
    const signer2 = new KmsSigner(arn2);
    const signer3 = new KmsSigner(arn3);

    console.log(`  - Member 1 Key ID: ${signer1.getKeyId().substring(0, 16)}...`);
    console.log(`  - Member 2 Key ID: ${signer2.getKeyId().substring(0, 16)}...`);
    console.log(`  - Member 3 Key ID: ${signer3.getKeyId().substring(0, 16)}...`);

    // 2. Establish a Council State with a threshold of 2 (Quorum = 2/3)
    const councilState: CouncilState = {
        threshold: 2,
        effectiveTimestamp: new Date().toISOString(),
        members: [
            { id: signer1.getKeyId(), publicKey: signer1.getPublicKeyPem() },
            { id: signer2.getKeyId(), publicKey: signer2.getPublicKeyPem() },
            { id: signer3.getKeyId(), publicKey: signer3.getPublicKeyPem() }
        ]
    };
    console.log(`[HSM-TEST] Council State established. Active Members: 3, Signature Quorum Threshold: 2.`);

    // 3. Construct a standard ZTAN Governance Receipt proposal
    const prevGRoot = crypto.createHash('sha256').update('epoch_102_root').digest('hex');
    const dummyReceipt: Omit<GovernanceReceipt, 'signatures'> = {
        action: 'THRESHOLD_UPDATE',
        newThreshold: 3,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Upgrading witness signature threshold to enforce higher adversarial resistance.',
        sequenceNumber: 1024,
        epochId: 103,
        previousGRoot: prevGRoot,
        gRoot: crypto.createHash('sha256').update('epoch_103_root').digest('hex')
    };

    const payload = governanceSignablePayload(dummyReceipt as any);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    console.log("[HSM-TEST] Generated signable canonical governance payload.");

    // 4. Perform Multi-Sig HSM Signing Ceremony (Member 1 & Member 2 sign)
    console.log("[HSM-TEST] Council Member 1 invoking Remote KMS sign ceremony...");
    const sig1 = await signer1.sign(payloadBuffer);
    console.log("[HSM-TEST] Council Member 2 invoking Remote KMS sign ceremony...");
    const sig2 = await signer2.sign(payloadBuffer);

    const receipt: GovernanceReceipt = {
        ...dummyReceipt,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: sig1 },
            { signerKeyId: signer2.getKeyId(), signature: sig2 }
        ]
    };

    // 5. Execute Multi-Sig Verification
    console.log("[HSM-TEST] Propagating signed governance receipt to validation pipeline...");
    const verificationResult1 = verifyGovernanceReceiptMultiSig(receipt, councilState);
    console.log(`  - Verification Outcome: ${verificationResult1.valid ? "✅ VALID" : "❌ INVALID"}`);
    console.log(`  - Valid Signatures: ${verificationResult1.validSignerIds.length}/${councilState.threshold}`);
    if (verificationResult1.errors.length > 0) {
        console.error("  - Errors encountered:", verificationResult1.errors);
    }

    if (!verificationResult1.valid) {
        console.error("[FAIL] Multi-Signature Verification failed on a legitimate quorum receipt!");
        process.exit(1);
    }

    // 6. Test sub-quorum (Only 1 signature)
    console.log("\n[HSM-TEST] Testing sub-quorum validation scenario (Only 1 signature attached)...");
    const subQuorumReceipt: GovernanceReceipt = {
        ...receipt,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: sig1 }
        ]
    };
    const verificationResult2 = verifyGovernanceReceiptMultiSig(subQuorumReceipt, councilState);
    console.log(`  - Verification Outcome: ${verificationResult2.valid ? "✅ VALID" : "❌ INVALID (Expected)"}`);
    if (verificationResult2.valid) {
        console.error("[FAIL] Multi-Sig passed but threshold was not met!");
        process.exit(1);
    } else {
        console.log("  - Verification successfully rejected the receipt as expected. Errors:");
        verificationResult2.errors.forEach(e => console.log(`    * ${e}`));
    }

    // 7. Test payload tampering/modification
    console.log("\n[HSM-TEST] Testing payload tampering detection...");
    const tamperedReceipt: GovernanceReceipt = {
        ...receipt,
        reason: 'Tampered reason statement bypass validation!'
    };
    const verificationResult3 = verifyGovernanceReceiptMultiSig(tamperedReceipt, councilState);
    console.log(`  - Verification Outcome: ${verificationResult3.valid ? "✅ VALID" : "❌ INVALID (Expected)"}`);
    if (verificationResult3.valid) {
        console.error("[FAIL] Tampered receipt was successfully verified! Signature payload verification failed to detect mutation.");
        process.exit(1);
    } else {
        console.log("  - Tampering was successfully detected. Errors:");
        verificationResult3.errors.forEach(e => console.log(`    * ${e}`));
    }

    // 8. Test malicious/unauthorized signer insertion
    console.log("\n[HSM-TEST] Testing unauthorized non-council signer insertion...");
    const unassociatedArn = "arn:aws:kms:us-east-1:999988887777:key/malicious-operator-kms";
    const unauthorizedSigner = new KmsSigner(unassociatedArn);
    const sigUnauthorized = await unauthorizedSigner.sign(payloadBuffer);

    const unauthorizedReceipt: GovernanceReceipt = {
        ...receipt,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: sig1 },
            { signerKeyId: unauthorizedSigner.getKeyId(), signature: sigUnauthorized }
        ]
    };

    const verificationResult4 = verifyGovernanceReceiptMultiSig(unauthorizedReceipt, councilState);
    console.log(`  - Verification Outcome: ${verificationResult4.valid ? "✅ VALID" : "❌ INVALID (Expected)"}`);
    if (verificationResult4.valid) {
        console.error("[FAIL] Quorum passed despite containing an unauthorized non-council signature!");
        process.exit(1);
    } else {
        console.log("  - Unauthorized signer was successfully blocked. Errors:");
        verificationResult4.errors.forEach(e => console.log(`    * ${e}`));
    }

    console.log("\n=========================================================================");
    console.log("✅ HSM Override Multi-Sig Verification Ceremonies PASSED.");
    console.log("=========================================================================");
}

runHsmCeremonyValidation().catch((err) => {
    console.error("[HSM-TEST] Fatal error executing HSM test:", err);
    process.exit(1);
});
