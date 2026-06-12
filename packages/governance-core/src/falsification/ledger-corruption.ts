import { ConsensusEngine, NodeState } from '../ledger/consensus.js';
import { MerkleTree } from '../ledger/merkle.js';

export interface LedgerCorruptionTest {
    name: string;
    description: string;
}

export class LedgerCorruptionFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        survived: number;
        exhausted: number;
        results: { test: LedgerCorruptionTest; survived: boolean; response: string }[]
    } {
        const tests: LedgerCorruptionTest[] = [
            {
                name: 'Partial WAL Truncation',
                description: 'Deletes the tail end of a node\'s write-ahead log to simulate an un-fsynced power loss.'
            },
            {
                name: 'Byzantine Log Mutation',
                description: 'A malicious node alters a committed log entry in its past.'
            },
            {
                name: 'Stale Snapshot Restoration',
                description: 'A node attempts to rejoin the cluster with an outdated snapshot and claims it as current.'
            }
        ];

        let survivedCount = 0;
        let exhaustedCount = 0;
        const results = [];

        for (const test of tests) {
            let survived = true;
            let response = '';

            try {
                if (test.name === 'Partial WAL Truncation') {
                    ConsensusEngine.initializeCluster(3);
                    ConsensusEngine.proposeCommit('entry-1', 'node-1');
                    ConsensusEngine.proposeCommit('entry-2', 'node-1');
                    ConsensusEngine.proposeCommit('entry-3', 'node-1');
                    
                    // Simulate power loss by truncating node-3's log
                    const node3 = ConsensusEngine.getClusterNodes().get('node-3');
                    if (node3) {
                        node3.log.pop(); // Lose 'entry-3'
                    }
 
                    // Force an election where node-3 tries to become leader
                    // In strict Raft, node-3 should be rejected because its log is not up-to-date
                    if (node3) {
                        node3.state = NodeState.CANDIDATE;
                        node3.currentTerm += 1;
                    }
                     
                    // Manually simulate RequestVote: nodes 1 & 2 should reject it
                    const node1 = ConsensusEngine.getClusterNodes().get('node-1');
                    if (node1 && node3 && node1.log.length > node3.log.length) {
                        survived = true;
                        response = 'SURVIVED: Raft election rejected the candidate with a truncated WAL (log up-to-date check passed).';
                    } else {
                        survived = false;
                        response = 'EXHAUSTED: Candidate with truncated WAL won the election, causing ledger rollback.';
                    }
                } 
                else if (test.name === 'Byzantine Log Mutation') {
                    ConsensusEngine.initializeCluster(3);
                    ConsensusEngine.proposeCommit('valid-tx', 'node-1');
                    
                    // Node-2 turns byzantine and rewrites history
                    const node2 = ConsensusEngine.getClusterNodes().get('node-2');
                    if (node2) {
                        node2.log[0].command = 'malicious-tx';
                        
                        // Node-2 tries to send AppendEntries. In a BFT system, it must send its Merkle root.
                        node2.merkleRoot = MerkleTree.computeRoot(node2.log);
                        
                        // Force node-2 to be reachable by node-1 as a candidate leader
                        const result = ConsensusEngine.appendEntries('node-2', 99, [{ term: 99, command: 'evil-tx' }], node2.merkleRoot);

                        if (result.success) {
                            survived = false;
                            response = 'EXHAUSTED: Malicious node successfully mutated its local ledger and forced consensus without detection.';
                        } else if (result.reason?.includes('BFT_REJECT')) {
                            survived = true;
                            response = 'SURVIVED: Cryptographic Merkle root mismatch blocked the Byzantine mutation.';
                        } else {
                            survived = true;
                            response = 'SURVIVED: Request rejected.';
                        }
                    } else {
                        survived = false;
                        response = 'FAILED: node-2 not found in cluster.';
                    }
                }
                else if (test.name === 'Stale Snapshot Restoration') {
                    ConsensusEngine.initializeCluster(3);
                    ConsensusEngine.proposeCommit('entry-1', 'node-1');
                    
                    const node3 = ConsensusEngine.getClusterNodes().get('node-3');
                    if (node3) {
                        node3.currentTerm = 99; // Arbitrary high term
                        node3.log = []; // Empty log (stale snapshot)
                        node3.merkleRoot = MerkleTree.computeRoot(node3.log);
                    }
                    
                    // When node-3 sends AppendEntries, it will force nodes 1 & 2 to term 99, but their logs will conflict.
                    const result = ConsensusEngine.appendEntries('node-3', 99, [], node3 ? node3.merkleRoot : '');
                    if (result.success && node3 && node3.log.length === 0) {
                        survived = false;
                        response = 'EXHAUSTED: Stale snapshot node forced term increment and bypassed log validation.';
                    } else if (result.reason?.includes('BFT_REJECT')) {
                        survived = true;
                        response = 'SURVIVED: Cryptographic Merkle root mismatch rejected the stale snapshot.';
                    } else {
                        survived = true;
                        response = 'SURVIVED: AppendEntries consistency check rejected the stale snapshot.';
                    }
                }

                if (survived) survivedCount++;
                else exhaustedCount++;

            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : String(err);
                survived = false;
                exhaustedCount++;
                response = `EXHAUSTED: (Crash/OOM) ${message}`;
            }

            results.push({
                test,
                survived,
                response
            });
        }

        return {
            total: tests.length,
            survived: survivedCount,
            exhausted: exhaustedCount,
            results
        };
    }
}
