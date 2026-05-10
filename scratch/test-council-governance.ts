import { spawn, ChildProcess, exec } from 'child_process';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import http from 'http';
import { GovernanceCoordinator, GovernanceCouncilMember } from '../packages/utils/src/transparency/governance-authority';
import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';

// ─── Configuration ──────────────────────────────────────────────────────────

const WITNESS_SCRIPT = path.join(process.cwd(), 'packages', 'ztan-witness', 'src', 'index.ts');
const TRACE_DIR = path.join(process.cwd(), '.ztan', 'trace');
const GOVERNANCE_DIR = path.join(process.cwd(), '.ztan-transparency', 'governance');

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
            const msg = data.toString();
            process.stdout.write(`[W${port}] ${msg}`);
            if (msg.includes('Server listening on port')) resolve(child);
        });
        child.stderr?.on('data', (data) => {
            process.stderr.write(`[W${port}-ERR] ${data}`);
        });
    });
}

async function runAudit(traceFile: string): Promise<{stdout: string, code: number}> {
    return new Promise((resolve) => {
        exec(`npx tsx scripts/replay-verify.ts "${traceFile}"`, (error, stdout, stderr) => {
            resolve({ stdout: stdout + stderr, code: error ? (error as any).code || 1 : 0 });
        });
    });
}

function buildMissionPayload(missionId: string): any {
    return {
        missionId,
        witnessPayload: {
            missionId,
            chainRoot: crypto.createHash('sha256').update('root').digest('hex'),
            tailHash: crypto.createHash('sha256').update('tail').digest('hex'),
            governanceReceipt: 'test-gov',
            signerKeyId: 'test-signer'
        }
    };
}

function getWitnessKeyInfo(dir: string) {
    const pubKey = fs.readFileSync(path.join(dir, 'keys', 'witness.pub'), 'utf8');
    const id = crypto.createHash('sha256').update(pubKey).digest('hex');
    return { id, publicKey: pubKey };
}

// ─── Scenario A: Multi-Sig Council ──────────────────────────────────────────

async function scenarioA(coordinator: GovernanceCoordinator, members: GovernanceCouncilMember[]): Promise<boolean> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SCENARIO A: Multi-Sig Council Proposal (Threshold Enforced)');
    console.log('═══════════════════════════════════════════════════════════════');

    // 1. Get NEW witness keys
    const w1Info = getWitnessKeyInfo('.ztan-witness/w1');
    const w2Info = getWitnessKeyInfo('.ztan-witness/w2');
    const w3Info = getWitnessKeyInfo('.ztan-witness/w3');

    // 2. Propose COUNCIL_UPDATE + WITNESS_ADD (Genesis Bootstrap)
    // We'll use multiple receipts to build the state
    console.log('\n  [A.1] Bootstrapping federation via sequence of receipts...');
    
    // Receipt 0: Set Council
    coordinator.propose({
        action: 'COUNCIL_UPDATE',
        newCouncil: {
            members: members.map(m => ({ id: m.getKeyId(), publicKey: m.getPublicKeyPem() })),
            threshold: 2
        },
        effectiveTimestamp: '2026-05-08T00:00:00.000Z',
        reason: 'Bootstrap Council.',
        sequenceNumber: 0
    }, []);

    // Receipt 1: Add W1 (Signed by council)
    coordinator.propose({
        action: 'WITNESS_ADD',
        targetWitnessId: w1Info.id,
        targetWitnessConfig: { publicKey: w1Info.publicKey, url: 'http://localhost:8081' },
        effectiveTimestamp: '2026-05-08T00:00:01.000Z',
        reason: 'Adding W1.',
        sequenceNumber: 1
    }, [members[0], members[1]]);

    // Receipt 2: Add W2
    coordinator.propose({
        action: 'WITNESS_ADD',
        targetWitnessId: w2Info.id,
        targetWitnessConfig: { publicKey: w2Info.publicKey, url: 'http://localhost:8082' },
        effectiveTimestamp: '2026-05-08T00:00:02.000Z',
        reason: 'Adding W2.',
        sequenceNumber: 2
    }, [members[1], members[2]]);

    // Receipt 3: Add W3
    coordinator.propose({
        action: 'WITNESS_ADD',
        targetWitnessId: w3Info.id,
        targetWitnessConfig: { publicKey: w3Info.publicKey, url: 'http://localhost:8083' },
        effectiveTimestamp: '2026-05-08T00:00:03.000Z',
        reason: 'Adding W3.',
        sequenceNumber: 3
    }, [members[0], members[2]]);

    console.log(`    ✓ Governance log initialized with ${coordinator.getLastSequence() + 1} receipts.`);

    // 3. Run mission and audit
    console.log('  [A.2] Running mission and auditing...');
    const mission = buildMissionPayload('COUNCIL_A_' + Date.now());
    const w1Receipt = await sendToWitness('http://localhost:8081/witness/receipt', mission.witnessPayload);
    const w2Receipt = await sendToWitness('http://localhost:8082/witness/receipt', mission.witnessPayload);
    
    const traceFile = path.join(TRACE_DIR, `${mission.missionId}.trace.json`);
    fs.writeFileSync(traceFile, JSON.stringify({ missionId: mission.missionId, events: [], witnesses: [w1Receipt, w2Receipt] }, null, 2));

    const audit = await runAudit(traceFile);
    console.log(audit.stdout);

    const pass = audit.stdout.includes('Applied governance receipt #3') && !audit.stdout.includes('FATAL');
    console.log(pass ? '  ✅ SCENARIO A: PASS' : '  ❌ SCENARIO A: FAIL');
    return pass;
}

// ─── Scenario B: Governance State Divergence ────────────────────────────────

async function scenarioB(coordinator: GovernanceCoordinator): Promise<boolean> {
    console.log('\n═══════════════════════════════════════════════════════════════');
    console.log('  SCENARIO B: Governance State Divergence (Anchoring)');
    console.log('═══════════════════════════════════════════════════════════════');

    const logPath = path.join(GOVERNANCE_DIR, 'governance.log.ndjson');
    const originalLog = fs.readFileSync(logPath, 'utf8');

    console.log('  [B.1] Temporarily poisoning governance log to simulate fork...');
    fs.appendFileSync(logPath, JSON.stringify({ action: 'MALICIOUS_FORK', sequenceNumber: 99, reason: 'Fork test.' }) + '\n');

    console.log('  [B.2] Getting witness receipt anchored to poisoned state...');
    const mission = buildMissionPayload('COUNCIL_B_' + Date.now());
    const witnessReceipt = await sendToWitness('http://localhost:8081/witness/receipt', mission.witnessPayload);

    console.log('  [B.3] Restoring original log for auditor...');
    fs.writeFileSync(logPath, originalLog);

    const traceFile = path.join(TRACE_DIR, `${mission.missionId}.trace.json`);
    fs.writeFileSync(traceFile, JSON.stringify({ missionId: mission.missionId, events: [], witnesses: [witnessReceipt] }, null, 2));

    const audit = await runAudit(traceFile);
    console.log(audit.stdout);

    const detected = audit.stdout.includes('GOVERNANCE_STATE_DIVERGENCE');
    console.log(detected ? '  ✅ SCENARIO B: PASS (Divergence detected)' : '  ❌ SCENARIO B: FAIL');
    return detected;
}

// ─── Main ───────────────────────────────────────────────────────────────────

async function main() {
    console.log('╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  PHASE 10: Decentralized Governance & Anchoring Simulation  ║');
    console.log('╚═══════════════════════════════════════════════════════════════╝');

    // Cleanup
    const transparencyDir = path.join(process.cwd(), '.ztan-transparency');
    if (fs.existsSync(transparencyDir)) fs.rmSync(transparencyDir, { recursive: true });
    ['w1', 'w2', 'w3'].forEach(w => {
        const d = path.join('.ztan-witness', w);
        if (fs.existsSync(d)) fs.rmSync(d, { recursive: true });
    });
    if (fs.existsSync(TRACE_DIR)) fs.rmSync(TRACE_DIR, { recursive: true });
    fs.mkdirSync(TRACE_DIR, { recursive: true });

    // Setup coordinator and members
    const coordinator = new GovernanceCoordinator(GOVERNANCE_DIR);
    const memberA = new GovernanceCouncilMember(path.join(GOVERNANCE_DIR, 'memberA'));
    const memberB = new GovernanceCouncilMember(path.join(GOVERNANCE_DIR, 'memberB'));
    const memberC = new GovernanceCouncilMember(path.join(GOVERNANCE_DIR, 'memberC'));
    const members = [memberA, memberB, memberC];

    // Ensure governance directory exists
    if (!fs.existsSync(GOVERNANCE_DIR)) fs.mkdirSync(GOVERNANCE_DIR, { recursive: true });
    const logPath = path.join(GOVERNANCE_DIR, 'governance.log.ndjson');
    if (!fs.existsSync(logPath)) fs.writeFileSync(logPath, '');

    // Spawn witnesses
    console.log('[SETUP] Spawning witnesses...');
    const w1 = await spawnWitness(8081, '.ztan-witness/w1');
    const w2 = await spawnWitness(8082, '.ztan-witness/w2');
    const w3 = await spawnWitness(8083, '.ztan-witness/w3');
    const witnesses = [w1, w2, w3];

    let passA = false, passB = false;
    try {
        passA = await scenarioA(coordinator, members);
        passB = await scenarioB(coordinator);
    } finally {
        witnesses.forEach(w => w.kill());
    }

    console.log('\n╔═══════════════════════════════════════════════════════════════╗');
    console.log('║  FINAL RESULTS                                               ║');
    console.log(`║  Scenario A (Multi-Sig):  ${passA ? '✅ PASS' : '❌ FAIL'}                           ║`);
    console.log(`║  Scenario B (Anchoring): ${passB ? '✅ PASS' : '❌ FAIL'}                           ║`);
    console.log('╚═══════════════════════════════════════════════════════════════╝');
    
    process.exit(passA && passB ? 0 : 1);
}

main().catch(e => {
    console.error(e);
    process.exit(1);
});
