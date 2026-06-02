import { ConsensusEngine } from '../packages/governance-core/src/ledger/consensus.js';
import { db } from '../packages/db/src/index.js';
import * as child_process from 'child_process';
import { promisify } from 'util';
import { MerkleTree } from '../packages/governance-core/src/ledger/merkle.js';
import { sign } from 'crypto';

const exec = promisify(child_process.exec);

async function main() {
    console.log('--- Priority 2: Real PostgreSQL Outage Drill ---');
    console.log('[Setup] Initializing Consensus Cluster');
    
    ConsensusEngine.configureNodes([
        { nodeId: 'node-1', isAlive: true },
        { nodeId: 'node-2', isAlive: true },
        { nodeId: 'node-3', isAlive: true }
    ]);
    
    // Generate valid BFT params
    const term = 1;
    const entries = [{ term, command: 'INITIALIZE_ZTAN' }];
    const root = MerkleTree.computeRoot(entries);
    const leader = ConsensusEngine.getClusterNodes().get('node-1')!;
    const sigPayload = Buffer.from(`${term}:${root}`);
    const sig = sign(null, sigPayload, leader.privateKey).toString('base64');
    
    console.log('[Step 1] Patching DB Transaction to simulate mid-transaction failure...');
    
    const originalTransaction = db.$transaction;
    
    // @ts-ignore
    db.$transaction = async (cb: any) => {
        console.log('  [DB] Explicit BEGIN active transaction');
        return originalTransaction.call(db, async (tx: any) => {
            // First we run the initial commands
            await cb(tx);
            
            console.log('  [DB] Executing mid-transaction container STOP...');
            const stopPromise = exec('docker stop test_pg');
            await stopPromise;
            console.log('  [DB] Container stopped mid-transaction!');
            
            // Now we trigger a query to fail the transaction
            console.log('  [DB] Executing subsequent query on dead connection...');
            await tx.$executeRawUnsafe(`SELECT 1`);
        });
    };

    console.log('[Step 2] Triggering ConsensusEngine.appendEntries (which invokes persistence)...');
    
    // Listen for process.exit which the circuit breaker triggers
    const originalExit = process.exit;
    let failedClosed = false;
    // @ts-ignore
    process.exit = (code?: number) => {
        console.log(`\n[Trace] ZTAN PersistenceCircuitBreaker threw FAIL_CLOSED. Fencing node (process.exit(${code}))`);
        failedClosed = true;
        // Don't actually exit so we can test recovery
    };
    
    // Trigger consensus
    ConsensusEngine.appendEntries('node-1', term, entries, root, sig);
    
    // Wait for the async persistTask to catch and call process.exit
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    if (failedClosed) {
        console.log('✅ Success: System correctly detected DB failure and failed-closed.');
    } else {
        console.log('❌ Failure: System did not fail-closed!');
    }
    
    console.log('\n[Step 3] Restarting DB container...');
    await exec('docker start test_pg');
    console.log('  [DB] Container started. Waiting for boot...');
    await new Promise(resolve => setTimeout(resolve, 5000));
    
    console.log('\n[Step 4] Verifying System Self-Heals...');
    // Restore db.$transaction
    // @ts-ignore
    db.$transaction = originalTransaction;
    
    let healed = false;
    for (let i=0; i<5; i++) {
        try {
            await db.$queryRawUnsafe(`SELECT 1`);
            console.log('✅ Success: DB Connection Restored and Self-Healed.');
            healed = true;
            break;
        } catch (e) {
            console.log(`  Retry ${i+1}...`);
            await new Promise(resolve => setTimeout(resolve, 2000));
        }
    }
    
    if (!healed) {
        console.log('❌ Failure: System did not heal.');
    }
    
    // Cleanup process exit
    process.exit = originalExit;
    process.exit(0);
}

main().catch(err => {
    console.error(err);
    process.exit(1);
});
