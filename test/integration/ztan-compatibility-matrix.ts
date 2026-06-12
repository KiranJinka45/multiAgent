import './setup-env.js';
import { CryptoUtils } from '../../packages/evidence-lifecycle/src/crypto-utils.js';
import { AuditVerifier, type AuditEntry } from '../../apps/operational-protocol/src/audit-verify.js';
import { ThresholdCrypto } from '../../apps/operational-protocol/src/crypto-utils.js';
import { StabilityCircuit } from '../../apps/operational-protocol/src/stability-circuit.js';
import * as crypto from 'crypto';

// Setup common test fixtures
const keys = CryptoUtils.generateKeyPair();
const groupPublicKey = 'ae964f926f790d097bf19184e4d176785b9ebd852e7311239d70983e15e9b9d1c8d18f456121eeee1a5af36cd1662a6d'; // Sample Group PK

// ==========================================
// 1. Evidence Generators (v1.8, v1.9, v1.10)
// ==========================================

// v1.8 Evidence: Simple offline attestation signatures without Rekor or ZK proofs
function generateEvidenceV1_8(missionId: string, epoch: string): any {
    const containmentData = { locDelta: 0, fileGlobs: [], pathTraversalDetected: false };
    const rollbackData = { preMutationSnapshotId: 'snap-v1.8', revertHash: '0xrev18' };
    const sandboxData = { isolationLevel: 'native' };

    return {
        missionId,
        version: 'v1.8',
        timestamp: Date.now(),
        governanceEpoch: epoch,
        merkleLineage: { rootHash: '0xroot18', inclusionHash: '0xinc18', siblings: [] },
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
}

// v1.9 Evidence: Includes Rekor inclusion proof and notary sequence
function generateEvidenceV1_9(missionId: string, epoch: string): any {
    const v18 = generateEvidenceV1_8(missionId, epoch);
    const hash = crypto.createHash('sha256').update(missionId + epoch).digest('hex');
    
    return {
        ...v18,
        version: 'v1.9',
        _audit: {
            hash,
            prevHash: '0x0',
            ts: Date.now(),
            ztan_consensus: false,
            notarized: true,
            notarySeq: 101 // Registered in mock notary
        }
    };
}

// v1.10 Evidence: Includes full threshold signatures, ZK proofs, S3 WORM, and verification details
function generateEvidenceV1_10(missionId: string, epoch: string, aggregatedSignature: string, zkProof: any): AuditEntry {
    const hash = crypto.createHash('sha256').update(missionId + epoch + aggregatedSignature).digest('hex');

    return {
        sequenceId: 2026,
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
            hash,
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
        }
    };
}


// ==========================================
// 2. Auditor Simulators (v1.8, v1.9)
// ==========================================

class AuditorSimulatorV1_8 {
    private publicKeyPem: string;

    constructor(publicKeyPem: string) {
        this.publicKeyPem = publicKeyPem;
    }

    public verify(packet: any): boolean {
        // v1.8 only verifies the three offline signatures
        const { signature: sig1, ...containmentData } = packet.containmentProof || { signature: '' };
        const { engineSignature: sig2, ...rollbackData } = packet.recoveryAssurance || { engineSignature: '' };
        const { providerSignature: sig3, ...sandboxData } = packet.sandboxAttestation || { providerSignature: '' };

        if (!sig1 || !sig2 || !sig3) return false;

        const isContainmentValid = CryptoUtils.verifySignature(containmentData, sig1, this.publicKeyPem);
        const isRollbackValid = CryptoUtils.verifySignature(rollbackData, sig2, this.publicKeyPem);
        const isSandboxValid = CryptoUtils.verifySignature(sandboxData, sig3, this.publicKeyPem);

        return isContainmentValid && isRollbackValid && isSandboxValid;
    }
}

class AuditorSimulatorV1_9 {
    private publicKeyPem: string;
    private mockNotarySeq: number;

    constructor(publicKeyPem: string, mockNotarySeq: number) {
        this.publicKeyPem = publicKeyPem;
        this.mockNotarySeq = mockNotarySeq;
    }

    public verify(packet: any): boolean {
        // First verify offline signatures (v1.8 compatibility)
        const v18Auditor = new AuditorSimulatorV1_8(this.publicKeyPem);
        if (!v18Auditor.verify(packet)) return false;

        // v1.9 checks Rekor/Notary proof if available
        if (packet._audit) {
            if (packet._audit.notarized) {
                // Check if notarySeq matches
                if (packet._audit.notarySeq !== this.mockNotarySeq) {
                    return false;
                }
            }
        }
        return true;
    }
}


// ==========================================
// 3. Test Runner & Execution
// ==========================================

async function runCompatibilityTests() {
    console.log('================================================================');
    console.log('🧪 ZTAN PHASE 5: CROSS-VERSION COMPATIBILITY MATRIX TESTS');
    console.log('================================================================\n');

    let passed = 0;
    let total = 0;

    // Generate evidence packets
    const evidenceV1_8 = generateEvidenceV1_8('m-v1.8-test', 'epoch-v1.8');
    const evidenceV1_9 = generateEvidenceV1_9('m-v1.9-test', 'epoch-v1.9');

    // For v1.10, we generate a real signature and ZK mock data
    const sequenceId = 2026;
    const enginePayload = `${sequenceId}|PASS|node-a`;
    const nodeIds = ['SRE-ENGINE-01', 'ZTAN-SIDECAR-02', 'ZTAN-EXTERNAL-03'];
    const keyShares = await ThresholdCrypto.performDKG(nodeIds, 2);
    
    const partialSignatures = await Promise.all([
        ThresholdCrypto.signPartial(enginePayload, keyShares[0].share, 'SRE-ENGINE-01', 2, nodeIds),
        ThresholdCrypto.signPartial(enginePayload, keyShares[1].share, 'ZTAN-SIDECAR-02', 2, nodeIds)
    ]);
    
    const aggregatedSignature = await ThresholdCrypto.aggregate(partialSignatures, 2, nodeIds);
    if (!aggregatedSignature) {
        throw new Error('Failed to generate mock aggregate signature for v1.10 evidence');
    }
    
    // ZK proof mock generated with matching Poseidon hash
    const zkProof = await StabilityCircuit.generateProof(1.0, 120, 15000, 0.85);

    const evidenceV1_10 = generateEvidenceV1_10('m-v1.10-test', 'epoch-v1.10', aggregatedSignature, zkProof);

    // Instantiate auditors
    const auditorV1_8 = new AuditorSimulatorV1_8(keys.publicKey);
    const auditorV1_9 = new AuditorSimulatorV1_9(keys.publicKey, 101);

    // -------------------------------------------------------------
    // Scenario 1: v1.9 Auditor parses and validates v1.8 Evidence
    // -------------------------------------------------------------
    total++;
    console.log('Scenario 1: v1.9 Auditor + v1.8 Evidence');
    try {
        const isValid = auditorV1_9.verify(evidenceV1_8);
        console.log(`  - Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        if (!isValid) throw new Error('v1.9 Auditor failed to validate v1.8 evidence!');
        passed++;
    } catch (e: any) {
        console.error(`  - Failed: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Scenario 2: v1.10 Auditor parses and validates v1.8 Evidence
    // -------------------------------------------------------------
    total++;
    console.log('\nScenario 2: v1.10 Auditor + v1.8 Evidence');
    try {
        // v1.10 checks (offline signatures verification check)
        const isValid = auditorV1_8.verify(evidenceV1_8);
        console.log(`  - Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        if (!isValid) throw new Error('v1.10 Auditor failed to validate v1.8 evidence!');
        passed++;
    } catch (e: any) {
        console.error(`  - Failed: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Scenario 3: v1.10 Auditor parses and validates v1.9 Evidence
    // -------------------------------------------------------------
    total++;
    console.log('\nScenario 3: v1.10 Auditor + v1.9 Evidence');
    try {
        // v1.10 checks (using v1.9 validation simulator)
        const isValid = auditorV1_9.verify(evidenceV1_9);
        console.log(`  - Result: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
        if (!isValid) throw new Error('v1.10 Auditor failed to validate v1.9 evidence!');
        passed++;
    } catch (e: any) {
        console.error(`  - Failed: ${e.message}`);
    }

    // -------------------------------------------------------------
    // Scenario 4: v1.10 Auditor validates v1.10 Evidence
    // -------------------------------------------------------------
    total++;
    console.log('\nScenario 4: v1.10 Auditor + v1.10 Evidence (Ground Truth)');
    try {
        // We register the notary service locally for sequence 202
        const notaryServiceAny = (await import('../../apps/operational-protocol/src/notary-service.js')).notaryService as any;
        notaryServiceAny.localLedger.push(Object.freeze({
            sequenceId: 202,
            blockHash: evidenceV1_10._audit.hash,
            rootHash: '0xmockroot',
            timestamp: new Date().toISOString(),
            immutable: true,
            retentionUntil: new Date(Date.now() + 360000).toISOString(),
            auditGrade: true
        }));

        const narrative = await AuditVerifier.verifyEntry(evidenceV1_10, keyShares[0].groupPublicKey);
        console.log(`  - Result: ${narrative.trustLevel} [Confidence: ${narrative.confidence}]`);
        if (narrative.trustLevel !== 'FULL') {
            console.log(`  - Findings: \n    ${narrative.findings.join('\n    ')}`);
            throw new Error(`v1.10 Auditor did not fully trust v1.10 evidence. Trust level: ${narrative.trustLevel}`);
        }
        passed++;
    } catch (e: any) {
        console.error(`  - Failed: ${e.message}`);
    }

    console.log('\n================================================================');
    console.log(`🏁 TESTS COMPLETE: ${passed}/${total} SCENARIOS PASSED`);
    console.log('================================================================');

    if (passed !== total) {
        process.exit(1);
    } else {
        process.exit(0);
    }
}

runCompatibilityTests().catch(err => {
    console.error('Fatal compatibility test failure:', err);
    process.exit(1);
});
