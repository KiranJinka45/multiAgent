import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';
import { CryptoUtils } from '../../evidence-lifecycle/src/crypto-utils';
import { TrustRegistry } from './trust-registry';

export type CellState = 'ACTIVE' | 'QUARANTINED';

export class ExecutionCell {
    private state: CellState = 'ACTIVE';
    private quarantineReason?: string;
    private registry: TrustRegistry;

    constructor(registry?: TrustRegistry) {
        this.registry = registry || new TrustRegistry();
    }

    /**
     * Isolates the cell. Halts execution and syncs.
     */
    public quarantine(reason: string): void {
        this.state = 'QUARANTINED';
        this.quarantineReason = reason;
    }

    public getState(): CellState {
        return this.state;
    }

    public getQuarantineReason(): string | undefined {
        return this.quarantineReason;
    }

    /**
     * Get the local trust registry.
     */
    public getTrustRegistry(): TrustRegistry {
        return this.registry;
    }

    /**
     * Sync trust registry from another source.
     */
    public syncTrustRegistry(snapshot: string): void {
        if (this.state === 'QUARANTINED') {
            throw new Error('Cannot sync trust assets while quarantined.');
        }
        this.registry = TrustRegistry.deserialize(snapshot);
    }

    /**
     * Verifies an evidence packet from another cell.
     * Must not require live database calls to the other cell.
     */
    public verifyForeignEvidence(packet: FinalizedEnvelope): boolean {
        // In a real system, we would cryptographically verify the signatures
        // and check the merkle lineage against our known governance roots.

        // Reject if quarantined (cannot process external trust)
        if (this.state === 'QUARANTINED') {
            throw new Error('Cannot verify foreign evidence while quarantined.');
        }

        // Basic structural validation
        if (!packet || !packet.missionId || !packet.governanceEpoch || !packet.merkleLineage || !packet.containmentProof) {
            return false;
        }

        // Must rely on known governance epochs for trust portability
        if (!this.registry.isValidRootForEpoch(packet.governanceEpoch, packet.merkleLineage.rootHash)) {
            return false; // Untrusted governance root
        }

        // Extract payload data to verify against signature
        const { signature: sig1, ...containmentData } = packet.containmentProof;
        const { engineSignature: sig2, ...rollbackData } = packet.recoveryAssurance;
        const { providerSignature: sig3, ...sandboxData } = packet.sandboxAttestation;

        const trustedKeys = this.registry.getOperatorKeysForEpoch(packet.governanceEpoch);
        
        let validKeyFound = false;

        for (const pubKey of trustedKeys) {
            if (this.registry.isRevoked(pubKey)) continue;

            const isContainmentValid = CryptoUtils.verifySignature(containmentData, sig1, pubKey);
            const isRollbackValid = CryptoUtils.verifySignature(rollbackData, sig2, pubKey);
            const isSandboxValid = CryptoUtils.verifySignature(sandboxData, sig3, pubKey);

            if (isContainmentValid && isRollbackValid && isSandboxValid) {
                validKeyFound = true;
                break;
            }
        }

        return validKeyFound;
    }

    /**
     * Simulate starting a local mission.
     */
    public startLocalMission(missionId: string): void {
        if (this.state === 'QUARANTINED') {
            throw new Error(`Cannot start mission ${missionId} while quarantined.`);
        }
        // Proceed with local mission...
    }
}
