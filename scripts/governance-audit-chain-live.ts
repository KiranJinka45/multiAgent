/**
 * ════════════════════════════════════════════════════════════════════════════
 * Campaign 3: Governance Security & Audit Chain Integrity Validation
 * ════════════════════════════════════════════════════════════════════════════
 *
 * Phase 1: WitnessFederation Double-Proposal Rejection
 * Phase 2: Acyclic Guardian Constraint Enforcement
 * Phase 3: Core Clause 100% Ratification Block
 * Phase 4: Audit Chain Tamper Detection (Live DB)
 * Phase 5: Auth Middleware Privilege Escalation Block
 */

import crypto from 'crypto';
import type { Request, Response, NextFunction } from 'express';

// ─── WitnessFederation & Governance (Static, no DB needed) ──────────────────
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation.js';
import { KmsSigner } from '../packages/utils/src/transparency/signer.js';
import {
    governanceSignablePayload,
    type GovernanceReceipt,
    type WitnessMember,
} from '../packages/utils/src/transparency/governance.js';
import { DEFAULT_CONSTITUTION } from '../packages/utils/src/transparency/constitutional.js';
import { MerkleTree } from '../packages/utils/src/transparency/merkle.js';

// ─── Helpers ────────────────────────────────────────────────────────────────

async function signReceipt(
    receiptOmit: Omit<GovernanceReceipt, 'signatures'>,
    signers: KmsSigner[]
): Promise<GovernanceReceipt> {
    const payload = governanceSignablePayload(receiptOmit as any);
    const payloadBuffer = Buffer.from(payload, 'utf8');
    const signatures = [];
    for (const signer of signers) {
        const signature = await signer.sign(payloadBuffer);
        signatures.push({
            signerKeyId: signer.getKeyId(),
            signature,
        });
    }
    return {
        ...receiptOmit,
        signatures,
    } as GovernanceReceipt;
}

function banner(text: string) {
    console.log(`\n${'═'.repeat(68)}`);
    console.log(`  ${text}`);
    console.log(`${'═'.repeat(68)}`);
}

// ─── Phase 1: Double-Proposal Rejection ─────────────────────────────────────

async function phase1(
    signer1: KmsSigner,
    signer2: KmsSigner,
    witnesses: WitnessMember[]
) {
    console.log('\n--- Phase 1/5: WitnessFederation Double-Proposal Rejection ---');

    const wf = new WitnessFederation(witnesses, 2);

    // First proposal (should succeed)
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
    if (res1 !== null) throw new Error(`❌ Proposal 1 failed unexpectedly: ${res1}`);

    // Second proposal for same sequence (should be rejected by state machine)
    const proposal2Omit = {
        action: 'GOVERNANCE_PROPOSAL' as const,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Duplicate Proposal for Sequence 0',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64),
    };
    const proposal2 = await signReceipt(proposal2Omit, [signer1, signer2]);

    let doubleError: string | null = null;
    try {
        doubleError = await wf.applyAction(proposal2);
    } catch (e: any) {
        doubleError = e.message;
    }

    console.log('   Proposal 2 (duplicate) result:', doubleError);
    if (doubleError && doubleError.includes('Illegal State Jump')) {
        console.log('   ✅ PASSED: Double proposal correctly blocked by state machine.');
    } else {
        throw new Error('❌ Double Proposal was NOT rejected correctly.');
    }
}

// ─── Phase 2: Acyclic Guardian Constraint ───────────────────────────────────

async function phase2(
    signer1: KmsSigner,
    signer2: KmsSigner,
    witnesses: WitnessMember[]
) {
    console.log('\n--- Phase 2/5: Acyclic Guardian Constraint Enforcement ---');

    const wf = new WitnessFederation(witnesses, 2);

    // Attempt self-referential registration (active member as guardian)
    const selfRegOmit = {
        action: 'GUARDIAN_REGISTER' as const,
        targetWitnessId: signer1.getKeyId(),
        targetWitnessConfig: {
            publicKey: signer1.getPublicKeyPem(),
            url: 'http://localhost:8081',
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Self-referential guardian registration',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64),
    };
    const selfReg = await signReceipt(selfRegOmit, [signer1, signer2]);
    const resSelf = await wf.applyAction(selfReg);
    console.log('   Self-referential result:', resSelf);
    if (resSelf && resSelf.includes('Acyclic Sovereignty Constraint')) {
        console.log('   ✅ PASSED: Self-referential guardian registration blocked.');
    } else {
        throw new Error('❌ Self-referential guardian registration was NOT blocked.');
    }

    // Attempt circular dependency registration
    const wf2 = new WitnessFederation(witnesses, 2);
    const circularOmit = {
        action: 'GUARDIAN_REGISTER' as const,
        targetWitnessId: 'remote-inst-999',
        targetWitnessConfig: {
            publicKey: signer1.getPublicKeyPem(),
            url: 'http://localhost:8084',
        },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'CIRCULAR_DEPENDENCY path detected',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot: '0'.repeat(64),
        gRoot: '0'.repeat(64),
    };
    const circular = await signReceipt(circularOmit, [signer1, signer2]);
    const resCirc = await wf2.applyAction(circular);
    console.log('   Circular dependency result:', resCirc);
    if (resCirc && resCirc.includes('Recursive recovery loop detected')) {
        console.log('   ✅ PASSED: Circular dependency guardian registration blocked.');
    } else {
        throw new Error('❌ Circular dependency guardian registration was NOT blocked.');
    }
}

// ─── Phase 3: Core Clause 100% Ratification Block ──────────────────────────

async function phase3(
    signer1: KmsSigner,
    signer2: KmsSigner,
    _signer3: KmsSigner,
    witnesses: WitnessMember[]
) {
    console.log('\n--- Phase 3/5: Core Clause 100% Ratification Block ---');

    const wf = new WitnessFederation(witnesses, 2);

    // Modify a core clause (recoveryChallengeWindowMs) with only 2/3 signatures
    const newConstitution = {
        ...DEFAULT_CONSTITUTION,
        recoveryChallengeWindowMs: 12 * 60 * 60 * 1000, // Modified from 24h → 12h
    };

    const previousGRoot = wf.getSovereignSnapshot().governanceRoot;
    const migrateOmitPreHash = {
        action: 'CONSTITUTIONAL_MIGRATE' as const,
        newConstitution,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Attempt core clause migration with 2/3 sigs',
        sequenceNumber: 0,
        epochId: 0,
        previousGRoot,
        gRoot: '0'.repeat(64),
    };

    // Compute the correct gRoot
    const payload = governanceSignablePayload(migrateOmitPreHash as any);
    const leafHash = MerkleTree.hashLeaf(payload);
    const tempTree = new MerkleTree();
    tempTree.append(leafHash);
    const gRoot = tempTree.getRoot();

    const migrateOmit = { ...migrateOmitPreHash, gRoot };
    // Sign with only 2/3 witnesses (insufficient for core clause)
    const migrateReceipt = await signReceipt(migrateOmit, [signer1, signer2]);

    let migrateError: string | null = null;
    try {
        migrateError = await wf.applyAction(migrateReceipt);
    } catch (e: any) {
        migrateError = e.message;
    }

    console.log('   Core clause migrate (2/3 sigs) result:', migrateError);
    if (
        migrateError &&
        migrateError.includes('Core Clause migration requires 100% witness ratification')
    ) {
        console.log('   ✅ PASSED: Core clause modification without 100% ratification blocked.');
    } else {
        throw new Error('❌ Core clause migration with <100% ratification was NOT blocked.');
    }
}

// ─── Phase 4: Audit Chain Tamper Detection (Live DB) ────────────────────────

async function phase4() {
    console.log('\n--- Phase 4/5: Audit Chain Tamper Detection (Live DB) ---');

    // Dynamic import to defer PrismaClient construction until DATABASE_URL is set
    const { AuditLogger } = await import('../packages/utils/src/audit.js');
    const { db } = await import('../packages/db/src/index.js');

    const tenantId = 'tenant-drill-campaign3';

    // Clean any prior test data
    await db.auditLog.deleteMany({ where: { tenantId } });

    // Seed 5 chained audit log entries
    console.log('   Seeding 5 chained audit log entries...');
    for (let i = 0; i < 5; i++) {
        await AuditLogger.log({
            action: `DRILL_ACTION_${i}`,
            resource: `resource-${i}`,
            userId: 'drill-user',
            tenantId,
            status: 'SUCCESS',
            metadata: { drillPhase: 4, index: i },
        });
    }
    console.log('   ✅ 5-entry hash chain seeded.');

    // Baseline verification (should be valid)
    console.log('   Running baseline chain verification...');
    const baseline = await AuditLogger.verifyChain(tenantId);
    console.log(`   Baseline: valid=${baseline.valid}`);
    if (!baseline.valid) {
        throw new Error('❌ Baseline chain verification FAILED — seeding is broken.');
    }
    console.log('   ✅ Baseline hash chain valid.');

    // Tamper with entry #3 (the middle entry)
    const allLogs = await db.auditLog.findMany({
        where: { tenantId },
        orderBy: { createdAt: 'asc' },
    });

    if (allLogs.length < 5) {
        throw new Error('❌ Expected 5 seeded entries but found ' + allLogs.length);
    }

    const targetEntry = allLogs[2]; // 0-indexed: entry #3
    console.log(`   Tampering with entry ID=${targetEntry.id} (action: ${targetEntry.action})...`);

    // Direct DB mutation — bypasses application layer hash chaining
    await db.auditLog.update({
        where: { id: targetEntry.id },
        data: { action: 'TAMPERED_BY_ADVERSARY' },
    });

    // Post-tamper verification (should detect the break)
    console.log('   Running post-tamper chain verification...');
    const tampered = await AuditLogger.verifyChain(tenantId);
    console.log(`   Post-tamper: valid=${tampered.valid}, brokenAtId=${tampered.brokenAtId}`);

    if (!tampered.valid && tampered.brokenAtId === targetEntry.id) {
        console.log(`   ✅ PASSED: Tamper detected at exact entry ID=${targetEntry.id}.`);
    } else {
        // Restore before throwing
        await db.auditLog.update({
            where: { id: targetEntry.id },
            data: { action: targetEntry.action },
        });
        throw new Error('❌ Tamper was NOT detected correctly.');
    }

    // Restore entry and clean up
    await db.auditLog.update({
        where: { id: targetEntry.id },
        data: { action: targetEntry.action },
    });
    await db.auditLog.deleteMany({ where: { tenantId } });
    console.log('   ✅ Tampered entry restored and test data cleaned up.');
}

// ─── Phase 5: Auth Middleware Privilege Escalation Block ─────────────────────

async function phase5() {
    console.log('\n--- Phase 5/5: Auth Middleware Privilege Escalation Block ---');

    const { userAuth } = await import('../packages/auth-internal/src/index.js');
    const { serviceAuth } = await import('../packages/resilience/src/serviceAuth.js');

    const mockReq = (headers: any, cookies?: any) =>
        ({ headers, cookies } as unknown as Request);

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

    const failNext = () => {
        throw new Error('next() should NOT have been called');
    };

    // Test 1: userAuth — missing token
    const uAuth = userAuth();
    const res1 = mockRes();
    uAuth(mockReq({}), res1, failNext);
    console.log(`   userAuth (missing token): ${res1.statusCode}`);
    if (res1.statusCode !== 401) throw new Error('❌ userAuth did NOT reject missing token.');
    console.log('   ✅ PASSED: Missing token rejected with 401.');

    // Test 2: userAuth — invalid token
    const res2 = mockRes();
    uAuth(mockReq({ authorization: 'Bearer clearly-invalid-jwt-token' }), res2, failNext);
    console.log(`   userAuth (invalid token): ${res2.statusCode}`);
    if (res2.statusCode !== 401) throw new Error('❌ userAuth did NOT reject invalid token.');
    console.log('   ✅ PASSED: Invalid token rejected with 401.');

    // Test 3: serviceAuth — missing service token
    const sAuth = serviceAuth(['api-gateway']);
    const res3 = mockRes();
    sAuth(mockReq({}), res3, failNext);
    console.log(`   serviceAuth (missing token): ${res3.statusCode}`);
    if (res3.statusCode !== 401)
        throw new Error('❌ serviceAuth did NOT reject missing token.');
    console.log('   ✅ PASSED: Missing service token rejected with 401.');

    // Test 4: serviceAuth — invalid service token
    const res4 = mockRes();
    sAuth(
        mockReq({ authorization: 'Bearer invalid-service-jwt' }),
        res4,
        failNext
    );
    console.log(`   serviceAuth (invalid token): ${res4.statusCode}`);
    if (res4.statusCode !== 403)
        throw new Error('❌ serviceAuth did NOT reject invalid token with 403.');
    console.log('   ✅ PASSED: Invalid service token rejected with 403.');
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    // Set DATABASE_URL for the resilience Postgres container
    process.env.DATABASE_URL =
        'postgresql://postgres:password@localhost:54399/multiagent?schema=public';

    banner(
        '🛡️ CAMPAIGN 3: GOVERNANCE SECURITY & AUDIT CHAIN INTEGRITY DRILL'
    );

    // Initialize KMS signers
    const signer1 = new KmsSigner(
        'arn:aws:kms:us-east-1:111122223333:key/council-1'
    );
    const signer2 = new KmsSigner(
        'arn:aws:kms:us-east-1:111122223333:key/council-2'
    );
    const signer3 = new KmsSigner(
        'arn:aws:kms:us-east-1:111122223333:key/council-3'
    );

    const witnesses: WitnessMember[] = [
        {
            id: signer1.getKeyId(),
            publicKey: signer1.getPublicKeyPem(),
            url: 'http://localhost:8081',
        },
        {
            id: signer2.getKeyId(),
            publicKey: signer2.getPublicKeyPem(),
            url: 'http://localhost:8082',
        },
        {
            id: signer3.getKeyId(),
            publicKey: signer3.getPublicKeyPem(),
            url: 'http://localhost:8083',
        },
    ];

    console.log('[Prep] Initialized 3 KMS signers and witness federation.');

    // Execute all 5 phases
    await phase1(signer1, signer2, witnesses);
    await phase2(signer1, signer2, witnesses);
    await phase3(signer1, signer2, signer3, witnesses);
    await phase4();
    await phase5();

    banner('🏁 DRILL FINISHED. Verdict: PASSED');
}

main().catch((err) => {
    console.error('\n❌ Campaign 3 FAILED:', err.message || err);
    process.exit(1);
});
