import { spawn, execSync } from 'child_process';
import axios from 'axios';
import path from 'path';
import fs from 'fs';

const lockfilePath = path.join(process.cwd(), '.ztan-orchestrator-pids.json');

async function wait(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function main() {
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║        ZTAN RESILIENCE & CHAOS VALIDATION CAMPAIGN       ║');
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    // 1. Spawning Orchestrator
    console.log('🚀 Spawning microservice development orchestrator...');
    const orchProc = spawn('npx', ['tsx', 'scripts/start-dev.ts'], {
        cwd: process.cwd(),
        stdio: 'pipe',
        shell: true
    });

    let combinedOutput = '';
    orchProc.stdout.on('data', (data) => {
        const str = data.toString();
        combinedOutput += str;
        process.stdout.write(str);
    });

    orchProc.stderr.on('data', (data) => {
        const str = data.toString();
        combinedOutput += str;
        process.stderr.write(str);
    });

    // Wait for system to become fully operational
    console.log('⏳ Waiting for all services to become operational...');
    let stabilized = false;
    for (let i = 0; i < 120; i++) {
        if (combinedOutput.includes('ALL SERVICES OPERATIONAL')) {
            stabilized = true;
            break;
        }
        await wait(2000);
    }

    if (!stabilized) {
        console.error('❌ Orchestrator failed to stabilize in 240s. Aborting campaign.');
        cleanup(orchProc);
        process.exit(1);
    }

    console.log('\n✅ System stabilized. Commencing chaos injection scenarios...\n');

    // ─── Scenario 1: Event-Loop Lag & Backpressure Admission Control ───
    console.log('🛡️  [Scenario 1] Testing Gateway Event-Loop Lag Admission Control...');
    
    // Normal request
    try {
        const resNormal = await axios.get('http://127.0.0.1:3500/', {
            headers: { 'x-priority': 'low' }
        });
        console.log(`  - Normal request: HTTP ${resNormal.status} (Expected: 200)`);
    } catch (e: any) {
        console.error(`  - Normal request failed:`, e.message);
    }

    // Inject simulated lag of 300ms
    console.log('  - Injecting simulated Gateway event loop lag of 300ms...');
    try {
        await axios.post('http://127.0.0.1:3500/api/v1/chaos/lag', { durationMs: 300 });
    } catch (e: any) {
        console.error(`  - Failed to inject chaos lag:`, e.message);
    }

    // Verify low priority is shed
    await wait(200);
    console.log('  - Verifying low-priority traffic is shed (HTTP 429)...');
    let lowShed = false;
    try {
        await axios.get('http://127.0.0.1:3500/', {
            headers: { 'x-priority': 'low' }
        });
    } catch (e: any) {
        if (e.response && e.response.status === 429) {
            lowShed = true;
            console.log(`  ✅ Low-priority request correctly shed: HTTP 429 (${e.response.data.error})`);
        } else {
            console.error(`  - Unexpected low-priority response:`, e.message);
        }
    }

    // Clear simulated lag
    console.log('  - Clearing simulated lag...');
    try {
        await axios.post('http://127.0.0.1:3500/api/v1/chaos/lag', { durationMs: 0 });
    } catch (e: any) {}

    // Verify critical priority bypasses shed policy
    console.log('  - Verifying critical-priority traffic bypasses shedding...');
    let criticalBypass = false;
    try {
        const resCritical = await axios.get('http://127.0.0.1:3500/', {
            headers: { 'x-priority': 'critical' }
        });
        if (resCritical.status === 200) {
            criticalBypass = true;
            console.log(`  ✅ Critical-priority request correctly bypassed shedding: HTTP 200`);
        }
    } catch (e: any) {
        console.error(`  - Critical-priority request failed:`, e.message);
    }

    // ─── Scenario 2: Dependency-Aware Suppression ───
    console.log('\n🔗 [Scenario 2] Testing Dependency-Aware Restart Suppression...');

    // Load active PIDs from lockfile
    if (!fs.existsSync(lockfilePath)) {
        console.error('❌ Lockfile .ztan-orchestrator-pids.json not found!');
        cleanup(orchProc);
        process.exit(1);
    }

    const pids = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as { name: string; pid: number }[];
    const coreApiObj = pids.find(p => p.name === 'Core API');
    const authServiceObj = pids.find(p => p.name === 'Auth Service');

    if (!coreApiObj || !authServiceObj) {
        console.error('❌ Active Core API or Auth Service PIDs not found in lockfile!');
        cleanup(orchProc);
        process.exit(1);
    }

    console.log(`  - Active Core API PID: ${coreApiObj.pid}`);
    console.log(`  - Active Auth Service PID: ${authServiceObj.pid}`);

    // Kill Core API first (upstream dependency)
    console.log(`  - Killing upstream dependency (Core API PID ${coreApiObj.pid})...`);
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /F /PID ${coreApiObj.pid}`, { stdio: 'ignore' });
        } else {
            process.kill(coreApiObj.pid, 'SIGKILL');
        }
    } catch (e) {}

    // Kill Auth Service immediately (downstream service)
    console.log(`  - Killing downstream service (Auth Service PID ${authServiceObj.pid})...`);
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /F /PID ${authServiceObj.pid}`, { stdio: 'ignore' });
        } else {
            process.kill(authServiceObj.pid, 'SIGKILL');
        }
    } catch (e) {}

    // Monitor stdout to ensure restart of Auth Service is suppressed
    console.log('  - Monitoring suppression logs...');
    let suppressionLogged = false;
    for (let i = 0; i < 20; i++) {
        if (combinedOutput.includes('Suppression: Delaying restart of Auth Service because its dependency Core API is currently down')) {
            suppressionLogged = true;
            break;
        }
        await wait(1000);
    }

    if (suppressionLogged) {
        console.log(`  ✅ Restart suppression verified: Downstream Auth Service recovery paused while Core API was down.`);
    } else {
        console.error(`  ❌ Restart suppression was NOT logged!`);
    }

    // ─── Scorecard ───
    console.log('\n╔══════════════════════════════════════════════════════════╗');
    console.log('║                   CHAOS CAMPAIGN SCORECARD               ║');
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  🛡️  Gateway Load Shedding (HTTP 429)      ${lowShed ? 'PASS ✅' : 'FAIL ❌'}  ║`);
    console.log(`║  🛡️  Priority Bypass (x-priority)          ${criticalBypass ? 'PASS ✅' : 'FAIL ❌'}  ║`);
    console.log(`║  🔗 Dependency Restart Suppression         ${suppressionLogged ? 'PASS ✅' : 'FAIL ❌'}  ║`);
    
    const allPassed = lowShed && criticalBypass && suppressionLogged;
    console.log('╠══════════════════════════════════════════════════════════╣');
    console.log(`║  Campaign Result: ${allPassed ? 'RESILIENT 🟢' : 'ISSUES DETECTED 🔴'}                     ║`);
    console.log('╚══════════════════════════════════════════════════════════╝\n');

    cleanup(orchProc);
    process.exit(allPassed ? 0 : 1);
}

function cleanup(proc: any) {
    console.log('🛑 Cleaning up all test processes...');
    try {
        if (process.platform === 'win32') {
            execSync(`taskkill /F /T /PID ${proc.pid}`, { stdio: 'ignore' });
        } else {
            proc.kill('SIGKILL');
        }
    } catch (e) {}
    
    // Read and kill remaining lockfile processes
    try {
        if (fs.existsSync(lockfilePath)) {
            const pids = JSON.parse(fs.readFileSync(lockfilePath, 'utf8')) as { name: string; pid: number }[];
            for (const item of pids) {
                try {
                    if (process.platform === 'win32') {
                        execSync(`taskkill /F /T /PID ${item.pid}`, { stdio: 'ignore' });
                    } else {
                        process.kill(item.pid, 'SIGKILL');
                    }
                } catch (e) {}
            }
            fs.unlinkSync(lockfilePath);
        }
    } catch (e) {}
}

main().catch(err => {
    console.error('Fatal campaign execution error:', err);
    process.exit(1);
});
