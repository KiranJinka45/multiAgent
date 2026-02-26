import { execSync } from 'child_process';
import logger from '../../lib/logger';
import redis from '../../lib/redis';

/**
 * Chaos Monkey for MultiAgent (Windows Version)
 * 
 * Usage: npx ts-node src/scavenger/simulations/chaos_monkey.ts --action kill-worker
 */

async function killWorker() {
    console.log('🐒 Chaos Monkey: Searching for MultiAgent Worker...');
    try {
        // On Windows, we look for 'node' processes. 
        // This is a bit broad, so we'll look for processes running 'worker.ts'
        const output = execSync('wmic process where "commandline like \'%worker.ts%\'" get ProcessId').toString();
        const pids = output.split('\n').map(l => l.trim()).filter(l => l && !isNaN(Number(l)));

        if (pids.length === 0) {
            console.warn('⚠️ No active worker processes found running worker.ts');
            return;
        }

        console.log(`💀 Killing Worker PIDs: ${pids.join(', ')}`);
        pids.forEach(pid => {
            execSync(`taskkill /F /PID ${pid}`);
        });

        console.log('✅ Workers terminated. Monitoring heartbeat in Redis...');
        const heartbeat = await redis.get('system:health:worker');
        console.log(`Heartbeat Status: ${heartbeat ? 'Active' : 'Missing (Success)'}`);
    } catch (err) {
        console.error('❌ Failed to kill worker:', err);
    }
}

async function simulateSlowAgent() {
    console.log('🐒 Chaos Monkey: Injecting 60s delay into DatabaseAgent...');
    // We set a flag in Redis that the agent will check
    await redis.set('chaos:delay:DatabaseAgent', '60000', 'EX', 300);
    console.log('✅ Delay flag set in Redis. Worker will stall on next DatabaseAgent execution.');
}

const action = process.argv.includes('--action') ? process.argv[process.argv.indexOf('--action') + 1] : null;

if (action === 'kill-worker') {
    killWorker().then(() => redis.quit());
} else if (action === 'slow-agent') {
    simulateSlowAgent().then(() => redis.quit());
} else {
    console.log('Usage: npx ts-node src/scavenger/simulations/chaos_monkey.ts --action [kill-worker|slow-agent]');
    redis.quit();
}
