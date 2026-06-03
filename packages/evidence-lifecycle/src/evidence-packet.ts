import { CryptoUtils } from './crypto-utils';

export interface MerkleProof {
    rootHash: string;
    inclusionHash: string;
    siblings: string[];
}

export interface ContainmentProof {
    locDelta: number;
    fileGlobs: string[];
    pathTraversalDetected: boolean;
    signature: string;
}

export interface RollbackProof {
    preMutationSnapshotId: string;
    revertHash: string;
    engineSignature: string;
}

export interface SandboxAttestation {
    isolationLevel: 'gvisor' | 'firecracker' | 'native';
    providerSignature: string;
}

export interface EconomicRationality {
    tokenConsumption: number;
    costCeiling: number;
    withinBudget: boolean;
}

export interface FinalizedEnvelope {
    missionId: string;
    timestamp: number;
    governanceEpoch: string;
    merkleLineage: MerkleProof;
    containmentProof: ContainmentProof;
    recoveryAssurance: RollbackProof;
    sandboxAttestation: SandboxAttestation;
    economicRationality: EconomicRationality;
}

export class EvidencePacketGenerator {
    public generateEnvelope(
        missionId: string,
        governanceEpoch: string,
        merkle: MerkleProof,
        containment: ContainmentProof,
        rollback: RollbackProof,
        sandbox: SandboxAttestation,
        economic: EconomicRationality
    ): FinalizedEnvelope {
        if (!governanceEpoch || !merkle || !containment || !rollback || !sandbox || !economic) {
            throw new Error('All 5 evidence pillars must be provided to generate a FinalizedEnvelope');
        }

        if (!economic.withinBudget) {
            throw new Error('Economic rationality check failed: budget exceeded');
        }

        if (containment.pathTraversalDetected) {
            throw new Error('Containment check failed: path traversal detected');
        }

        return {
            missionId,
            timestamp: Date.now(),
            governanceEpoch,
            merkleLineage: merkle,
            containmentProof: containment,
            recoveryAssurance: rollback,
            sandboxAttestation: sandbox,
            economicRationality: economic
        };
    }

    /**
     * Generates a fully cryptographically signed envelope using the provided Ed25519 private key.
     */
    public generateSignedEnvelope(
        missionId: string,
        governanceEpoch: string,
        merkle: MerkleProof,
        containmentData: Omit<ContainmentProof, 'signature'>,
        rollbackData: Omit<RollbackProof, 'engineSignature'>,
        sandboxData: Omit<SandboxAttestation, 'providerSignature'>,
        economic: EconomicRationality,
        privateKeyPem: string
    ): FinalizedEnvelope {
        // Sign containment proof
        const containmentProof: ContainmentProof = {
            ...containmentData,
            signature: CryptoUtils.signPayload(containmentData, privateKeyPem)
        };

        // Sign rollback proof
        const recoveryAssurance: RollbackProof = {
            ...rollbackData,
            engineSignature: CryptoUtils.signPayload(rollbackData, privateKeyPem)
        };

        // Sign sandbox attestation
        const sandboxAttestation: SandboxAttestation = {
            ...sandboxData,
            providerSignature: CryptoUtils.signPayload(sandboxData, privateKeyPem)
        };

        return this.generateEnvelope(
            missionId,
            governanceEpoch,
            merkle,
            containmentProof,
            recoveryAssurance,
            sandboxAttestation,
            economic
        );
    }
}
