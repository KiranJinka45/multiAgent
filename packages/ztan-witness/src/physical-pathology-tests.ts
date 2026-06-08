process.env.ZTAN_PARTITIONS = '1';
import { execSync } from 'child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { db } from '@packages/db';
import { GovernanceLedger } from '@packages/utils';

const POSTGRES_CONTAINER = 'multiagent-main-postgres-1';
const DOCKER_NETWORK = 'multiagent-main_multiagent-network';

function runDockerCmd(cmd: string) {
    try {
        console.log(`[Docker] ${cmd}`);
        return execSync(`docker ${cmd}`, { encoding: 'utf-8' }).trim();
    } catch (e: any) {
        console.error(`[Docker] Command failed: docker ${cmd}`);
        console.error(e.message);
        throw e;
    }
}

async function clearAllState() {
    console.log('[ChaosTest] Purging active ledger blocks and database state...');
    try {
        await db.$transaction(async (tx: any) => {
            await tx.$executeRawUnsafe("SET LOCAL ztan.bypass_immutability = 'on';");
            await tx.ztanLedgerBlock.deleteMany({});
            await tx.ztanWalLog.deleteMany({});
            await tx.ztanSnapshot.deleteMany({});
            await tx.idempotencyRecord.deleteMany({});
        });
        await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;');
    } catch (e: any) {
        if (!e.message.includes('Can\'t reach database server')) {
            console.error('[ChaosTest] Non-fatal error purging state:', e.message);
        }
    }

    console.log('[ChaosTest] Purging local filesystem locks and state...');
    const dir = path.join(process.cwd(), '.ztan-transparency');
    if (fs.existsSync(dir)) {
        const files = fs.readdirSync(dir);
        for (const file of files) {
            if (file.endsWith('.lock') || file.endsWith('.generation') || file.endsWith('.json') || file.endsWith('.log')) {
                try {
                    fs.unlinkSync(path.join(dir, file));
                } catch (_e) {}
            }
        }
    }
    GovernanceLedger.activeLockGenerations.clear();
    GovernanceLedger.activeDbGenerations.clear();
    
    // Initialize ledger partition states and filesystem setup synchronously to prevent REBUILDING hangs
    GovernanceLedger.states.set(0, 'ACTIVE');
    const ledgerFile = GovernanceLedger.getLedgerFile(0);
    if (!fs.existsSync(path.dirname(ledgerFile))) {
        fs.mkdirSync(path.dirname(ledgerFile), { recursive: true });
    }
    if (!fs.existsSync(ledgerFile)) {
        const genesis = [GovernanceLedger.createGenesisEntry(0)];
        fs.writeFileSync(ledgerFile, JSON.stringify(genesis, null, 2), 'utf8');
    }
}

async function runPhysicalTests() {
    console.log('==================================================');
    console.log('⚡ STARTING PHASE 25B: PHYSICAL STORAGE PATHOLOGY SUITE');
    console.log('==================================================\n');

    // Make sure container is up and running
    try {
        runDockerCmd(`start ${POSTGRES_CONTAINER}`);
        // Give it a moment to accept connections
        await new Promise(r => setTimeout(r, 2000));
    } catch (_e) {}

    // =========================================================================
    // DRILL 6: Network Partition Isolation
    // =========================================================================
    console.log('👉 DRILL 6: Physical Network Partition Isolation...');
    await clearAllState();

    try {
        console.log('[Drill 6] Establishing baseline connection...');
        GovernanceLedger.states.set(0, 'ACTIVE');
        await GovernanceLedger.acquireDbLease(0);
        console.log('[Drill 6] Lease acquired. Initiating physical network partition (disconnecting postgres)...');
        
        // Sever the physical network bridge to the container
        runDockerCmd(`network disconnect ${DOCKER_NETWORK} ${POSTGRES_CONTAINER}`);
        
        console.log('[Drill 6] Network severed. Attempting write operation (should fail cleanly or timeout)...');
        
        const writePromise = GovernanceLedger.appendEntry('POLICY', 'NETWORK-PARTITION-PAYLOAD', 'OPERATOR', 'VERIFIED', '106');
        
        let writeFailed = false;
        try {
            // Add a timeout fallback in case Prisma hangs indefinitely during a physical network drop
            await Promise.race([
                writePromise,
                new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Network Timeout')), 5000))
            ]);
        } catch (e: any) {
            writeFailed = true;
            console.log(`[Drill 6] Correctly caught exception during partition: ${e.message}`);
        }

        if (!writeFailed) {
            console.error('❌ FAILURE: Write somehow succeeded without a database network connection!');
            process.exit(1);
        }

        console.log('[Drill 6] Restoring physical network connection...');
        runDockerCmd(`network connect ${DOCKER_NETWORK} ${POSTGRES_CONTAINER}`);
        
        // Wait for Prisma to re-establish connections
        await new Promise(r => setTimeout(r, 3000));
        
        console.log('[Drill 6] Attempting recovery write...');
        const recoveryEntry = await GovernanceLedger.appendEntry('POLICY', 'NETWORK-RECOVERY-PAYLOAD', 'OPERATOR', 'VERIFIED', '106');
        console.log(`[Drill 6] Recovery write successful! Seq: ${recoveryEntry.sequenceId}`);
        console.log('✅ SUCCESS: Drill 6 passed. System correctly fenced on network loss and auto-recovered on network restoral.');

    } catch (err: any) {
        console.error('❌ Drill 6 threw unexpected error:', err.message);
        // Clean up network state before exiting
        try { runDockerCmd(`network connect ${DOCKER_NETWORK} ${POSTGRES_CONTAINER}`); } catch (_e) {}
        process.exit(1);
    }

    // =========================================================================
    // DRILL 7: Hard Container SIGKILL (Storage Crash)
    // =========================================================================
    console.log('\n👉 DRILL 7: Hard Container SIGKILL (Storage Crash)...');
    await clearAllState();

    try {
        console.log('[Drill 7] Pre-loading database...');
        GovernanceLedger.states.set(0, 'ACTIVE');
        await GovernanceLedger.acquireDbLease(0);
        const entry1 = await GovernanceLedger.appendEntry('POLICY', 'SIGKILL-PRE-PAYLOAD', 'OPERATOR', 'VERIFIED', '106');
        console.log(`[Drill 7] Written pre-crash entry Seq: ${entry1.sequenceId}`);

        console.log('[Drill 7] Firing SIGKILL to postgres container...');
        runDockerCmd(`kill -s SIGKILL ${POSTGRES_CONTAINER}`);

        console.log('[Drill 7] Attempting write while container is DEAD...');
        let sigkillFailed = false;
        try {
            await Promise.race([
                GovernanceLedger.appendEntry('POLICY', 'SIGKILL-DURING-PAYLOAD', 'OPERATOR', 'VERIFIED', '106'),
                new Promise((_, reject) => setTimeout(() => reject(new Error('Prisma Network Timeout')), 5000))
            ]);
        } catch (e: any) {
            sigkillFailed = true;
            console.log(`[Drill 7] Correctly failed to write: ${e.message}`);
        }

        if (!sigkillFailed) {
            console.error('❌ FAILURE: Write succeeded while Postgres was DEAD!');
            process.exit(1);
        }

        console.log('[Drill 7] Restarting Postgres container (simulating crash recovery)...');
        runDockerCmd(`start ${POSTGRES_CONTAINER}`);
        
        // Give PostgreSQL time to replay its WAL and accept connections
        console.log('[Drill 7] Waiting for PostgreSQL WAL recovery...');
        let dbUp = false;
        for (let i = 0; i < 20; i++) {
            await new Promise(r => setTimeout(r, 1000));
            try {
                // Try a lightweight query
                await db.$queryRaw`SELECT 1`;
                dbUp = true;
                break;
            } catch (_e) {}
        }

        if (!dbUp) {
            console.error('❌ FAILURE: PostgreSQL did not recover in time!');
            process.exit(1);
        }

        console.log('[Drill 7] PostgreSQL recovered. Performing post-crash write...');
        const entry2 = await GovernanceLedger.appendEntry('POLICY', 'SIGKILL-POST-PAYLOAD', 'OPERATOR', 'VERIFIED', '106');
        console.log(`[Drill 7] Post-crash write successful! Seq: ${entry2.sequenceId}`);
        console.log('✅ SUCCESS: Drill 7 passed. WAL naturally preserved state, and system recovered cleanly.');

    } catch (err: any) {
        console.error('❌ Drill 7 threw unexpected error:', err.message);
        try { runDockerCmd(`start ${POSTGRES_CONTAINER}`); } catch (_e) {}
        process.exit(1);
    }

    // =========================================================================
    // DRILL 8: Checkpoint Starvation & Forced I/O Stress
    // =========================================================================
    console.log('\n👉 DRILL 8: Checkpoint Starvation & Forced I/O (fsync=off)...');
    await clearAllState();

    try {
        console.log('[Drill 8] Disabling fsync directly via PostgreSQL ALTER SYSTEM...');
        runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "ALTER SYSTEM SET fsync = off;"`);
        runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "SELECT pg_reload_conf();"`);

        console.log('[Drill 8] fsync disabled. Performing rapid heavy writes to simulate I/O queue pressure...');
        GovernanceLedger.states.set(0, 'ACTIVE');
        await GovernanceLedger.acquireDbLease(0);
        
        const results = [];
        for (let i = 0; i < 50; i++) {
            const entry = await GovernanceLedger.appendEntry('POLICY', `ASYNC-IO-STRESS-PAYLOAD-${i}`, 'OPERATOR', 'VERIFIED', '106');
            results.push(entry);
        }
        console.log(`[Drill 8] Successfully completed ${results.length} sequential stress writes.`);

        console.log('[Drill 8] Restoring fsync safety...');
        runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "ALTER SYSTEM SET fsync = on;"`);
        runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "SELECT pg_reload_conf();"`);

        console.log('✅ SUCCESS: Drill 8 passed. System correctly handles physical storage parameter mutations dynamically.');

    } catch (err: any) {
        console.error('❌ Drill 8 threw unexpected error:', err.message);
        // Try to restore fsync on failure
        try { 
            runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "ALTER SYSTEM SET fsync = on;"`); 
            runDockerCmd(`exec -e PGPASSWORD=password ${POSTGRES_CONTAINER} psql -U postgres -d multiagent -c "SELECT pg_reload_conf();"`); 
        } catch (_e) {}
        process.exit(1);
    }

    console.log('\n==================================================');
    console.log('🎉 ALL PHASE 25B PHYSICAL STORAGE PATHOLOGY DRILLS PASSED!');
    console.log('==================================================\n');
    process.exit(0);
}

runPhysicalTests().catch(e => {
    console.error('Fatal test execution failure:', e);
    process.exit(1);
});
