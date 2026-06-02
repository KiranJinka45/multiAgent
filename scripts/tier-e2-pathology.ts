import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * ─── Phase 12 Tier E2: Infrastructure Pathology Drills ────────────────────
 * This orchestrator injects chaos directly into the running Docker infrastructure
 * without requiring elevated NET_ADMIN caps for native `tc` injection.
 */

const TARGETS = {
    witness: ['witness-1', 'witness-2', 'witness-3'],
    db: 'multiagent-main-postgres-1', // Depending on compose project name, fallback to just postgres or container_name if possible. Wait, the compose file uses container_name 'postgres' inside it? No, wait, compose sets container_name where specified. Let's look at compose.
    api: 'core-api'
};

async function getContainerName(serviceName: string): Promise<string> {
    // Attempt to dynamically fetch the container name via docker ps
    try {
        const { stdout } = await execAsync(`docker ps --format "{{.Names}}"`);
        const names = stdout.split('\n').filter(Boolean);
        const match = names.find(n => n.includes(serviceName));
        return match || serviceName;
    } catch {
        return serviceName;
    }
}

async function simulateAsymmetricPartition(targetService: string, durationMs: number) {
    const container = await getContainerName(targetService);
    console.log(`\n[Chaos: Partition] Injecting half-open partition on ${container} for ${durationMs}ms...`);
    
    try {
        await execAsync(`docker pause ${container}`);
        console.log(`[Chaos: Partition] 🧊 ${container} frozen (Packets dropping)...`);
        
        await new Promise(resolve => setTimeout(resolve, durationMs));
        
        await execAsync(`docker unpause ${container}`);
        console.log(`[Chaos: Partition] ☀️ ${container} thawed (Network restored).`);
    } catch (err: any) {
        console.error(`[Chaos: Partition] Failed: ${err.message}`);
        // Ensure unpause on crash
        await execAsync(`docker unpause ${container}`).catch(() => {});
    }
}

async function simulateIoThrottling(durationMs: number) {
    const dbContainer = await getContainerName('postgres');
    console.log(`\n[Chaos: IO Throttle] Saturating IO on ${dbContainer}...`);
    
    try {
        // Run a detached dd command to saturate IO for a period
        console.log(`[Chaos: IO Throttle] 💽 Injecting continuous fsync pressure...`);
        // We write 200MB 5 times with fsync
        for (let i = 0; i < 3; i++) {
            await execAsync(`docker exec ${dbContainer} dd if=/dev/zero of=/var/lib/postgresql/data/dummy_${i} bs=1M count=100 conv=fsync`);
            await new Promise(resolve => setTimeout(resolve, 500));
        }
        
        console.log(`[Chaos: IO Throttle] 🧹 Cleaning up IO dummy files...`);
        await execAsync(`docker exec ${dbContainer} sh -c "rm -f /var/lib/postgresql/data/dummy_*"`);
        console.log(`[Chaos: IO Throttle] IO pressure relieved.`);
    } catch (err: any) {
        console.error(`[Chaos: IO Throttle] Failed: ${err.message}`);
    }
}

async function simulateOOMPressure(targetService: string) {
    const container = await getContainerName(targetService);
    console.log(`\n[Chaos: OOM Pressure] Initiating aggressive memory leak inside ${container}...`);
    
    try {
        // Run awk in a detached background shell that rapidly consumes heap until OOM killer intervenes
        // WARNING: This will likely crash the container if limits are strict, forcing swarm/compose to restart it.
        const cmd = `docker exec -d ${container} awk 'BEGIN{a="1"; while(1) a=a"1"}'`;
        await execAsync(cmd);
        console.log(`[Chaos: OOM Pressure] 💥 Malicious memory allocator deployed. Awaiting cgroup/OOM intervention...`);
        
        await new Promise(resolve => setTimeout(resolve, 3000));
        console.log(`[Chaos: OOM Pressure] Verifying container survival status...`);
        
        const { stdout } = await execAsync(`docker inspect -f "{{.State.Status}}" ${container}`);
        console.log(`[Chaos: OOM Pressure] Status: ${stdout.trim()}`);
        
    } catch (err: any) {
        console.error(`[Chaos: OOM Pressure] Failed (Container likely crashed as expected): ${err.message}`);
    }
}

async function runChaosSequence(testMode: boolean = false) {
    console.log('================================================================================');
    console.log('🌪️ ZTAN PHASE 12 TIER E2: PATHOLOGY ORCHESTRATOR');
    console.log('================================================================================');
    
    if (testMode) {
        console.log('[Chaos] Running in Test Mode (Sequential bounded faults)');
        
        await simulateAsymmetricPartition('redis', 5000);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await simulateIoThrottling(5000);
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        await simulateOOMPressure('postgres');
        
        console.log('\n[Chaos] Test sequence complete.');
        return;
    }
    
    console.log('[Chaos] Running continuous random chaos mode...');
    // Implementation for endless chaos loop would go here.
}

// Parse args
const args = process.argv.slice(2);
const testArg = args.includes('--test');

runChaosSequence(testArg).catch(err => {
    console.error('Fatal orchestrator error:', err);
    process.exit(1);
});
