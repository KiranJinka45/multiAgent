import * as fs from 'fs';
import * as path from 'path';
import * as crypto from 'crypto';
import { MissionTraceRecorder } from '../packages/runtime-core/src/index';
import { IMissionEvent } from '../packages/runtime-core/src/contracts';
import { execSync } from 'child_process';

const recorder = MissionTraceRecorder.getInstance();
const missionId = 'FORENSIC_TEST_' + Date.now();
const traceDir = path.join(process.cwd(), '.ztan/trace');
const tracePath = path.join(traceDir, `${missionId}.trace.ndjson`);
const receiptPath = path.join(traceDir, `${missionId}.receipt.json`);

function canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') return JSON.stringify(obj);
    if (Array.isArray(obj)) return '[' + obj.map(item => canonicalize(item)).join(',') + ']';
    const keys = Object.keys(obj).sort();
    const parts = [];
    for (const key of keys) {
        const val = obj[key];
        if (val !== undefined) parts.push(JSON.stringify(key) + ':' + canonicalize(val));
    }
    return '{' + parts.join(',') + '}';
}

async function test() {
    console.log('[TEST] Starting forensic verification (Ed25519 + NDJSON)...');

    // 1. Record 3 events
    console.log('[TEST] Recording 3 events...');
    for (let i = 0; i < 3; i++) {
        const event: IMissionEvent = {
            id: `evt_${i}`,
            missionId,
            type: 'STEP',
            timestamp: new Date().toISOString(),
            payload: { index: i },
            previousHash: '',
            eventHash: '',
            metadata: { stepIndex: i, agentId: 'forensic_agent', reproducible: true }
        };
        await recorder.recordEvent(event);
    }

    // 2. Verify valid chain + Ed25519 signature
    console.log('[TEST] Verifying valid chain with Ed25519...');
    try {
        execSync(`npx tsx scripts/replay-verify.ts ${tracePath}`, { stdio: 'inherit' });
        console.log('  ✓ Valid chain with Ed25519 signature verified.');
    } catch (e) {
        throw new Error('Valid chain failed verification');
    }

    // 3. Tamper with middle event
    console.log('[TEST] Tampering with event index 1...');
    const lines = fs.readFileSync(tracePath, 'utf8').split('\n').filter(l => l.trim() !== '');
    const events = lines.map(l => JSON.parse(l));
    events[1].payload.index = 999;
    
    fs.writeFileSync(tracePath, events.map(e => canonicalize(e)).join('\n') + '\n');

    // Update receipt's tailHash to match the tampered array so that only the chain validation fails
    const receipt = JSON.parse(fs.readFileSync(receiptPath, 'utf8'));
    receipt.tailHash = events[events.length - 1].eventHash;
    fs.writeFileSync(receiptPath, JSON.stringify(receipt, null, 2));

    console.log('[TEST] Verifying tampered chain...');
    try {
        execSync(`npx tsx scripts/replay-verify.ts ${tracePath}`, { stdio: 'pipe' });
        throw new Error('Tampered chain PASSED verification (failure expected)');
    } catch (e: any) {
        const output = e.stdout.toString();
        if (output.includes('CHAIN_BREACH')) {
            console.log('  ✓ Tamper detected correctly via CHAIN_BREACH.');
        } else {
            console.error('Output:', output);
            throw new Error('Tamper detected but not as CHAIN_BREACH');
        }
    }

    // 4. Test wrong-key rejection
    console.log('[TEST] Verifying wrong-key rejection...');
    // Re-record fresh events for a clean chain
    const forgedMissionId = 'FORGED_TEST_' + Date.now();
    const forgedTracePath = path.join(traceDir, `${forgedMissionId}.trace.ndjson`);
    const forgedReceiptPath = path.join(traceDir, `${forgedMissionId}.receipt.json`);
    
    for (let i = 0; i < 2; i++) {
        const event: IMissionEvent = {
            id: `evt_forged_${i}`,
            missionId: forgedMissionId,
            type: 'STEP',
            timestamp: new Date().toISOString(),
            payload: { index: i },
            previousHash: '',
            eventHash: '',
            metadata: { stepIndex: i, agentId: 'forensic_agent', reproducible: true }
        };
        await recorder.recordEvent(event);
    }

    // Generate a different keypair and re-sign the receipt with it
    const wrongKeyPair = crypto.generateKeyPairSync('ed25519');
    const forgedReceipt = JSON.parse(fs.readFileSync(forgedReceiptPath, 'utf8'));
    const forgedSig = crypto.sign(null, Buffer.from(forgedReceipt.chainRoot, 'utf8'), wrongKeyPair.privateKey);
    forgedReceipt.governanceReceipt = forgedSig.toString('base64');
    
    // Keep the original signerKeyId so it triggers mismatch
    fs.writeFileSync(forgedReceiptPath, JSON.stringify(forgedReceipt, null, 2));

    try {
        execSync(`npx tsx scripts/replay-verify.ts ${forgedTracePath}`, { stdio: 'pipe' });
        throw new Error('Wrong-key signature PASSED verification (failure expected)');
    } catch (e: any) {
        const output = e.stdout.toString();
        if (output.includes('FAIL') && (output.includes('Authorship') || output.includes('signature') || output.includes('Ed25519') || output.includes('Signer key mismatch'))) {
            console.log('  ✓ Wrong-key signature rejected correctly.');
        } else {
            console.error('Output:', output);
            throw new Error('Wrong-key rejection not detected correctly');
        }
    }

    // 5. Verify key files exist
    console.log('[TEST] Verifying key file generation...');
    const keyDir = path.join(process.cwd(), '.ztan', 'keys');
    const privExists = fs.existsSync(path.join(keyDir, 'signing.key'));
    const pubExists = fs.existsSync(path.join(keyDir, 'verify.pub'));
    if (!privExists || !pubExists) {
        throw new Error('Key files not generated');
    }
    
    // Verify the public key is valid Ed25519
    const pubKey = crypto.createPublicKey(fs.readFileSync(path.join(keyDir, 'verify.pub'), 'utf8'));
    if (pubKey.asymmetricKeyType !== 'ed25519') {
        throw new Error(`Expected ed25519, got ${pubKey.asymmetricKeyType}`);
    }
    console.log('  ✓ Ed25519 keypair files verified.');

    // 6. Verify trace metadata contains Ed25519 fields
    console.log('[TEST] Verifying trace detached receipt format...');
    const freshReceipt = JSON.parse(fs.readFileSync(forgedReceiptPath, 'utf8'));
    if (freshReceipt.signatureAlgorithm !== 'ed25519') {
        throw new Error(`Expected signatureAlgorithm=ed25519, got ${freshReceipt.signatureAlgorithm}`);
    }
    if (!freshReceipt.signerKeyId || freshReceipt.signerKeyId.length !== 64) {
        throw new Error(`Invalid signerKeyId: ${freshReceipt.signerKeyId}`);
    }
    console.log('  ✓ Trace receipt contains Ed25519 fields (signatureAlgorithm, signerKeyId).');

    // 7. Verify PARTIAL_TAIL recovery
    console.log('[TEST] Verifying PARTIAL_TAIL recovery...');
    const partialMissionId = 'PARTIAL_TEST_' + Date.now();
    const partialTracePath = path.join(traceDir, `${partialMissionId}.trace.ndjson`);
    for (let i = 0; i < 2; i++) {
        const event: IMissionEvent = {
            id: `evt_partial_${i}`,
            missionId: partialMissionId,
            type: 'STEP',
            timestamp: new Date().toISOString(),
            payload: { index: i },
            previousHash: '',
            eventHash: '',
            metadata: { stepIndex: i, agentId: 'forensic_agent', reproducible: true }
        };
        await recorder.recordEvent(event);
    }
    // Append partial JSON
    const fd = fs.openSync(partialTracePath, 'a');
    fs.appendFileSync(fd, '{"id": "incomplete_tail_event", "type": "STEP"\n');
    fs.closeSync(fd);

    try {
        const out = execSync(`npx tsx scripts/replay-verify.ts ${partialTracePath}`, { stdio: 'pipe' }).toString();
        if (out.includes('PARTIAL_TAIL')) {
            console.log('  ✓ PARTIAL_TAIL gracefully recovered and flagged as WARNING.');
        } else {
            throw new Error('PARTIAL_TAIL not flagged');
        }
    } catch (e: any) {
        console.error('Output:', e.stdout?.toString() || e.message);
        throw new Error('PARTIAL_TAIL failed verification (should have passed with warning)');
    }

    // 8. Verify UNATTESTED_TAIL recovery
    console.log('[TEST] Verifying UNATTESTED_TAIL recovery...');
    const unattestedMissionId = 'UNATTESTED_TEST_' + Date.now();
    const unattestedTracePath = path.join(traceDir, `${unattestedMissionId}.trace.ndjson`);
    const unattestedReceiptPath = path.join(traceDir, `${unattestedMissionId}.receipt.json`);
    
    // Record 2 events
    for (let i = 0; i < 2; i++) {
        const event: IMissionEvent = {
            id: `evt_unat_${i}`,
            missionId: unattestedMissionId,
            type: 'STEP',
            timestamp: new Date().toISOString(),
            payload: { index: i },
            previousHash: '',
            eventHash: '',
            metadata: { stepIndex: i, agentId: 'forensic_agent', reproducible: true }
        };
        await recorder.recordEvent(event);
    }

    // Now artificially append a 3rd valid event WITHOUT updating the receipt
    const dataUnat = JSON.parse(fs.readFileSync(unattestedReceiptPath, 'utf8'));
    const oldTailHash = dataUnat.tailHash;
    const event3: IMissionEvent = {
        id: `evt_unat_2`,
        missionId: unattestedMissionId,
        type: 'STEP',
        timestamp: new Date().toISOString(),
        payload: { index: 2 },
        previousHash: oldTailHash,
        eventHash: '',
        metadata: { stepIndex: 2, agentId: 'forensic_agent', reproducible: true }
    };
    event3.eventHash = crypto.createHash('sha256').update(event3.previousHash + canonicalize({
        id: event3.id,
        type: event3.type,
        payload: event3.payload,
        timestamp: event3.timestamp
    })).digest('hex');
    
    const fdUnat = fs.openSync(unattestedTracePath, 'a');
    fs.appendFileSync(fdUnat, canonicalize(event3) + '\n');
    fs.closeSync(fdUnat);

    try {
        const out = execSync(`npx tsx scripts/replay-verify.ts ${unattestedTracePath}`, { stdio: 'pipe' }).toString();
        if (out.includes('UNATTESTED_TAIL')) {
            console.log('  ✓ UNATTESTED_TAIL gracefully recovered and flagged as WARNING.');
        } else {
            throw new Error('UNATTESTED_TAIL not flagged');
        }
    } catch (e: any) {
        console.error('Output:', e.stdout?.toString() || e.message);
        throw new Error('UNATTESTED_TAIL failed verification (should have passed with warning)');
    }

    // 9. Verify SEAL and immutability
    console.log('[TEST] Verifying SEAL and OS immutability...');
    await recorder.sealTrace();
    
    // Test write permission on the trace
    try {
        const fdSeal = fs.openSync(unattestedTracePath, 'a');
        fs.closeSync(fdSeal);
        
        // If we reach here, we need to manually chmod back so we don't pollute the dev environment,
        // though it's already a test file. But wait, on Windows, Administrator might still be able to open for append?
        // Let's check if the error is thrown.
        if (process.platform !== 'win32') {
             throw new Error('Trace file is still writable after SEAL');
        } else {
             // Windows sometimes allows append even if read-only, but let's test.
             // Actually, opening with 'a' on a read-only file throws EPERM on Windows.
             throw new Error('Trace file is still writable after SEAL');
        }
    } catch (e: any) {
        if (e.code === 'EACCES' || e.code === 'EPERM') {
            console.log('  ✓ Trace files correctly marked as immutable (EPERM/EACCES on write).');
        } else {
            throw e;
        }
    }
    // 10. Verify Tier 3 Witness Integration
    console.log('[TEST] Verifying Tier 3 Witness Integration...');
    const witnessMissionId = 'WITNESS_TEST_' + Date.now();
    const witnessTracePath = path.join(traceDir, `${witnessMissionId}.trace.ndjson`);
    
    // Start Witness Server
    const { spawn } = require('child_process');
    const npxCmd = process.platform === 'win32' ? 'npx.cmd' : 'npx';
    const witnessProcess = spawn(npxCmd, ['tsx', 'packages/ztan-witness/src/index.ts'], { 
        env: { ...process.env, WITNESS_PORT: '8081' },
        shell: process.platform === 'win32',
        stdio: 'inherit'
    });
    
    // Wait for server to start
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    process.env.WITNESS_URL = 'http://localhost:8081/witness/receipt';
    
    // We need a fresh recorder instance because WITNESS_URL is loaded in constructor
    const WitnessTraceRecorder = require('../packages/runtime-core/src/index').MissionTraceRecorder;
    // Hack to bypass singleton for test
    WitnessTraceRecorder.instance = undefined;
    const witnessRecorder = WitnessTraceRecorder.getInstance();
    
    const witnessEvent: IMissionEvent = {
        id: `evt_witness_1`,
        missionId: witnessMissionId,
        type: 'STEP',
        timestamp: new Date().toISOString(),
        payload: { test: 'witness' },
        previousHash: '',
        eventHash: '',
        metadata: { stepIndex: 0, agentId: 'forensic_agent', reproducible: true }
    };
    await witnessRecorder.recordEvent(witnessEvent);
    
    // Seal trace, this should hit the witness server
    await witnessRecorder.sealTrace();
    
    // Wait for file write
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    // Kill witness server
    witnessProcess.kill();
    
    try {
        const out = execSync(`npx tsx scripts/replay-verify.ts ${witnessTracePath}`, { stdio: 'pipe' }).toString();
        if (out.includes('TIER 3')) {
            console.log('  ✓ TIER 3 Externally Witnessed trace verified successfully.');
        } else {
            console.error('Output:', out);
            throw new Error('TIER 3 not flagged in verification output');
        }
    } catch (e: any) {
        console.error('Output:', e.stdout?.toString() || e.message);
        throw new Error('Tier 3 Witness verification failed');
    }

    console.log('\n[TEST] ALL FORENSIC TESTS PASSED ✓');
}

test().catch(e => {
    console.error('[TEST] FAILED:', e);
    process.exit(1);
});
