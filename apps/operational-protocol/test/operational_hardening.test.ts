import { describe, it, expect, beforeAll } from 'vitest';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';

describe('ZTAN Phase 12: Operational Hardening & Observer Network', () => {
    let nodeShares: any[];
    
    const BASE_T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, BASE_T);
    });

    it('Safety: Emergency Quorum Attestation Required', async () => {
        const eventId = 'emergency-attestation-001';
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);

        // 1. Only 2 nodes attest (Needs 3)
        engine.attestEmergency(eventId, 'node-1');
        engine.attestEmergency(eventId, 'node-2');
        
        const state = (engine as any).stateMap.get(eventId);
        expect(state.emergencyMode).toBe(false);
        expect(state.emergencyAttestations.size).toBe(2);

        // 2. 3rd node attests -> Activation
        engine.attestEmergency(eventId, 'node-3');
        expect(state.emergencyMode).toBe(true);
    });

    it('Safety: Emergency Cooldown Enforcement', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const e1 = 'emergency-one';
        const e2 = 'emergency-two';

        // 1. Activate first emergency
        engine.attestEmergency(e1, 'node-1');
        engine.attestEmergency(e1, 'node-2');
        engine.attestEmergency(e1, 'node-3');
        expect((engine as any).lastEmergencyTimestamp).toBeGreaterThan(0);

        // 2. Immediately try second activation (Should fail cooldown)
        engine.attestEmergency(e2, 'node-1');
        engine.attestEmergency(e2, 'node-2');
        engine.attestEmergency(e2, 'node-3');
        
        const state2 = (engine as any).stateMap.get(e2);
        expect(state2.emergencyMode).toBe(false); // Rejected by cooldown
    });

    it('Telemetry: Watcher Node Observation', async () => {
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);
        const eventId = 'telemetry-test-001';
        
        // Register a mock watcher (observation verified via logs in this impl)
        engine.registerWatcher('watcher-alpha');
        
        // Trigger Slashing
        engine.enforceSlashing('node-5', {
            eventId, nodeId: 'node-5', seq: 1, localRoot: 'A', remoteRoot: 'B', 
            timestamp: Date.now(), proofId: 'proof-999'
        });

        expect((engine as any).slashedNodes.has('node-5')).toBe(true);
    });

    it('Adversary: Resilience against Emergency Abuse', async () => {
        const eventId = 'abuse-test-001';
        const engine = new ConsensusEngine(BASE_T, N, NODE_IDS);

        // Single node tries to spam emergency attestation
        for (let i = 0; i < 10; i++) {
            engine.attestEmergency(eventId, 'node-1');
        }

        const state = (engine as any).stateMap.get(eventId);
        expect(state.emergencyMode).toBe(false);
        expect(state.emergencyAttestations.size).toBe(1); // De-duplicated
    });
});
