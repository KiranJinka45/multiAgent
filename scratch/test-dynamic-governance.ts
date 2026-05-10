import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import { GovernanceAuthority } from '../packages/utils/src/transparency/governance-authority';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';

// ─── Configuration ──────────────────────────────────────────────────────────

const WITNESS_SCRIPT = path.join(process.cwd(), 'packages', 'ztan-witness', 'src', 'index.ts');
const TRACE_DIR = path.join(process.cwd(), '.ztan', 'trace');
const GOVERNANCE_DIR = path.join(process.cwd(), '.ztan-transparency', 'governance');
const GOSSIP_DIR = path.join(process.cwd(), '.ztan-transparency', 'gossip');

// ─── Utilities ──────────────────────────────────────────────────────────────

async function sendToWitness(url: string, payload: any): Promise<any> {
    return new Promise((resolve, reject) => {
        const data = JSON.stringify(payload);
        const req = http.request(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'Content-Length': data.length }
        }, (res) => {
            let body = '';
            res.on('data', chunk => body += chunk);
            res.on('end', () => {
                try { resolve(JSON.parse(body)); }
                catch (e) { reject(new Error(`Parse error from ${url}: ${body}`)); }
            });
        });
        req.on('error', reject);
        req.write(data);
        req.end();
    });
}

async function spawnWitness(port: number, dir: string): Promise<ChildProcess> {
    const witnessDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(witnessDir)) fs.mkdirSync(witnessDir, { recursive: true });

    return new Promise((resolve) => {
        const child = spawn('npx', ['tsx', WITNESS_SCRIPT], {
            env: { ...process.env, WITNESS_PORT: port.toString(), WITNESS_DIR: witnessDir },
            shell: true
        });
        child.stdout?.on('data', (data) => {
            if (data.toString().includes('Server listening on port')) {
                resolve(child);
            }
        });
        child.stderr?.on('data', () => {}); // Suppress stderr noise
    });
}

async function runCommand(cmd: string): Promise<{stdout: string, stderr: string, code: number}> {
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            resolve({ stdout, stderr, code: error ? (error as any).code || 1 : 0 });
        });
    });
}

function cleanDir(dir: string): void {
    if (fs.existsSync(dir)) {
        fs.readdirSync(dir).forEach(f => fs.unlinkSync(path.join(dir, f)));
    }
}

function buildMissionPayload(missionId: string): any {
    const fixedTime = "2026-05-08T12:00:00.000Z";
    const e1Hash = crypto.createHash('sha256').update("e1").digest('hex');
    return {
        missionId,
        events: [
            { id: "e1", missionId, type: "START", timestamp: fixedTime, payload: {}, metadata: { timestamp: fixedTime }, previousHash: "0".repeat(64), eventHash: e1Hash },
            { id: "e2", missionId, type: "ACTION", timestamp: fixedTime, payload: { detail: "Governance Test" }, metadata: { timestamp: fixedTime }, previousHash: e1Hash, eventHash: crypto.createHash('sha256').update("e2").digest('hex') }
        ],
        witnessPayload: {
            missionId,
            chainRoot: crypto.createHash('sha256').update('root').digest('hex'),
            tailHash: crypto.createHash('sha256').update('tail').digest('hex'),
            governanceReceipt: 'test-gov',
            signerKeyId: 'test-signer',
            timestamp: fixedTime
        }
    };
}

async function collectReceipts(witnessUrls: string[], payload: any): Promise<any[]> {
    const receipts: any[] = [];
    for (const url of witnessUrls) {
        try {
            const receipt = await sendToWitness(url, payload);
            receipts.push(receipt);
            console.log(`    ✓ Receipt from ${url} (Tree Size: ${receipt.treeSize})`);
        } catch (e: any) {
            console.warn(`    ✗ Failed: ${url}: ${e.message}`);
        }
    }
    return receipts;
}

function saveTrace(missionId: string, events: any[], witnesses: any[]): string {
    if (!fs.existsSync(TRACE_DIR)) fs.mkdirSync(TRACE_DIR, { recursive: true });
    const traceFile = path.join(TRACE_DIR, `${missionId}.trace.json`);
    fs.writeFileSync(traceFile, JSON.stringify({ missionId, events, witnesses }, null, 2));
    return traceFile;
}

async function runAudit(traceFile: string): Promise<{stdout: string, code: number}> {
    const result = await runCommand(`npx tsx scripts/replay-verify.ts "${traceFile}"`);
    return { stdout: result.stdout + result.stderr, code: result.code };
}

// ─── Scenario A: Dynamic Onboarding ────────────────────────────────────────

async function scenarioA(witnesses: ChildProcess[], authority: GovernanceAuthority): Promise<boolean> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SCENARIO A: Dynamic Witness Onboarding (3 → 4 nodes)');
    console.log('═══════════════════════════════════════════════════════════════');

    // Step 1: Run a mission with the initial 3-node federation
    console.log('\n  [A.1] Running mission with initial 3-node federation...');
    const mission1 = buildMissionPayload('GOV_ONBOARD_' + Date.now());
    const receipts1 = await collectReceipts([
        'http://localhost:8081/witness/receipt',
        'http://localhost:8082/witness/receipt',
        'http://localhost:8083/witness/receipt'
    ], mission1.witnessPayload);
    const trace1 = saveTrace(mission1.witnessPayload.missionId, mission1.events, receipts1);

    const audit1 = await runAudit(trace1);
    console.log(audit1.stdout);

    // Step 2: Spawn a 4th witness
    console.log('  [A.2] Spawning witness W4 on port 8084...');
    const w4 = await spawnWitness(8084, '.ztan-witness/w4');
    witnesses.push(w4);

    // Read W4's public key
    const w4PubPath = path.join(process.cwd(), '.ztan-witness', 'w4', 'keys', 'witness.pub');
    const w4PubKey = fs.readFileSync(w4PubPath, 'utf8');
    const w4Id = crypto.createHash('sha256').update(w4PubKey).digest('hex');

    // Step 3: Issue WITNESS_ADD governance receipt
    console.log(`  [A.3] Issuing WITNESS_ADD for W4 (${w4Id.slice(0, 8)}...)...`);
    const addReceipt = authority.signReceipt({
        action: 'WITNESS_ADD',
        targetWitnessId: w4Id,
        targetWitnessConfig: { publicKey: w4PubKey, url: 'http://localhost:8084' },
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Adding W4 to expand federation for resilience.'
    });
    console.log(`    ✓ Governance receipt #${addReceipt.sequenceNumber} signed.`);

    // Step 4: Run mission with all 4 witnesses
    console.log('  [A.4] Running mission with expanded 4-node federation...');
    const mission2 = buildMissionPayload('GOV_ONBOARD_4N_' + Date.now());
    const receipts2 = await collectReceipts([
        'http://localhost:8081/witness/receipt',
        'http://localhost:8082/witness/receipt',
        'http://localhost:8083/witness/receipt',
        'http://localhost:8084/witness/receipt'
    ], mission2.witnessPayload);
    const trace2 = saveTrace(mission2.witnessPayload.missionId, mission2.events, receipts2);

    const audit2 = await runAudit(trace2);
    console.log(audit2.stdout);

    // The audit should PASS — W4 is now a recognized member
    const pass = audit2.stdout.includes('Valid signatures collected: 4') ||
                 (receipts2.length === 4 && !audit2.stdout.includes('UNKNOWN_WITNESS'));
    console.log(pass ? '  ✅ SCENARIO A: PASS' : '  ❌ SCENARIO A: FAIL');
    return pass;
}

// ─── Scenario B: Witness Revocation ────────────────────────────────────────

async function scenarioB(authority: GovernanceAuthority): Promise<boolean> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SCENARIO B: Witness Revocation Enforcement');
    console.log('═══════════════════════════════════════════════════════════════');

    // Read W2's public key to get its ID
    const w2PubPath = path.join(process.cwd(), '.ztan-witness', 'w2', 'keys', 'witness.pub');
    const w2PubKey = fs.readFileSync(w2PubPath, 'utf8');
    const w2Id = crypto.createHash('sha256').update(w2PubKey).digest('hex');

    // Step 1: Issue WITNESS_REMOVE for W2
    const revokeTime = new Date().toISOString();
    console.log(`\n  [B.1] Issuing WITNESS_REMOVE for W2 (${w2Id.slice(0, 8)}...)...`);
    const removeReceipt = authority.signReceipt({
        action: 'WITNESS_REMOVE',
        targetWitnessId: w2Id,
        effectiveTimestamp: revokeTime,
        reason: 'W2 key compromise suspected. Revoking membership.'
    });
    console.log(`    ✓ Governance receipt #${removeReceipt.sequenceNumber} signed.`);

    // Step 2: Run a mission where W2 still signs (simulating post-revocation signing)
    // Use a timestamp AFTER the revocation
    console.log('  [B.2] Running mission with revoked W2 still signing (post-revocation)...');
    const mission = buildMissionPayload('GOV_REVOKE_' + Date.now());
    const receipts = await collectReceipts([
        'http://localhost:8081/witness/receipt',
        'http://localhost:8082/witness/receipt', // W2 is revoked but still running
        'http://localhost:8083/witness/receipt'
    ], mission.witnessPayload);
    const trace = saveTrace(mission.witnessPayload.missionId, mission.events, receipts);

    // Step 3: Audit — should show REVOKED_WITNESS for W2
    const audit = await runAudit(trace);
    console.log(audit.stdout);

    const detected = audit.stdout.includes('REVOKED_WITNESS');
    console.log(detected ? '  ✅ SCENARIO B: PASS (Revocation enforced)' : '  ❌ SCENARIO B: FAIL (Revocation not enforced)');
    return detected;
}

// ─── Scenario C: Threshold Transition ──────────────────────────────────────

async function scenarioC(authority: GovernanceAuthority): Promise<boolean> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SCENARIO C: Threshold Transition Enforcement');
    console.log('═══════════════════════════════════════════════════════════════');

    // At this point: W1, W3 are active (W2 removed in Scenario B, W4 added in A)
    // W4 is also active from Scenario A
    // Active: W1, W3, W4 (3 nodes)

    // Step 1: Issue THRESHOLD_UPDATE to 3/3 (unanimity)
    console.log('\n  [C.1] Issuing THRESHOLD_UPDATE to 3/3 (unanimity)...');
    const thresholdReceipt = authority.signReceipt({
        action: 'THRESHOLD_UPDATE',
        newThreshold: 3,
        effectiveTimestamp: new Date().toISOString(),
        reason: 'Critical period — requiring unanimity for all attestations.'
    });
    console.log(`    ✓ Governance receipt #${thresholdReceipt.sequenceNumber} signed.`);

    // Step 2: Run mission with only 2/3 witnesses (W1 + W3 — missing W4)
    console.log('  [C.2] Running mission with only 2/3 witnesses (expect QUORUM_NOT_MET)...');
    const mission1 = buildMissionPayload('GOV_THRESHOLD_2_' + Date.now());
    const receipts1 = await collectReceipts([
        'http://localhost:8081/witness/receipt',
        'http://localhost:8083/witness/receipt'
    ], mission1.witnessPayload);
    const trace1 = saveTrace(mission1.witnessPayload.missionId, mission1.events, receipts1);

    const audit1 = await runAudit(trace1);
    console.log(audit1.stdout);

    const quorumFailed = audit1.stdout.includes('QUORUM_NOT_MET');

    // Step 3: Run mission with 3/3 witnesses (W1 + W3 + W4)
    console.log('  [C.3] Running mission with 3/3 witnesses (expect PASS)...');
    const mission2 = buildMissionPayload('GOV_THRESHOLD_3_' + Date.now());
    const receipts2 = await collectReceipts([
        'http://localhost:8081/witness/receipt',
        'http://localhost:8083/witness/receipt',
        'http://localhost:8084/witness/receipt'
    ], mission2.witnessPayload);
    const trace2 = saveTrace(mission2.witnessPayload.missionId, mission2.events, receipts2);

    const audit2 = await runAudit(trace2);
    console.log(audit2.stdout);

    const quorumPassed = audit2.stdout.includes('Valid signatures collected: 3');

    const pass = quorumFailed && quorumPassed;
    console.log(pass
        ? '  ✅ SCENARIO C: PASS (Threshold transition enforced)'
        : '  ❌ SCENARIO C: FAIL');
    return pass;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 9: Dynamic Transparency Governance Simulation        ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // 0. Clean start
    console.log('\n[SETUP] Cleaning environment...');
    ['w1', 'w2', 'w3', 'w4'].forEach(w => {
        const log = path.join('.ztan-witness', w, 'witness.log.ndjson');
        if (fs.existsSync(log)) fs.unlinkSync(log);
    });
    cleanDir(GOSSIP_DIR);

    // Clean governance log for fresh start
    const govLog = path.join(GOVERNANCE_DIR, 'governance.log.ndjson');
    if (fs.existsSync(govLog)) fs.unlinkSync(govLog);
    // Remove authority keys so they regenerate fresh
    const authKey = path.join(GOVERNANCE_DIR, 'authority.key');
    const authPub = path.join(GOVERNANCE_DIR, 'authority.pub');
    if (fs.existsSync(authKey)) fs.unlinkSync(authKey);
    if (fs.existsSync(authPub)) fs.unlinkSync(authPub);

    // 1. Initialize Governance Authority
    console.log('[SETUP] Initializing Governance Authority...');
    const authority = new GovernanceAuthority(GOVERNANCE_DIR);
    console.log(`  Authority Key ID: ${authority.getKeyId().slice(0, 16)}...`);

    // 2. Spawn initial 3-node federation
    console.log('[SETUP] Spawning initial 3-node witness federation...');
    const w1 = await spawnWitness(8081, '.ztan-witness/w1');
    const w2 = await spawnWitness(8082, '.ztan-witness/w2');
    const w3 = await spawnWitness(8083, '.ztan-witness/w3');
    const witnesses: ChildProcess[] = [w1, w2, w3];
    console.log('  ✓ All 3 witnesses online.');

    // Clear gossip after witness startup (they may have published stale data)
    cleanDir(GOSSIP_DIR);

    let scenarioAResult = false;
    let scenarioBResult = false;
    let scenarioCResult = false;

    try {
        scenarioAResult = await scenarioA(witnesses, authority);
        scenarioBResult = await scenarioB(authority);
        scenarioCResult = await scenarioC(authority);
    } finally {
        console.log('\n[CLEANUP] Terminating witnesses...');
        witnesses.forEach(w => w.kill());
    }

    // Final Report
    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  GOVERNANCE SIMULATION RESULTS                               ║');
    console.log('╠═══════════════════════════════════════════════════════════════╣');
    console.log(`║  Scenario A (Dynamic Onboarding):    ${scenarioAResult ? '✅ PASS' : '❌ FAIL'}              ║`);
    console.log(`║  Scenario B (Witness Revocation):    ${scenarioBResult ? '✅ PASS' : '❌ FAIL'}              ║`);
    console.log(`║  Scenario C (Threshold Transition):  ${scenarioCResult ? '✅ PASS' : '❌ FAIL'}              ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Print governance log summary
    const log = authority.loadGovernanceLog();
    console.log(`\n[AUDIT] Governance Log (${log.length} entries):`);
    for (const r of log) {
        console.log(`  #${r.sequenceNumber}: ${r.action} — ${r.reason}`);
    }

    const allPass = scenarioAResult && scenarioBResult && scenarioCResult;
    process.exit(allPass ? 0 : 1);
}

main().catch(e => {
    console.error('[SIM] FATAL ERROR:', e);
    process.exit(1);
});
