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
    merkleLineage: MerkleProof;
    containmentProof: ContainmentProof;
    recoveryAssurance: RollbackProof;
    sandboxAttestation: SandboxAttestation;
    economicRationality: EconomicRationality;
}

export class EvidencePacketGenerator {
    public generateEnvelope(
        missionId: string,
        merkle: MerkleProof,
        containment: ContainmentProof,
        rollback: RollbackProof,
        sandbox: SandboxAttestation,
        economic: EconomicRationality
    ): FinalizedEnvelope {
        if (!merkle || !containment || !rollback || !sandbox || !economic) {
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
            merkleLineage: merkle,
            containmentProof: containment,
            recoveryAssurance: rollback,
            sandboxAttestation: sandbox,
            economicRationality: economic
        };
    }
}
