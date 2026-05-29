import { ConsensusEngine } from '../ledger/consensus.js';

export interface PartitionTest {
    name: string;
    partitions: { nodeId: string; isAlive: boolean; reachablePeers: string[] }[];
    event: string;
    expectedResult: string;
}

export class ConsensusPartitionFuzzer {
    static runFuzzingCampaign(): {
        total: number;
        secure: number;
        vulnerable: number;
        results: { test: PartitionTest; secure: boolean; response: string }[]
    } {
        const tests: PartitionTest[] = [
            {
                name: 'Split-Brain Divergence (2 distinct partitions of 2/3 nodes)',
                // Simulating a partition where both sides think they have quorum but cannot reach each other
                // A true split-brain where neither has quorum (e.g., node-1 & node-2 can't reach node-3, but node-3 is dead so they still have 2/3). 
                // Wait, if node-1 and node-2 can reach each other, that IS a quorum of a 3-node cluster.
                // Let's model a 5-node cluster split 2 / 2 / 1. Neither side has quorum (3).
                partitions: [
                    { nodeId: 'node-1', isAlive: true, reachablePeers: ['node-2'] },
                    { nodeId: 'node-2', isAlive: true, reachablePeers: ['node-1'] },
                    { nodeId: 'node-3', isAlive: true, reachablePeers: ['node-4'] },
                    { nodeId: 'node-4', isAlive: true, reachablePeers: ['node-3'] },
                    { nodeId: 'node-5', isAlive: false, reachablePeers: [] }
                ],
                event: 'Simultaneous Commit Request',
                expectedResult: 'QUORUM_LOSS_OR_STALE_REJECT'
            },
            {
                name: 'Asymmetric Connectivity (A sees B, B sees C, C sees A)',
                // In a 3-node cluster
                partitions: [
                    { nodeId: 'node-1', isAlive: true, reachablePeers: ['node-2'] }, // 1 can only send to 2
                    { nodeId: 'node-2', isAlive: true, reachablePeers: ['node-3'] }, // 2 can only send to 3
                    { nodeId: 'node-3', isAlive: true, reachablePeers: ['node-1'] }  // 3 can only send to 1
                ],
                event: 'Propose append with partial view',
                expectedResult: 'QUORUM_LOSS' // Strict Raft should reject without full acknowledgment (2 nodes minimum getting appendEntries)
            },
            {
                name: 'Leader Isolation (Leader writes locally without broadcast ack)',
                partitions: [
                    { nodeId: 'node-1', isAlive: true, reachablePeers: [] }, // Leader isolated
                    { nodeId: 'node-2', isAlive: true, reachablePeers: ['node-3'] },
                    { nodeId: 'node-3', isAlive: true, reachablePeers: ['node-2'] }
                ],
                event: 'Local WAL Append',
                expectedResult: 'QUORUM_LOSS' // Should immediately fail closed since it can't replicate
            }
        ];

        let secure = 0;
        let vulnerable = 0;
        const results = [];

        for (const test of tests) {
            ConsensusEngine.initializeCluster(test.partitions.length);
            ConsensusEngine.configurePartitions(test.partitions);
            
            const res = ConsensusEngine.proposeCommit('fuzz-commit', 'node-1');

            let isSecure = false;
            let response = res.reason;

            // In our hardened logic, ALL of these should fail to commit and thus be SECURE against bad writes.
            if (!res.committed) {
                isSecure = true;
            }

            if (isSecure) {
                secure++;
            } else {
                vulnerable++;
            }

            results.push({
                test,
                secure: isSecure,
                response
            });
        }

        return {
            total: tests.length,
            secure,
            vulnerable,
            results
        };
    }
}
