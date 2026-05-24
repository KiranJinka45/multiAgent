import type { ImmutableEventStore, StateSnapshot } from './event-store.js';

export class LogCompactor {
    /**
     * Compacts the event store by retaining only the authoritative snapshot
     * and pruning events that occurred prior to the snapshot's sequence boundary.
     */
    public static compact<E>(
        store: ImmutableEventStore<E>,
        snapshot: StateSnapshot
    ): { prunedCount: number; remainingCount: number } {
        const originalBlocks = store.getBlocks();
        const initialLength = originalBlocks.length;
        
        // Filter out blocks that were incorporated into the snapshot
        const retainedBlocks = originalBlocks.filter(b => b.sequence > snapshot.sequence);
        
        // Re-seed the event store's memory ledger cleanly via encapsulated boundary
        store.replaceLedgerAfterSnapshot(snapshot, retainedBlocks);
        
        const prunedCount = initialLength - retainedBlocks.length;
        return {
            prunedCount,
            remainingCount: retainedBlocks.length
        };
    }
}
