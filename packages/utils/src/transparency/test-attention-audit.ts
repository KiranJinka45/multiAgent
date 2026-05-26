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
import { ProofOfAttentionEngine } from './attention-audit.js';

async function runAttentionAuditValidation() {
    console.log("=========================================================================");
    console.log("      ZTAN Game-Theoretic Proof-of-Attention Verification Suite          ");
    console.log("=========================================================================");

    const attentionDir = path.join(process.cwd(), '.ztan-transparency', 'attention');
    if (fs.existsSync(attentionDir)) {
        fs.rmSync(attentionDir, { recursive: true, force: true });
        console.log("[TEST] Purged legacy attention registry to ensure a clean validation run.");
    }

    const kmsDir = path.join(process.cwd(), '.ztan-transparency', 'kms');
    if (fs.existsSync(kmsDir)) {
        fs.rmSync(kmsDir, { recursive: true, force: true });
    }

    // 1. Instantiate 3 simulated HSM/KMS Council Members
    const arn1 = "arn:aws:kms:us-east-1:111122223333:key/council-01";
    const arn2 = "arn:aws:kms:us-east-1:111122223333:key/council-02";
    const arn3 = "arn:aws:kms:us-east-1:111122223333:key/council-03";

    const signer1 = new KmsSigner(arn1);
    const signer2 = new KmsSigner(arn2);
    const signer3 = new KmsSigner(arn3);

    const baseCouncil: CouncilState = {
        threshold: 2,
        effectiveTimestamp: new Date().toISOString(),
        members: [
            { id: signer1.getKeyId(), publicKey: signer1.getPublicKeyPem() },
            { id: signer2.getKeyId(), publicKey: signer2.getPublicKeyPem() },
            { id: signer3.getKeyId(), publicKey: signer3.getPublicKeyPem() }
        ]
    };

    const engine = new ProofOfAttentionEngine();
    console.log("[TEST] Provisioned 3 HSM keys and initialized ProofOfAttentionEngine.");

    // -------------------------------------------------------------------------
    // SCENARIO 1: Nominal Ceremony (Standard flow, no anomalies)
    // -------------------------------------------------------------------------
    console.log("\n[SCENARIO 1] Executing Nominal Multi-Sig Ceremony...");
    const dummyReceipt: Omit<GovernanceReceipt, 'signatures'> = {
        action: 'THRESHOLD_UPDATE',
        newThreshold: 3,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Normal operational maintenance ceremony.',
        sequenceNumber: 200,
        epochId: 10,
        previousGRoot: crypto.createHash('sha256').update('prev_root_1').digest('hex'),
        gRoot: crypto.createHash('sha256').update('new_root_1').digest('hex')
    };

    let payload = governanceSignablePayload(dummyReceipt as any);
    let sig1 = await signer1.sign(Buffer.from(payload, 'utf8'));
    let sig2 = await signer2.sign(Buffer.from(payload, 'utf8'));

    let nominalReceipt: GovernanceReceipt = {
        ...dummyReceipt,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: sig1 },
            { signerKeyId: signer2.getKeyId(), signature: sig2 }
        ]
    };

    let evalResult = engine.evaluateOperatorResponse(nominalReceipt, true);
    console.log(`  - Attention evaluation of nominal receipt: ${evalResult} (Expected: NOMINAL)`);
    if (evalResult !== 'NOMINAL') {
        console.error("[FAIL] Nominal receipt flagged as anomaly!");
        process.exit(1);
    }

    let verified = verifyGovernanceReceiptMultiSig(nominalReceipt, baseCouncil);
    console.log(`  - Multi-sig verification: ${verified.valid ? "✅ PASSED" : "❌ FAILED"}`);
    if (!verified.valid) {
        console.error("[FAIL] Legitimate multi-sig failed verification!");
        process.exit(1);
    }

    // -------------------------------------------------------------------------
    // SCENARIO 2: Vigilant Detection (Poison injected, Operator REJECTS it)
    // -------------------------------------------------------------------------
    console.log("\n[SCENARIO 2] Injecting 'HASH_MISMATCH' Poison Drill (Vigilant Operator Rejection)...");
    const poisonedReceiptDraft = engine.generatePoisonDrill(dummyReceipt, 'HASH_MISMATCH');
    
    // Simulate vigilant operator reviewing the payload, noticing the mutated previousGRoot,
    // and choosing to quarantine/reject the proposal (submitting approved = false).
    let poisonReceiptForRejection: GovernanceReceipt = {
        ...poisonedReceiptDraft,
        signatures: [] // No signatures collected since it was rejected immediately
    };

    let evalResult2 = engine.evaluateOperatorResponse(poisonReceiptForRejection, false);
    console.log(`  - Attention evaluation of rejected poison: ${evalResult2} (Expected: PASSED)`);
    if (evalResult2 !== 'PASSED') {
        console.error("[FAIL] Rejection of poison drill was not logged as a success!");
        process.exit(1);
    }
    
    // Confirm key authority was NOT degraded
    if (engine.isKeyDegraded(signer1.getKeyId())) {
        console.error("[FAIL] Key degraded despite vigilant behavior!");
        process.exit(1);
    }
    console.log("  - ✅ Success: Vigilant behavior correctly rewarded, key weight remains active.");

    // -------------------------------------------------------------------------
    // SCENARIO 3: Blind Approval Failure (Poison injected, Operator APPROVES it)
    // -------------------------------------------------------------------------
    console.log("\n[SCENARIO 3] Injecting 'SIGNATURE_FORGERY' Poison Drill (Blind Operator Approval)...");
    const poisonReceiptDraft2 = engine.generatePoisonDrill(dummyReceipt, 'SIGNATURE_FORGERY');

    // Blind operator signs this poisoned proposal anyway!
    const poisonPayload = governanceSignablePayload(poisonReceiptDraft2 as any);
    const poisonSig1 = await signer1.sign(Buffer.from(poisonPayload, 'utf8'));
    const poisonSig2 = await signer2.sign(Buffer.from(poisonPayload, 'utf8'));

    const blindApprovedReceipt: GovernanceReceipt = {
        ...poisonReceiptDraft2,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: poisonSig1 },
            { signerKeyId: signer2.getKeyId(), signature: poisonSig2 }
        ]
    };

    // Operator submits approval (approved = true)
    let evalResult3 = engine.evaluateOperatorResponse(blindApprovedReceipt, true);
    console.log(`  - Attention evaluation of blind approved poison: ${evalResult3} (Expected: FAILED)`);
    if (evalResult3 !== 'FAILED') {
        console.error("[FAIL] Blind approval of poisoned payload did not trigger a fail status!");
        process.exit(1);
    }

    // Assert keys are degraded to 0 weight
    const isDegraded1 = engine.isKeyDegraded(signer1.getKeyId());
    const isDegraded2 = engine.isKeyDegraded(signer2.getKeyId());
    console.log(`  - Member 1 degraded? ${isDegraded1 ? "⚠️ YES" : "NO"}`);
    console.log(`  - Member 2 degraded? ${isDegraded2 ? "⚠️ YES" : "NO"}`);
    
    if (!isDegraded1 || !isDegraded2) {
        console.error("[FAIL] Degraded keys were not recorded in registry!");
        process.exit(1);
    }

    // Filter council state to remove degraded keys
    const filteredCouncil = engine.filterActiveCouncil(baseCouncil);
    console.log(`  - Base Council active members: ${baseCouncil.members.length}`);
    console.log(`  - Filtered Council active members: ${filteredCouncil.members.length} (Degraded keys stripped!)`);
    if (filteredCouncil.members.length !== 1) {
        console.error("[FAIL] Degraded keys were not stripped from the active council list!");
        process.exit(1);
    }

    // Attempt to verify a new nominal proposal using the degraded council
    console.log("\n[TEST] Verifying block commitment attempt with degraded council...");
    const verifyAttempt = verifyGovernanceReceiptMultiSig(nominalReceipt, filteredCouncil);
    console.log(`  - Multi-sig validation outcome: ${verifyAttempt.valid ? "✅ VALID" : "❌ INVALID (Expected)"}`);
    if (verifyAttempt.valid) {
        console.error("[FAIL] Verification passed despite degraded council state lacking quorum!");
        process.exit(1);
    } else {
        console.log("  - ✅ Success: Ledger commit successfully blocked because degraded keys have 0 weight. Errors:");
        verifyAttempt.errors.forEach(e => console.log(`    * ${e}`));
    }

    // -------------------------------------------------------------------------
    // SCENARIO 4: Proof-of-Attention Alignment Ceremony
    // -------------------------------------------------------------------------
    console.log("\n[SCENARIO 4] Triggering Interactive Proof-of-Attention Alignment Ceremony...");
    
    // Member 1 attempts alignment
    const puzzles = engine.generateAlignmentPuzzles(signer1.getKeyId());
    console.log(`  - Alignment puzzles retrieved for Member 1: ${puzzles.length} items`);

    // Expected answers matching puzzle properties
    const expectedAnswers = puzzles.map(p => p.isNominal);
    
    // Operator submits correct sequence
    const resolved = engine.verifyAlignmentResolution(signer1.getKeyId(), expectedAnswers, expectedAnswers);
    console.log(`  - Alignment ceremony resolve attempt: ${resolved ? "✅ RESTORED" : "❌ FAILED"}`);
    if (!resolved) {
        console.error("[FAIL] Alignment ceremony failed with correct sequence!");
        process.exit(1);
    }

    // Verify Member 1 weight is restored to 1 (active), while Member 2 remains degraded
    const finalCouncil = engine.filterActiveCouncil(baseCouncil);
    console.log(`  - Council state after Member 1 alignment: ${finalCouncil.members.length} active members.`);
    if (finalCouncil.members.length !== 2) {
        console.error("[FAIL] Member 1 key was not successfully restored!");
        process.exit(1);
    }

    // Re-verify a new nominal receipt using the newly restored council quorum (needs 2 signatures from active members: signer1 and signer3)
    let restoredPayload = governanceSignablePayload(nominalReceipt);
    let restoredSig1 = await signer1.sign(Buffer.from(restoredPayload, 'utf8'));
    let restoredSig3 = await signer3.sign(Buffer.from(restoredPayload, 'utf8'));

    let restoredNominalReceipt: GovernanceReceipt = {
        ...nominalReceipt,
        signatures: [
            { signerKeyId: signer1.getKeyId(), signature: restoredSig1 },
            { signerKeyId: signer3.getKeyId(), signature: restoredSig3 }
        ]
    };

    const finalVerify = verifyGovernanceReceiptMultiSig(restoredNominalReceipt, finalCouncil);
    console.log(`  - Final Multi-sig verification outcome: ${finalVerify.valid ? "✅ VALID (RESTORED!)" : "❌ INVALID"}`);
    if (!finalVerify.valid) {
        console.error("[FAIL] Restored council failed to verify nominal receipt quorum!");
        process.exit(1);
    }

    console.log("\n=========================================================================");
    console.log("✅ ZTAN Game-Theoretic Proof-of-Attention Audits PASSED.");
    console.log("=========================================================================");
}

runAttentionAuditValidation().catch((err) => {
    console.error("[FAIL] Fatal error executing Attention Audit test:", err);
    process.exit(1);
});
