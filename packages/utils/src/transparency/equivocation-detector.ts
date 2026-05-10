import { SignedCheckpoint } from './gossip-registry.js';
import { MerkleTree } from './merkle.js';


export type EquivocationConflict = {
    type: 'FORK' | 'NON_MONOTONIC' | 'INCONSISTENT';
    checkpointA: SignedCheckpoint;
    checkpointB: SignedCheckpoint;
    detail: string;
};

/**
 * Logic to detect cryptographic equivocation and split-view attacks.
 */
export class EquivocationDetector {
    
    /**
     * Compares two checkpoints to find conflicts.
     */
    static detectConflict(a: SignedCheckpoint, b: SignedCheckpoint): EquivocationConflict | null {
        if (a.witnessKeyId !== b.witnessKeyId) return null;

        // 1. FORK DETECTION: Same tree size, different roots.
        if (a.treeSize === b.treeSize && a.rootHash !== b.rootHash) {
            return {
                type: 'FORK',
                checkpointA: a,
                checkpointB: b,
                detail: `Fork detected at tree size ${a.treeSize}. Multiple roots signed for the same state.`
            };
        }

        // 2. MONOTONICITY DETECTION: If timestamps are out of order with tree size.
        // Note: Real clock skew might exist, but large deviations are suspicious.
        const timeA = new Date(a.timestamp).getTime();
        const timeB = new Date(b.timestamp).getTime();

        if ((a.treeSize > b.treeSize && timeA < timeB) || (b.treeSize > a.treeSize && timeB < timeA)) {
            return {
                type: 'NON_MONOTONIC',
                checkpointA: a,
                checkpointB: b,
                detail: `Non-monotonic history detected. A smaller tree has a later timestamp than a larger tree.`
            };
        }

        return null;
    }

    /**
     * Verifies if a new checkpoint consistently extends an older one.
     * This is the core of "Anti-Rewrite" logic.
     */
    static verifyExtension(oldC: SignedCheckpoint, newC: SignedCheckpoint, proof: string[]): boolean {
        if (oldC.treeSize > newC.treeSize) return false;
        if (oldC.treeSize === newC.treeSize) return oldC.rootHash === newC.rootHash;

        return MerkleTree.verifyConsistency(
            oldC.treeSize,
            newC.treeSize,
            oldC.rootHash,
            newC.rootHash,
            proof
        );
    }
}
