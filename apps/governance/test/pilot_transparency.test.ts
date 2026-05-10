import { describe, it, expect } from 'vitest';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 14: Pilot Operations & Public Transparency', () => {
    const BASE_T = 2;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    it('Transparency: Public Receipt Validation Utility', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        const eventId = 'transparency-test-001';

        // 1. Generate Receipt
        engine.enforceSlashing('node-5', { eventId });
        const receipts = (engine as any).receipts.get(eventId);
        const receipt = receipts[0];

        // 2. Verify using Public Static Utility
        const isValid = ConsensusEngine.verifyReceipt(receipt);
        expect(isValid).toBe(true);

        // 3. Verify that tampering is detected
        const tampered = { ...receipt, details: { ...receipt.details, slashedNode: 'node-1' } };
        const isTamperedValid = ConsensusEngine.verifyReceipt(tampered);
        expect(isTamperedValid).toBe(false);
    });

    it('Operations: Signed Operational Report Accuracy', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        // Ceremony 1: Successful
        await engine.recordAttestation({ eventId: 'c1', verifierId: 'node-1', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });
        await engine.recordAttestation({ eventId: 'c1', verifierId: 'node-2', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });

        // Ceremony 2: Emergency
        engine.attestEmergency('c2', 'node-1');
        engine.attestEmergency('c2', 'node-2');
        engine.attestEmergency('c2', 'node-3');

        // Ceremony 3: Slashing
        engine.enforceSlashing('node-5', { eventId: 'c3' });

        // Generate Report
        const report = engine.generateOperationalReport();
        
        expect(report.metrics.totalCeremonies).toBe(2); // c1, c2 (c3 was just a slashing event, not a ceremony start)
        expect(report.metrics.successRate).toBe(0.5); // c1 succeeded, c2 pending
        expect(report.metrics.emergencyCount).toBe(1);
        expect(report.metrics.slashingCount).toBe(1);
        expect(report.networkSignature).toBeDefined();
    });

    it('Pilot: Multi-Ceremony Convergence Telemetry', async () => {
        const engine = new ConsensusEngine(BASE_T, 5, NODE_IDS);
        
        for (let i = 0; i < 5; i++) {
            const ev = `ceremony-${i}`;
            await engine.recordAttestation({ eventId: ev, verifierId: 'node-1', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });
            await engine.recordAttestation({ eventId: ev, verifierId: 'node-2', status: 'PASS', expectedNode: 'target', confidence: 1.0, timestamp: Date.now() });
        }

        const report = engine.generateOperationalReport();
        expect(report.metrics.totalCeremonies).toBe(5);
        expect(report.metrics.successRate).toBe(1.0);
        expect(report.metrics.avgConvergenceTimeMs).toBeGreaterThan(0);
        expect(report.metrics.avgConvergenceTimeMs).toBeLessThan(1000); // Should be very fast
    });
});
