import { describe, it, expect, beforeAll } from 'vitest';
import * as bls from '@noble/bls12-381';
import * as crypto from 'crypto';
import { ThresholdBls, Canonical } from '@packages/ztan-crypto';
import { ThresholdCrypto } from '../src/crypto-utils';
import { ConsensusEngine } from '../src/consensus-engine';
import { TrustAttestation } from '../src/types';

// Configure noble-bls for Node.js environment
bls.utils.randomBytes = (bytes = 32) => crypto.randomBytes(bytes);

/**
 * ZTAN Operational Ceremony Simulation
 * Validates ConsensusEngine resilience against Byzantine faults and network churn.
 */
describe('ZTAN Operational Ceremony Simulation', () => {
    let consensus: ConsensusEngine;
    let masterPk: string;
    let nodeShares: any[];
    let eligiblePks: string[];
    
    const T = 3;
    const N = 5;
    const NODE_IDS = ['node-1', 'node-2', 'node-3', 'node-4', 'node-5'];

    beforeAll(async () => {
        consensus = new ConsensusEngine(T, N, NODE_IDS);
        // Setup DKG for the simulation
        nodeShares = await ThresholdCrypto.performDKG(NODE_IDS, T);
        masterPk = nodeShares[0].groupPublicKey;
        eligiblePks = await (ThresholdCrypto as any).getEligiblePublicKeys(NODE_IDS);
    });

    it('Simulation: Clean Ceremony (Success)', async () => {
        const eventId = 'event-clean';
        const msg = '0'.repeat(64);
        
        // 1. All nodes generate partial signatures
        const attestations: TrustAttestation[] = await Promise.all(
            nodeShares.map(async (s) => {
                const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
                return {
                    eventId,
                    verifierId: s.nodeId,
                    status: 'PASS',
                    partialSignature: sig
                };
            })
        );

        // 2. Process attestations one by one
        let result = null;
        for (const a of attestations) {
            result = await consensus.recordAttestation(a);
            if (result) break;
        }

        expect(result).not.toBeNull();
        expect(result?.isTrusted).toBe(true);
        expect(result?.aggregatedSignature).toBeDefined();

        // 3. Verify the final signature
        const isValid = await ThresholdCrypto.verifyAggregate(result!.aggregatedSignature!, msg, masterPk, T, NODE_IDS);
        expect(isValid).toBe(true);
    }, 20000);

    it('Simulation: Byzantine Fault Injection (Malicious Nodes)', async () => {
        const eventId = 'event-byzantine';
        const msg = '0'.repeat(64);
        
        const attestations: TrustAttestation[] = await Promise.all(
            nodeShares.map(async (s, i) => {
                const isMalicious = i >= 2; // Node 3, 4, 5 are malicious
                let sig: any;
                if (isMalicious) {
                    sig = {
                        nodeId: s.nodeId,
                        signature: 'f'.repeat(96),
                        payloadHash: msg,
                        timestamp: Date.now()
                    };
                } else {
                    sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
                }
                
                return {
                    eventId,
                    verifierId: s.nodeId,
                    status: isMalicious ? 'FAIL' : 'PASS',
                    partialSignature: sig
                };
            })
        );

        let result = null;
        for (const a of attestations) {
            result = await consensus.recordAttestation(a);
            if (result) break;
        }

        // With 3 fails, the consensus engine should mark it as NOT trusted
        expect(result?.isTrusted).toBe(false);
    }, 20000);

    it('Simulation: Network Churn (Late Joiners)', async () => {
        const eventId = 'event-churn';
        const msg = '0'.repeat(64);
        
        // Only 3 nodes respond (Minimum Threshold)
        const activeNodes = nodeShares.slice(0, 3);
        
        const attestations: TrustAttestation[] = await Promise.all(
            activeNodes.map(async (s) => {
                const sig = await ThresholdCrypto.signPartial(msg, s.share, s.nodeId, T, NODE_IDS);
                return {
                    eventId,
                    verifierId: s.nodeId,
                    status: 'PASS',
                    partialSignature: sig
                };
            })
        );

        let result = null;
        for (const a of attestations) {
            result = await consensus.recordAttestation(a);
            if (result) break;
        }

        expect(result?.isTrusted).toBe(true);
        const isValid = await ThresholdCrypto.verifyAggregate(result!.aggregatedSignature!, msg, masterPk, T, NODE_IDS);
        expect(isValid).toBe(true);
    }, 20000);
});
