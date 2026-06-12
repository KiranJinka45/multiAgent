import '../test/integration/setup-env.js';
import { CryptoUtils } from '../packages/evidence-lifecycle/src/crypto-utils.js';
import { ThresholdBls } from '../packages/ztan-crypto/src/ztan-bls.js';
import { StabilityCircuit } from '../apps/operational-protocol/src/stability-circuit.js';
import { writeFileSync, mkdirSync } from 'fs';
import { join } from 'path';
import * as crypto from 'crypto';

async function main() {
    console.log('Generating Phase 7 Evidence Bundles...');

    // Make sure evidence directory exists
    mkdirSync('evidence', { recursive: true });

    // Generate Ed25519 keys for v1.8 and v1.9 offline signatures
    const keys = CryptoUtils.generateKeyPair();

    // -------------------------------------------------------------
    // v1.8 Evidence (Offline Attestation with Ed25519)
    // -------------------------------------------------------------
    const containmentData = { locDelta: 0, fileGlobs: [], pathTraversalDetected: false };
    const rollbackData = { preMutationSnapshotId: 'snap-v1.8', revertHash: '0xrev18' };
    const sandboxData = { isolationLevel: 'native' };

    const evidenceV1_8 = {
        missionId: 'mission-repro-v1.8',
        version: 'v1.8',
        timestamp: Date.now(),
        governanceEpoch: 'epoch-v1.8',
        merkleLineage: { rootHash: '0xroot18', inclusionHash: '0xinc18', siblings: [] },
        publicKeyPem: keys.publicKey, // Provide public key for out-of-band verification
        containmentProof: {
            ...containmentData,
            signature: CryptoUtils.signPayload(containmentData, keys.privateKey)
        },
        recoveryAssurance: {
            ...rollbackData,
            engineSignature: CryptoUtils.signPayload(rollbackData, keys.privateKey)
        },
        sandboxAttestation: {
            ...sandboxData,
            providerSignature: CryptoUtils.signPayload(sandboxData, keys.privateKey)
        },
        economicRationality: { tokenConsumption: 5, costCeiling: 50, withinBudget: true }
    };

    // -------------------------------------------------------------
    // v1.9 Evidence (Offline Attestation + Notary check)
    // -------------------------------------------------------------
    const v19Hash = crypto.createHash('sha256').update('mission-repro-v1.9' + 'epoch-v1.9').digest('hex');
    const evidenceV1_9 = {
        ...evidenceV1_8,
        missionId: 'mission-repro-v1.9',
        version: 'v1.9',
        timestamp: Date.now(),
        governanceEpoch: 'epoch-v1.9',
        containmentProof: {
            ...containmentData,
            signature: CryptoUtils.signPayload(containmentData, keys.privateKey)
        },
        recoveryAssurance: {
            ...rollbackData,
            engineSignature: CryptoUtils.signPayload(rollbackData, keys.privateKey)
        },
        sandboxAttestation: {
            ...sandboxData,
            providerSignature: CryptoUtils.signPayload(sandboxData, keys.privateKey)
        },
        _audit: {
            hash: v19Hash,
            prevHash: '0x0',
            ts: Date.now(),
            ztan_consensus: false,
            notarized: true,
            notarySeq: 101
        }
    };

    // -------------------------------------------------------------
    // v1.10 Evidence (BLS Threshold + ZK Stability Bound)
    // -------------------------------------------------------------
    const sequenceId = 2026;
    const ceremonyId = 'ceremony-gov';
    const threshold = 2;
    const payload = `${sequenceId}|PASS|node-a`;
    const messageHash = crypto.createHash('sha256').update(payload).digest('hex');
    const nodeIds = ['SRE-ENGINE-01', 'ZTAN-SIDECAR-02', 'ZTAN-EXTERNAL-03'];
    
    // Perform DKG using real ThresholdBls
    const dkg = await ThresholdBls.dkg(threshold, 3, nodeIds);
    const eligiblePublicKeys = dkg.shares.map(s => s.verificationKey);
    
    // Sign with 2 shares to meet threshold 2
    const sig1 = await ThresholdBls.signShare(
        messageHash,
        dkg.shares[0].secretShare,
        ceremonyId,
        threshold,
        eligiblePublicKeys
    );
    const sig2 = await ThresholdBls.signShare(
        messageHash,
        dkg.shares[1].secretShare,
        ceremonyId,
        threshold,
        eligiblePublicKeys
    );
    
    const aggregatedSignature = await ThresholdBls.aggregate(
        [sig1, sig2],
        [dkg.shares[0].index, dkg.shares[1].index]
    );
    
    // Generate valid ZK proof
    const zkProof = await StabilityCircuit.generateProof(1.0, 120, 15000, 0.85);

    // Compute ZTAN v1.10 hash
    const v110Hash = crypto.createHash('sha256').update('mission-repro-v1.10' + 'epoch-v1.10' + aggregatedSignature).digest('hex');

    const evidenceV1_10 = {
        sequenceId,
        version: 'v1.10',
        timestamp: Date.now(),
        elite: {
            multiAgent: {
                consensus: {
                    action: 'RESTART'
                }
            }
        },
        governance: {
            isCertified: true,
            mode: 'AUTONOMOUS',
            attestations: []
        },
        _audit: {
            hash: v110Hash,
            prevHash: '0xabc123',
            ts: Date.now(),
            ztan_consensus: true,
            aggregatedSignature,
            zkProof,
            notarized: true,
            notarySeq: 202
        },
        _verification_data: {
            acc: 1.0,
            ldet: 120,
            lsla: 15000
        },
        // We pack the key verification context here for the portable auditor
        masterPublicKey: dkg.masterPublicKey,
        threshold,
        eligiblePublicKeys,
        signers: ['SRE-ENGINE-01', 'ZTAN-SIDECAR-02'],
        ceremonyId,
        messageHash,
        payload
    };

    // Write to evidence directory
    writeFileSync(join('evidence', 'evidence_v1.8.json'), JSON.stringify(evidenceV1_8, null, 2));
    writeFileSync(join('evidence', 'evidence_v1.9.json'), JSON.stringify(evidenceV1_9, null, 2));
    writeFileSync(join('evidence', 'evidence_v1.10.json'), JSON.stringify(evidenceV1_10, null, 2));

    console.log('Successfully generated evidence files!');
}

main().catch(err => {
    console.error('Failed to generate evidence:', err);
    process.exit(1);
});
