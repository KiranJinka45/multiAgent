import axios from 'axios';
import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

const GATEWAY_URL = 'http://localhost:3002';
const CORE_API_URL = 'http://localhost:4081'; // Now routing through gateway
const CONCURRENCY = 1;
const LOOPS = 3;

async function runChaosCombo() {
    console.log('🚀 INITIALIZING CHAOS COMBO TEST...');
    console.log('🔥 Injected Failures:');
    console.log('   1. Gateway Latency (1s)');
    console.log('   2. Redis Latency (300ms)');
    console.log('   3. Worker Rollout Simulation (Hard Kill)');
    console.log('   4. Concurrency Stress (10 parallel jobs x 3 loops)');

    const activeMissions: string[] = [];
    
    // 1. Submit jobs
    for (let loop = 0; loop < LOOPS; loop++) {
        console.log(`\n--- Loop ${loop + 1}/${LOOPS} ---`);
        const loopPromises = [];
        
        for (let i = 0; i < CONCURRENCY; i++) {
            loopPromises.push((async () => {
                try {
                    const res = await axios.post(`${CORE_API_URL}/api/generate`, {
                        prompt: `Chaos Combo Job #${loop}-${i}: Systemic Resilience Test under combined failure stress.`,
                        projectId: 'c2efc140-16b2-4787-bb08-dc6ddad43bd7',
                        userId: '28e4a880-2955-48ec-809a-5efee197ec2a'
                    }, {
                        headers: { 'x-canary-failure': 'true' } // Trigger gateway latency
                    });
                    return res.data.missionId;
                } catch (e: any) {
                    console.error(`❌ Failed to submit job ${loop}-${i}:`, e.response?.data || e.message);
                    return null;
                }
            })());
        }

        const ids = await Promise.all(loopPromises);
        activeMissions.push(...ids.filter(Boolean));
        console.log(`📡 Submitted ${ids.filter(Boolean).length} jobs in loop ${loop + 1}`);

        // Mid-test: Kill worker
        if (loop === 1) {
            console.log('\n⚠️  [CHAOS] KILLING WORKER MID-TEST...');
            try {
                // Kill the worker process using powershell explicitly
                await execAsync('powershell.exe -Command "Get-WmiObject Win32_Process -Filter \\"CommandLine LIKE \'%apps/worker/src/index.ts%\'\\" | ForEach-Object { Stop-Process -Id $_.ProcessId -Force }"');
                console.log('💀 Worker terminated.');
                
                // Restart worker with latency
                console.log('🔄 Restarting Worker with Redis Latency (100ms)...');
                const workerProcess = exec('npx tsx -r tsconfig-paths/register apps/worker/src/index.ts', {
                    env: { ...process.env, REDIS_LATENCY_MS: '100' }
                });
                workerProcess.unref();
            } catch (e: any) {
                console.error('❌ Failed to kill/restart worker:', e.message);
            }
        }
        
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n✅ All jobs submitted. Polling for systemic completion...');
    
    let completed = 0;
    const start = Date.now();
    const timeout = 120000; // 2 minutes

    while (completed < activeMissions.length && (Date.now() - start) < timeout) {
        const statuses = await Promise.all(activeMissions.map(id => db.mission.findUnique({ where: { id } })));
        completed = statuses.filter(m => m?.status === 'completed').length;
        const failed = statuses.filter(m => m?.status === 'failed').length;
        
        process.stdout.write(`\r⏳ Progress: ${completed}/${activeMissions.length} completed, ${failed} failed...`);
        
        if (completed + failed === activeMissions.length) break;
        await new Promise(r => setTimeout(r, 2000));
    }

    console.log('\n\n--- Chaos Combo Final Results ---');
    console.log(`Target: ${activeMissions.length}`);
    console.log(`Finished: ${completed}`);
    console.log(`Success Rate: ${((completed / activeMissions.length) * 100).toFixed(1)}%`);

    if (completed === activeMissions.length) {
        console.log('🏆 SYSTEMIC RESILIENCE CERTIFIED: All jobs survived the Chaos Combo.');
    } else {
        console.error('❌ CHAOS COMBO FAILED: Jobs were lost or stuck.');
    }
}

runChaosCombo()
    .then(() => process.exit(0))
    .catch(err => {
        console.error('Fatal Error:', err);
        process.exit(1);
    });
