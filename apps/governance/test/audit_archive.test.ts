import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 15: Independent Audit & Immutable Archive', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Archive: Immutable Log Continuity', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const ev1 = 'archive-test-001';
        const ev2 = 'archive-test-002';

        // 1. First Action: Slashing
        engine.enforceSlashing('node-5', { eventId: ev1 });
        const root1 = (engine as any).archiveRoot;
        expect(root1).not.toBe('0'.repeat(64));
        expect((engine as any).archive.length).toBe(1);

        // 2. Second Action: Operational Report
        engine.generateOperationalReport();
        const root2 = (engine as any).archiveRoot;
        expect(root2).not.toBe(root1);
        expect((engine as any).archive.length).toBe(2);

        // 3. Third Action: Emergency Activation
        engine.attestEmergency(ev2, 'node-1');
        engine.attestEmergency(ev2, 'node-2');
        engine.attestEmergency(ev2, 'node-3');
        const root3 = (engine as any).archiveRoot;
        expect(root3).not.toBe(root2);
        expect((engine as any).archive.length).toBe(3);
    });

    it('Archive: Integrity Verification & Tamper Detection', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.enforceSlashing('node-5', { eventId: 't1' });
        engine.generateOperationalReport();

        // 1. Initial Integrity Check
        expect(engine.verifyArchiveIntegrity()).toBe(true);

        // 2. Malicious Tampering: Modify a historical artifact
        const firstEntry = (engine as any).archive[0];
        firstEntry.artifact.details.slashedNode = 'node-1'; // Tamper!

        // 3. Verify Tamper Detection
        expect(engine.verifyArchiveIntegrity()).toBe(false);
    });

    it('Archive: Hash Chain Sequence Validation', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        engine.enforceSlashing('node-1', { eventId: 's1' });
        engine.enforceSlashing('node-2', { eventId: 's2' });

        const archive = (engine as any).archive;
        expect(archive[1].prevRoot).toBe(archive[0].root);
    });
});
