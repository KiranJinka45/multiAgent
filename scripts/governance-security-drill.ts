import crypto from 'crypto';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation.js';
import { KmsSigner } from '../packages/utils/src/transparency/signer.js';
import {
    verifyGovernanceReceiptMultiSig,
    governanceSignablePayload,
    type GovernanceReceipt,
    type WitnessMember
} from '../packages/utils/src/transparency/governance.js';
import { DEFAULT_CONSTITUTION } from '../packages/utils/src/transparency/constitutional.js';
import { MerkleTree } from '../packages/utils/src/transparency/merkle.js';
import { AuditLogger } from '../packages/utils/src/audit.js';
import { db } from '../packages/db/src/index.js';
import { userAuth } from '../packages/auth-internal/src/index.js';
import { serviceAuth } from '../packages/resilience/src/serviceAuth.js';
import type { Request, Response } from 'express';

async function signReceipt(receiptOmit: Omit<GovernanceReceipt, 'signatures'>, signers: KmsSigner[]): Promise<GovernanceReceipt> {
    const payload = governanceSignablePayload(receiptOmit as any);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const signatures = [];
    for (const signer of signers) {
        const signature = await signer.sign(payloadBuffer);
        signatures.push({
            signerKeyId: signer.getKeyId(),
            signature
        });
    }
    return {
        ...receiptOmit,
        signatures
    } as GovernanceReceipt;
}

async function runGovernanceSecurityDrill() {
    console.log('🛡️ Starting Governance Security & Policy Enforcement Drills...');

    const signer1 = new KmsSigner("arn:aws:kms:us-east-1:111122223333:key/council-1");
    const signer2 = new KmsSigner("arn:aws:kms:us-east-1:111122223333:key/council-2");
    const signer3 = new KmsSigner("arn:aws:kms:us-east-1:111122223333:key/council-3");

    const witnesses: WitnessMember[] = [
        { id: signer1.getKeyId(), publicKey: signer1.getPublicKeyPem(), url: 'http://localhost:8081' },
        { id: signer2.getKeyId(), publicKey: signer2.getPublicKeyPem(), url: 'http://localhost:8082' },
        { id: signer3.getKeyId(), publicKey: signer3.getPublicKeyPem(), url: 'http://localhost:8083' }
    ];

    // =========================================================================
    // 1. Submit double-proposal for same sequence (Rule 3.1)
    // =========================================================================
    console.log('\n--- [DRILL 1/5] Double Proposal Rejection (Rule 3.1) ---');
    const wf = new WitnessFederation(witnesses, 2);
    
    const proposal1Omit = {
        action: 'GOVERNANCE_PROPOSAL' as const,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'First Proposal for Sequence 0',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64),
    };
    const proposal1 = await signReceipt(proposal1Omit, [signer1, signer2]);
    const res1 = await wf.applyAction(proposal1);
    console.log('   Proposal 1 result:', res1 === null ? 'SUCCESS (Proposed)' : res1);
    if (res1 !== null) {
        throw new Error('❌ Proposal 1 failed unexpectedly: ' + res1);
    }

    const proposal2Omit = {
        action: 'GOVERNANCE_PROPOSAL' as const,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Second Proposal for Sequence 0',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64),
    };
    const proposal2 = await signReceipt(proposal2Omit, [signer1, signer2]);
    
    let doubleProposalError: string | null = null;
    try {
        doubleProposalError = await wf.applyAction(proposal2);
    } catch (e: any) {
        doubleProposalError = e.message;
    }
    console.log('   Proposal 2 result (Double proposal attempt):', doubleProposalError);
    if (doubleProposalError && doubleProposalError.includes('Illegal State Jump')) {
        console.log('   ✅ PASSED: Double proposal correctly blocked by Witness Federation.');
    } else {
        throw new Error('❌ Double Proposal was NOT rejected correctly.');
    }

    // =========================================================================
    // 2. Create circular guardian institutional dependency (Rule 4.3)
    // =========================================================================
    console.log('\n--- [DRILL 2/5] Circular Guardian Dependency Block (Rule 4.3) ---');
    const wf2 = new WitnessFederation(witnesses, 2);
    
    const guardian1Omit = {
        action: 'GUARDIAN_REGISTER' as const,
        targetWitnessId: signer1.getKeyId(),
        targetWitnessConfig: {
            publicKey: signer1.getPublicKeyPem(),
            url: 'http://localhost:8081'
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Self-referential guardian registration',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64)
    };
    const guardian1 = await signReceipt(guardian1Omit, [signer1, signer2]);
    const resGuardian1 = await wf2.applyAction(guardian1);
    console.log('   Self-referential registration result:', resGuardian1);
    if (resGuardian1 && resGuardian1.includes('SOVEREIGNTY_VIOLATION: Acyclic Sovereignty Constraint')) {
        console.log('   ✅ PASSED: Self-referential guardian registration blocked.');
    } else {
        throw new Error('❌ Self-referential guardian registration was NOT blocked.');
    }

    const guardian2Omit = {
        action: 'GUARDIAN_REGISTER' as const,
        targetWitnessId: 'remote-inst-999',
        targetWitnessConfig: {
            publicKey: signer3.getPublicKeyPem(),
            url: 'http://localhost:8084'
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'CIRCULAR_DEPENDENCY path detected',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64)
    };
    const guardian2 = await signReceipt(guardian2Omit, [signer1, signer2]);
    const resGuardian2 = await wf2.applyAction(guardian2);
    console.log('   Circular dependency path registration result:', resGuardian2);
    if (resGuardian2 && resGuardian2.includes('Recursive recovery loop detected')) {
        console.log('   ✅ PASSED: Circular dependency loop registration blocked.');
    } else {
        throw new Error('❌ Circular dependency loop registration was NOT blocked.');
    }

    // =========================================================================
    // 3. Modify Core Clause with <100% ratification (Rule 5.1)
    // =========================================================================
    console.log('\n--- [DRILL 3/5] Modify Core Clause with <100% Ratification (Rule 5.1) ---');
    const wf3 = new WitnessFederation(witnesses, 2);
    const newConstitution = {
        ...DEFAULT_CONSTITUTION,
        recoveryChallengeWindowMs: 12 * 60 * 60 * 1000 // modified from default 24h
    };
    const previousGRoot = wf3.getSovereignSnapshot().governanceRoot;
    const migrateOmitForPayload = {
        action: 'CONSTITUTIONAL_MIGRATE' as const,
        newConstitution,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Attempt core clause migration',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot,
        gRoot: '0'.repeat(64)
    };
    const payload = governanceSignablePayload(migrateOmitForPayload as any);
    const leafHash = MerkleTree.hashLeaf(payload);
    const tempTree = new MerkleTree();
    tempTree.append(leafHash);
    const gRoot = tempTree.getRoot();

    const migrateOmit = {
        ...migrateOmitForPayload,
        gRoot
    };
    // Sign with 2 out of 3 witnesses (<100% ratification)
    const migrateReceipt = await signReceipt(migrateOmit, [signer1, signer2]);
    const resMigrate = await wf3.applyAction(migrateReceipt);
    console.log('   Migrate with 2/3 signatures result:', resMigrate);
    if (resMigrate && resMigrate.includes('CONSTITUTIONAL_VIOLATION: Core Clause migration requires 100% witness ratification.')) {
        console.log('   ✅ PASSED: Core clause modification without 100% witness ratification blocked.');
    } else {
        throw new Error('❌ Core Clause migration with <100% ratification was NOT blocked.');
    }

    // =========================================================================
    // 4. Governance bypass via direct database mutation
    // =========================================================================
    console.log('\n--- [DRILL 4/5] Governance Bypass Detection (Direct DB Mutation) ---');
    const tenantId = 'tenant-alice-001';
    const logs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' }
    });
    if (logs.length < 3) {
        throw new Error('❌ Drill aborted: Not enough logs. Please run bootstrap first.');
    }

    const target = logs[2];
    console.log(`   Bypassing API: Mutating Database directly for Log ID: ${target.id}...`);
    await db.auditLog.update({
        where: { id: target.id },
        data: { action: 'BYPASS_MUTATION' }
    });

    const verifyResult = await AuditLogger.verifyChain(tenantId);
    console.log('   Chain validation result after mutation:', verifyResult);
    if (!verifyResult.valid && verifyResult.brokenAtId === target.id) {
        console.log('   ✅ PASSED: Direct database bypass successfully detected by Auditor Federation.');
    } else {
        // Restore before throwing
        await db.auditLog.update({
            where: { id: target.id },
            data: { action: target.action }
        });
        throw new Error('❌ Direct database bypass was NOT detected.');
    }

    await db.auditLog.update({
        where: { id: target.id },
        data: { action: target.action }
    });
    console.log('   Database state restored.');

    // =========================================================================
    // 5. Unauthorized privilege escalation in auth-service
    // =========================================================================
    console.log('\n--- [DRILL 5/5] Unauthorized Privilege Escalation Block ---');
    const mockReq = (headers: any, cookies?: any) => ({
        headers,
        cookies
    } as unknown as Request);

    const mockRes = () => {
        const res: any = {};
        res.statusCode = 200;
        res.status = (code: number) => {
            res.statusCode = code;
            return res;
        };
        res.sendStatus = (code: number) => {
            res.statusCode = code;
            return res;
        };
        res.json = (obj: any) => {
            res.body = obj;
            return res;
        };
        return res;
    };

    const uAuth = userAuth();
    const resUserFail = mockRes();
    const nextUser = () => { throw new Error('userAuth should have failed'); };

    uAuth(mockReq({}), resUserFail, nextUser);
    console.log('   userAuth with missing token response:', resUserFail.statusCode);
    if (resUserFail.statusCode === 401) {
        console.log('   ✅ PASSED: userAuth correctly rejected request with missing token (401).');
    } else {
        throw new Error('❌ userAuth did NOT reject missing token with 401.');
    }

    const resUserInvalid = mockRes();
    uAuth(mockReq({ authorization: 'Bearer invalid-token' }), resUserInvalid, nextUser);
    console.log('   userAuth with invalid token response:', resUserInvalid.statusCode);
    if (resUserInvalid.statusCode === 401) {
        console.log('   ✅ PASSED: userAuth correctly rejected request with invalid token (401).');
    } else {
        throw new Error('❌ userAuth did NOT reject invalid token with 401.');
    }

    const sAuth = serviceAuth(['api-gateway']);
    const resServiceFail = mockRes();
    const nextService = () => { throw new Error('serviceAuth should have failed'); };

    sAuth(mockReq({}), resServiceFail, nextService);
    console.log('   serviceAuth with missing service token response:', resServiceFail.statusCode);
    if (resServiceFail.statusCode === 401) {
        console.log('   ✅ PASSED: serviceAuth correctly rejected request with missing token (401).');
    } else {
        throw new Error('❌ serviceAuth did NOT reject missing token with 401.');
    }

    const resServiceInvalid = mockRes();
    sAuth(mockReq({ authorization: 'Bearer invalid-service-token' }), resServiceInvalid, nextService);
    console.log('   serviceAuth with invalid service token response:', resServiceInvalid.statusCode);
    if (resServiceInvalid.statusCode === 403) {
        console.log('   ✅ PASSED: serviceAuth correctly rejected request with invalid token (403).');
    } else {
        throw new Error('❌ serviceAuth did NOT reject invalid token with 403.');
    }

    console.log('\n🏆 ALL GOVERNANCE SECURITY & POLICY ENFORCEMENT DRILLS PASSED.');
}

runGovernanceSecurityDrill().catch((err) => {
    console.error('❌ Drill failed with error:', err);
    process.exit(1);
});
