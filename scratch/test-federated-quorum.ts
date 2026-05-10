import { spawn, ChildProcess } from 'child_process';
import path from 'path';
import fs from 'fs';

const WITNESS_SCRIPT = path.join(process.cwd(), 'packages', 'ztan-witness', 'src', 'index.ts');

async function spawnWitness(port: number, dir: string): Promise<ChildProcess> {
    const witnessDir = path.resolve(process.cwd(), dir);
    if (!fs.existsSync(witnessDir)) fs.mkdirSync(witnessDir, { recursive: true });

    return new Promise((resolve) => {
        const child = spawn('npx', ['tsx', WITNESS_SCRIPT], {
            env: {
                ...process.env,
                WITNESS_PORT: port.toString(),
                WITNESS_DIR: witnessDir
            },
            shell: true
        });

        child.stdout?.on('data', (data) => {
            const msg = data.toString();
            if (msg.includes('Server listening on port')) {
                console.log(`[SIM] Witness started on port ${port} in ${dir}`);
                resolve(child);
            }
        });

        child.stderr?.on('data', (data) => {
            console.error(`[WITNESS-${port}] ERROR: ${data.toString()}`);
        });
    });
}

async function runCommand(cmd: string): Promise<{stdout: string, stderr: string, code: number}> {
    const { exec } = await import('child_process');
    return new Promise((resolve) => {
        exec(cmd, (error, stdout, stderr) => {
            resolve({
                stdout,
                stderr,
                code: error ? (error as any).code || 1 : 0
            });
        });
    });
}

async function main() {
    console.log('[SIM] Starting Federated Quorum Simulation...');

    // 0. Clean start
    console.log('[SIM] Cleaning witness logs...');
    ['w1', 'w2', 'w3'].forEach(w => {
        const log = path.join('.ztan-witness', w, 'witness.log.ndjson');
        if (fs.existsSync(log)) fs.unlinkSync(log);
    });

    // 1. Spawn 3 witnesses
    const w1 = await spawnWitness(8081, '.ztan-witness/w1');
    const w2 = await spawnWitness(8082, '.ztan-witness/w2');
    const w3 = await spawnWitness(8083, '.ztan-witness/w3');

    try {
        // 2. Clear previous traces and gossip
        console.log('[SIM] Clearing environment...');
        const gossipDir = path.resolve(process.cwd(), '.ztan-transparency/gossip');
        if (fs.existsSync(gossipDir)) {
            fs.readdirSync(gossipDir).forEach(f => fs.unlinkSync(path.join(gossipDir, f)));
        }

        // 3. Trigger federated mission
        console.log('[SIM] Triggering federated mission...');
        const trigger = await runCommand('npx tsx scratch/trigger-tier4.ts');
        console.log(trigger.stdout);

        // Extract the trace file path
        const match = trigger.stdout.match(/Trace saved to (.*\.json)/);
        if (!match) throw new Error('Could not find trace file in trigger output');
        const traceFile = match[1].trim();

        // 4. Run Audit (Should PASS)
        console.log('[SIM] Running Quorum Audit (Expect PASS)...');
        const audit = await runCommand(`npx tsx scripts/replay-verify.ts "${traceFile}"`);
        console.log(audit.stdout);
        console.log(audit.stderr);
        
        if (audit.code === 0) {
             console.log('[SIM] SUCCESS: Quorum audit passed ✓');
        } else {
             console.error('[SIM] FAIL: Audit failed unexpectedly');
        }

        // 5. Simulate DIVERGENCE (Split-View across witnesses)
        // We'll tamper with W2's gossiped root to trigger FEDERATION_DIVERGENCE
        console.log('[SIM] Simulating Federation Divergence (Witness 2 disagrees)...');
        const gossipFiles = fs.readdirSync(gossipDir);
        const w2Gossip = gossipFiles.find(f => f.startsWith('5b85c135')); // Witness 2 ID
        if (w2Gossip) {
            const p = path.join(gossipDir, w2Gossip);
            const data = JSON.parse(fs.readFileSync(p, 'utf8'));
            data.rootHash = 'deadbeef' + data.rootHash.slice(8);
            fs.writeFileSync(p, JSON.stringify(data, null, 2));
            console.log(`[SIM] Tampered with gossip file: ${w2Gossip}`);
        }

        // 6. Run Audit (Should FAIL with FEDERATION_DIVERGENCE)
        console.log('[SIM] Running Quorum Audit (Expect FAIL with FEDERATION_DIVERGENCE)...');
        const audit2 = await runCommand(`npx tsx scripts/replay-verify.ts "${traceFile}"`);
        console.log(audit2.stdout);
        if (audit2.stdout.includes('FEDERATION_DIVERGENCE')) {
            console.log('[SIM] SUCCESS: Divergence caught by auditor ✓');
        } else {
            console.error('[SIM] FAIL: Auditor did not detect federation divergence');
        }

    } finally {
        console.log('[SIM] Cleaning up...');
        w1.kill();
        w2.kill();
        w3.kill();
    }
}

main().catch(e => {
    console.error('[SIM] FATAL ERROR:', e);
    process.exit(1);
});
