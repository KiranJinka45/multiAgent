import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { ConsensusEngine, NodeState, LogEntry } from '../src/ledger/consensus.js';
import { MerkleTree } from '../src/ledger/merkle.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../../../');
const reportsDir = path.join(projectRoot, 'reports');

const runId = `FALSIFICATION-S-CRASH-DUMPER-${Date.now()}`;
const timestampStr = new Date().toISOString();

console.log('==================================================');
console.log(`🧨 RUNNING CAMPAIGN S: FAIL-CLOSED CRASH REPRODUCIBILITY`);
console.log(`Run ID: ${runId}`);
console.log(`Timestamp: ${timestampStr}`);
console.log('==================================================\n');

async function main() {
    console.log('Setting test sandbox environment...');
    process.env.ZTAN_TEST_NO_EXIT = 'true'; // Allow script to inspect crash captures without exiting

    ConsensusEngine.initializeCluster(3);
    const nodes = ConsensusEngine.getClusterNodes();

    // Force node-1 as Leader
    const leader = nodes.get('node-1')!;
    leader.state = NodeState.LEADER;
    leader.currentTerm = 1;

    // Propose an initial valid commit to build term history
    const entry1: LogEntry = { term: 1, command: 'VALID_TX_01' };
    leader.log.push(entry1);
    
    console.log('Seeding overlapping BFT prepare quorums into node-2...');
    const node2 = nodes.get('node-2')!;
    
    const correctRoot = MerkleTree.computeRoot([entry1]);
    
    // Seed 2 prepares for correctRoot (Quorum 1)
    node2.preparePool.push({
        nodeId: 'node-1',
        term: 1,
        merkleRoot: correctRoot,
        signature: ''
    });
    node2.preparePool.push({
        nodeId: 'node-2',
        term: 1,
        merkleRoot: correctRoot,
        signature: ''
    });
    
    // Seed 2 prepares for ROOT_B (Quorum 2)
    node2.preparePool.push({
        nodeId: 'node-3',
        term: 1,
        merkleRoot: 'ROOT_B',
        signature: ''
    });
    node2.preparePool.push({
        nodeId: 'node-2',
        term: 1,
        merkleRoot: 'ROOT_B',
        signature: ''
    });

    // Make node-2 believe we are replicating in term 1
    node2.currentTerm = 0;
    
    // Call appendEntries. When evaluating node-2's pool, it will detect the quorum split and throw ZTAN_INVARIANT_VIOLATION!
    try {
        ConsensusEngine.appendEntries('node-1', 1, [entry1], correctRoot, null);
        console.log('💥 VULNERABLE: Divergent view did not trigger invariant crash.');
    } catch (err: any) {
        if (err.message.includes('ZTAN_INVARIANT_VIOLATION')) {
            console.log(`\n🛡️ [SECURE] Invariant Breached: ${err.message}`);
            console.log('Checking generated forensic crash artifacts...\n');

            const expectedFiles = [
                'ztan-wal-crash.json',
                'ztan-prepares-crash.json',
                'ztan-nodes-crash.json',
                'ztan-fuzz-schedule-crash.json'
            ];

            let allFound = true;
            for (const file of expectedFiles) {
                const filePath = path.join(reportsDir, file);
                const exists = fs.existsSync(filePath);
                console.log(`   - ${file}: ${exists ? '🟢 WRITTEN' : '🔴 MISSING'}`);
                if (!exists) allFound = false;
            }

            if (allFound) {
                console.log('\n==================================================');
                console.log('Fail-Closed Failure Capture: 🛡️ FULLY OPERATIONAL');
                console.log('Observed successful bypasses: 0 / 1 modeled vectors');
                console.log('==================================================\n');
            } else {
                console.log('\n==================================================');
                console.log('Fail-Closed Failure Capture: 💥 DEFECTIVE (Files missing)');
                console.log('==================================================\n');
            }
        } else {
            console.error('Unexpected crash error:', err);
        }
    }
}

main().catch(err => {
    console.error('Crash dumper run failed:', err);
    process.exit(1);
});
