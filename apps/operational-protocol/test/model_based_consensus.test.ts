import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';
import { TrustAttestation, CeremonyStatus } from '../src/types';
import { AdversarialNetwork } from './helpers/adversarial_sim';

/**
 * Abstract Model for ZTAN Ceremony
 * Represents the "Ground Truth" safety invariants.
 */
class CeremonyModel {
    public status: CeremonyStatus = 'PENDING';
    public proposalHash?: string;
    public signers: Set<string> = new Set();
    public threshold: number;

    constructor(t: number) {
        this.threshold = t;
    }

    // Abstract Transition Function
    public transition(attestation: TrustAttestation) {
        if (this.status === 'COMPLETED' || this.status === 'FAILED' || this.status === 'ABORTED') {
            return; // Terminal state
        }

        const payload = attestation.partialSignature;
        if (!payload) return;

        // Proposal Locking Invariant
        if (!this.proposalHash) {
            this.proposalHash = payload.payloadHash;
        } else if (this.proposalHash !== payload.payloadHash) {
            this.status = 'ABORTED';
            return;
        }

        // Signer Set Invariant
        if (this.signers.has(attestation.verifierId)) return;
        this.signers.add(attestation.verifierId);

        // State Transition Logic
        if (this.signers.size >= this.threshold) {
            this.status = 'COMPLETED';
        } else {
            this.status = 'ACTIVE';
        }
    }
}

describe('ZTAN Model-Based Adversarial Simulation', () => {
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];
    const SEED = 'ZTAN_MODEL_CHECK_001';

    let nodeShares: any[];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
    });

    it('Safety Invariant: Implementation vs Model under Adversarial Scheduling', async () => {
        const eventId = 'adversarial-check-001';
        const msg = 'CORRECT_PROPOSAL'.repeat(4);
        
        const engine = new ConsensusEngine(T, N, NODE_IDS);
        const model = new CeremonyModel(T);
        const network = new AdversarialNetwork<TrustAttestation>(SEED);

        // 1. Generate honest attestations
        const attestations: TrustAttestation[] = await Promise.all(
            nodeShares.map(async (s) => {
                const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
                return {
                    eventId,
                    verifierId: s.nodeId,
                    status: 'PASS',
                    partialSignature: sig,
                    expectedNode: 'target',
                    confidence: 1.0,
                    timestamp: Date.now()
                };
            })
        );

        // 2. Schedule them with extreme jitter and duplication
        attestations.forEach(a => network.send(a, { 
            maxDelay: 50, 
            duplicateProbability: 0.2, 
            reorder: true 
        } as any));

        // 3. Run simulation ticks
        let ticks = 0;
        let lastEngineStatus: CeremonyStatus = 'PENDING';

        while ((network.pendingCount > 0 || lastEngineStatus === 'PENDING' || lastEngineStatus === 'ACTIVE') && ticks < 200) {
            const readyMessages = network.tick();
            
            for (const msg of readyMessages) {
                // Update Model (Ground Truth)
                model.transition(msg);

                // Update Implementation
                const result = await engine.recordAttestation(msg);
                if (result) {
                    lastEngineStatus = result.status;
                    
                    // --- TEMPORAL INVARIANT: SAFETY ---
                    // If the engine finalizes, it MUST match the model's logic
                    if (result.status === 'COMPLETED') {
                        expect(model.status).toBe('COMPLETED');
                        expect(model.signers.size).toBeGreaterThanOrEqual(T);
                    }
                }
            }
            ticks++;
        }

        // 4. VERIFY FINAL STATE PARITY
        // (Access private state for model checking)
        const finalEngineStatus = (engine as any).stateMap.get(eventId)?.status || lastEngineStatus;
        
        // Note: The engine might be 'ACTIVE' if not enough messages arrived due to drops 
        // (but we didn't drop in this test).
        expect(finalEngineStatus).toBe(model.status);
        console.log(`Simulation complete in ${ticks} ticks. Final Status: ${finalEngineStatus}`);
    }, 30000);

    it('Safety Invariant: Mixed Proposals Rejection under Jitter', async () => {
        const eventId = 'adversarial-check-mixed';
        const msgA = 'PROPOSAL_A'.repeat(8);
        const msgB = 'PROPOSAL_B'.repeat(8);
        
        const engine = new ConsensusEngine(T, N, NODE_IDS);
        const model = new CeremonyModel(T);
        const network = new AdversarialNetwork<TrustAttestation>(SEED + '_MIXED');

        // Mixed attestations
        for (let i = 0; i < N; i++) {
            const m = i < 2 ? msgA : msgB; // 2 for A, 3 for B
            const s = nodeShares[i];
            const sig = await ThresholdCrypto.signPartial(m, s.share, s.nodeId, T, NODE_IDS);
            network.send({
                eventId,
                verifierId: s.nodeId,
                status: 'PASS',
                partialSignature: sig,
                expectedNode: 'target',
                confidence: 1.0,
                timestamp: Date.now()
            }, { maxDelay: 20 });
        }

        let ticks = 0;
        let aborted = false;
        while (network.pendingCount > 0 && ticks < 100) {
            const ready = network.tick();
            for (const msg of ready) {
                model.transition(msg);
                const res = await engine.recordAttestation(msg);
                if (res?.status === 'ABORTED') aborted = true;
            }
            ticks++;
        }

        // Because they were mixed, and N=5, T=3, neither can reach T honestly 
        // if the engine locks the first one it sees.
        // The model says ABORTED if it sees a mismatch.
        expect(model.status).toBe('ABORTED');
        expect(aborted).toBe(true);
    }, 30000);
});
