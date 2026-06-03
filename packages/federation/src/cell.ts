import { FinalizedEnvelope } from '../../evidence-lifecycle/src/evidence-packet';

export type CellState = 'ACTIVE' | 'QUARANTINED';

export class ExecutionCell {
    private state: CellState = 'ACTIVE';
    private quarantineReason?: string;
    private governanceRoots: Set<string> = new Set();

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
     * Synchronize governance roots. Only allows updating if active.
     */
    public syncGovernanceRoots(roots: string[]): void {
        if (this.state === 'QUARANTINED') {
            throw new Error('Cannot sync trust assets while quarantined.');
        }
        for (const root of roots) {
            this.governanceRoots.add(root);
        }
    }

    /**
     * Checks if a governance root is known to this cell.
     */
    public hasGovernanceRoot(root: string): boolean {
        return this.governanceRoots.has(root);
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
        if (!packet || !packet.missionId || !packet.merkleLineage || !packet.containmentProof) {
            return false;
        }

        // Must rely on known governance roots for trust portability
        if (!this.governanceRoots.has(packet.merkleLineage.rootHash)) {
            return false; // Untrusted governance root
        }

        return true;
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
