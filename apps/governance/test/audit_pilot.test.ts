import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 13: Audit Execution & Pilot Operationalization', () => {
    const BASE_T = 2;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Audit: Cryptographic Governance Receipt Generation', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const eventId = 'receipt-test-001';

        // 1. Trigger Slashing
        engine.enforceSlashing('node-5', { eventId, proofId: 'proof-123' });

        // 2. Verify Receipt
        const receipts = (engine as any).receipts.get(eventId);
        expect(receipts.length).toBe(1);
        expect(receipts[0].type).toBe('SLASHING');
        expect(receipts[0].signature).toBeDefined();
        expect(receipts[0].details.slashedNode).toBe('node-5');
    });

    it('SLO: Convergence Time Objective Adherence', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const eventId = 'slo-test-001';

        // Simulate ceremony
        await engine.recordAttestation({
            eventId, verifierId: 'node-1', status: 'PASS', 
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });
        
        const res = await engine.recordAttestation({
            eventId, verifierId: 'node-2', status: 'PASS', 
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });

        expect(res?.status).toBe('COMPLETED');
        
        const health = engine.getOperationalHealth(eventId);
        expect(health).not.toBeNull();
        expect(health!.convergenceTimeMs).toBeLessThan(5000); 
    });

    it('SLO: Emergency Recovery RTO Verification', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const eventId = 'rto-test-001';

        // 1. Activate Emergency (Threshold 51% of 500 = 255)
        engine.attestEmergency(eventId, 'node-1');
        engine.attestEmergency(eventId, 'node-2');
        engine.attestEmergency(eventId, 'node-3');

        // 2. Record 3 attestations (Total weight 300 >= 255)
        await engine.recordAttestation({ eventId, verifierId: 'node-1', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });
        await engine.recordAttestation({ eventId, verifierId: 'node-2', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });
        const res = await engine.recordAttestation({
            eventId, verifierId: 'node-3', status: 'PASS', 
            expectedNode: 'target', confidence: 1.0, timestamp: Date.now()
        });

        expect(res).not.toBeNull();
        expect(res?.governanceMode).toBe('EMERGENCY_RECOVERY');
        
        const health = engine.getOperationalHealth(eventId);
        expect(health!.recoveryTimeMs).toBeLessThan(10000); // 10s RTO
    });

    it('Audit: Multi-Event Receipt Traceability', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const eventId = 'trace-test-001';

        engine.enforceSlashing('node-1', { eventId, proofId: 'p1' });
        engine.attestEmergency(eventId, 'node-2');
        engine.attestEmergency(eventId, 'node-3');
        engine.attestEmergency(eventId, 'node-4');

        const receipts = (engine as any).receipts.get(eventId);
        expect(receipts.length).toBe(2);
        expect(receipts[0].type).toBe('SLASHING');
        expect(receipts[1].type).toBe('EMERGENCY_ACTIVATION');
    });
});
