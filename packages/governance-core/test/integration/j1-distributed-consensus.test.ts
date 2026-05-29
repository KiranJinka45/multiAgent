import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../../src/ledger/consensus.js';

describe('Phase J1: Distributed Consensus & Partition Tolerance Tests', () => {
    it('should successfully commit ledger entries when all nodes in the cluster are healthy (3/3 active)', () => {
        ConsensusEngine.configureNodes([
            { nodeId: 'node-1', isAlive: true },
            { nodeId: 'node-2', isAlive: true },
            { nodeId: 'node-3', isAlive: true }
        ]);

        expect(ConsensusEngine.getQuorumSize()).toBe(2);
        expect(ConsensusEngine.getActiveCount()).toBe(3);
        expect(ConsensusEngine.hasQuorum()).toBe(true);

        const res = ConsensusEngine.proposeCommit('entry-1');
        expect(res.committed).toBe(true);
        expect(res.reason).toContain('COMMITTED');
    });

    it('should successfully commit ledger entries when a minority node is partitioned (2/3 active)', () => {
        ConsensusEngine.configureNodes([
            { nodeId: 'node-1', isAlive: true },
            { nodeId: 'node-2', isAlive: true },
            { nodeId: 'node-3', isAlive: false } // partitioned
        ]);

        expect(ConsensusEngine.getQuorumSize()).toBe(2);
        expect(ConsensusEngine.getActiveCount()).toBe(2);
        expect(ConsensusEngine.hasQuorum()).toBe(true);

        const res = ConsensusEngine.proposeCommit('entry-2');
        expect(res.committed).toBe(true);
        expect(res.reason).toContain('COMMITTED');
    });

    it('should fail-closed and deny commits when majority nodes are partitioned (1/3 active - quorum loss)', () => {
        ConsensusEngine.configureNodes([
            { nodeId: 'node-1', isAlive: true },
            { nodeId: 'node-2', isAlive: false }, // partitioned
            { nodeId: 'node-3', isAlive: false }  // partitioned
        ]);

        expect(ConsensusEngine.getQuorumSize()).toBe(2);
        expect(ConsensusEngine.getActiveCount()).toBe(1);
        expect(ConsensusEngine.hasQuorum()).toBe(false);

        const res = ConsensusEngine.proposeCommit('entry-3');
        expect(res.committed).toBe(false);
        expect(res.reason).toContain('QUORUM_LOSS');
    });
});
