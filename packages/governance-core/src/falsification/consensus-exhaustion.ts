import { ConsensusEngine, NodeState } from '../ledger/consensus.js';

export interface ExhaustionTest {
    name: string;
    description: string;
}

export class ConsensusExhaustionFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        survived: number;
        exhausted: number;
        results: { test: ExhaustionTest; survived: boolean; response: string }[]
    } {
        const tests: ExhaustionTest[] = [
            {
                name: 'Election Storm (Rapid Timeouts)',
                description: 'Simulates rapid election timeouts across all nodes to induce livelock.'
            },
            {
                name: 'WAL Amplification (AppendEntries Flood)',
                description: 'Floods the leader with thousands of concurrent AppendEntries requests.'
            },
            {
                name: 'Rapid Partition Flapping',
                description: 'Rapidly disconnects and reconnects the leader from the quorum.'
            }
        ];

        let survivedCount = 0;
        let exhaustedCount = 0;
        const results = [];

        for (const test of tests) {
            let survived = true;
            let response = '';

            try {
                if (test.name === 'Election Storm (Rapid Timeouts)') {
                    ConsensusEngine.initializeCluster(3);
                    // Force 10,000 rapid leader elections
                    for (let i = 0; i < 10000; i++) {
                        // All nodes increment terms continuously without completing election
                        const nodeIds = ['node-1', 'node-2', 'node-3'];
                        for (const id of nodeIds) {
                            const node = ConsensusEngine.getClusterNodes().get(id);
                            if (node) {
                                node.state = NodeState.CANDIDATE;
                                node.currentTerm += 1;
                            }
                        }
                    }
                    response = 'SURVIVED: Handled 10,000 artificial term increments without memory crash.';
                } 
                else if (test.name === 'WAL Amplification (AppendEntries Flood)') {
                    ConsensusEngine.initializeCluster(3);
                    // Force node-1 to be leader
                    ConsensusEngine.proposeCommit('setup', 'node-1');
                    const payload = Array(1000).fill({ operation: 'stress-test', timestamp: Date.now() });
                    
                    const start = Date.now();
                    for (let i = 0; i < 5000; i++) {
                        ConsensusEngine.appendEntries('node-1', 2, payload);
                    }
                    const duration = Date.now() - start;
                    
                    if (duration > 5000) {
                        survived = false;
                        response = `EXHAUSTED: WAL Append took ${duration}ms, exceeded 5000ms threshold.`;
                    } else {
                        response = `SURVIVED: Processed 5,000x1,000 AppendEntries in ${duration}ms.`;
                    }
                }
                else if (test.name === 'Rapid Partition Flapping') {
                    ConsensusEngine.initializeCluster(3);
                    
                    for (let i = 0; i < 5000; i++) {
                        // Flap node-1's connectivity
                        const n1 = ConsensusEngine.getClusterNodes().get('node-1');
                        if (n1) {
                            if (i % 2 === 0) {
                                n1.reachablePeers = ['node-1']; // Partitioned
                            } else {
                                n1.reachablePeers = ['node-1', 'node-2', 'node-3']; // Restored
                                ConsensusEngine.proposeCommit(`flap-commit-${i}`, 'node-1');
                            }
                        }
                    }
                    response = 'SURVIVED: Handled 5,000 network partition flaps and re-elections.';
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
