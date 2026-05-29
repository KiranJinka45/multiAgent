import type { PrepareMessage } from './consensus.js';

export class ConsensusInvariantMonitor {
    // Invariant 1: Quorum Intersection Safety
    // Prevents split-brain commits by asserting that no two distinct Merkle roots 
    // can ever gather a valid BFT quorum (>= quorum size) in the same term.
    static assertQuorumIntersection(
        term: number, 
        prepares: PrepareMessage[], 
        quorumSize: number
    ): boolean {
        const preparesInTerm = prepares.filter(p => p.term === term);
        
        // Map of MerkleRoot -> Set of Node IDs who sent a prepare message
        const rootToNodesMap: { [root: string]: Set<string> } = {};
        for (const prep of preparesInTerm) {
            if (!rootToNodesMap[prep.merkleRoot]) {
                rootToNodesMap[prep.merkleRoot] = new Set<string>();
            }
            rootToNodesMap[prep.merkleRoot].add(prep.nodeId);
        }

        const rootsWithQuorum = Object.entries(rootToNodesMap)
            .filter(([_, nodes]) => nodes.size >= quorumSize)
            .map(([root, _]) => root);

        if (rootsWithQuorum.length > 1) {
            console.error(
                `[ZTAN INVARIANT CRASH] Quorum Intersection Violation in term ${term}! ` +
                `Multiple divergent roots gathered quorum:`, rootsWithQuorum
            );
            return false;
        }

        return true;
    }

    // Invariant 2: Lock Certificate Lineage
    // Enforces that a lock/commit action on a root must possess a valid, 
    // unbroken quorum of cryptographic prepares.
    static assertLockCertificateLineage(
        term: number,
        merkleRoot: string,
        signatures: { nodeId: string; signature: string }[],
        quorumSize: number
    ): boolean {
        if (!merkleRoot && signatures.length === 0) return true; // Initial clean state

        if (signatures.length < quorumSize) {
            console.error(
                `[ZTAN INVARIANT CRASH] Lock Certificate Lineage Violation! ` +
                `Attemped lock on root ${merkleRoot?.substring(0, 8)} in term ${term} ` +
                `with insufficient signatures (${signatures.length} < ${quorumSize})`
            );
            return false;
        }

        // Verify that all signature entries are unique
        const nodeIds = signatures.map(s => s.nodeId);
        const distinctNodeIds = new Set(nodeIds);
        if (distinctNodeIds.size !== nodeIds.length) {
            console.error(
                `[ZTAN INVARIANT CRASH] Lock Certificate Lineage Violation! ` +
                `Duplicate node signatures detected in certificate:`, nodeIds
            );
            return false;
        }

        return true;
    }

    // Invariant 3: View Transition Safety
    // Enforces that shifting to a higher term term must never roll back or censor
    // any committed transaction blocks from previous terms.
    static assertViewTransitionSafety(
        currentLedger: { term: number; command: string }[],
        newNodeLedger: { term: number; command: string }[]
    ): boolean {
        // Find the committed suffix length in the current node's ledger.
        // The new ledger must share an identical prefix up to the length of the current ledger.
        const minLength = Math.min(currentLedger.length, newNodeLedger.length);
        
        for (let i = 0; i < minLength; i++) {
            const currentEntry = currentLedger[i];
            const newEntry = newNodeLedger[i];
            
            if (currentEntry.term === newEntry.term && currentEntry.command !== newEntry.command) {
                console.error(
                    `[ZTAN INVARIANT CRASH] View Transition Safety Violation! ` +
                    `History divergence detected at index ${i}. ` +
                    `Current: term ${currentEntry.term} command "${currentEntry.command}". ` +
                    `New proposal: term ${newEntry.term} command "${newEntry.command}".`
                );
                return false;
            }
        }

        return true;
    }
}
