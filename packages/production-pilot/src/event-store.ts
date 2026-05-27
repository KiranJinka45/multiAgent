import crypto from 'node:crypto';
import { canonicalizeJson } from './replay.js';

export interface EventBlock<E = any> {
    sequence: number;
    prevHash: string;
    timestamp: number;
    payload: E;
    hash: string;
}

export interface StateSnapshot<S = any> {
    sequence: number;
    stateHash: string;
    state: S;
}

export class ImmutableEventStore<E = any> {
    private blocks: EventBlock<E>[] = [];
    private lastHash = 'genesis';

    public append(payload: E, timestamp = Date.now()): EventBlock<E> {
        const sequence = this.blocks.length + 1;
        const blockData = {
            sequence,
            prevHash: this.lastHash,
            timestamp,
            payload
        };
        const hash = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
        const block: EventBlock<E> = { ...blockData, hash };
        this.blocks.push(block);
        this.lastHash = hash;
        return block;
    }

    public getBlocks(): EventBlock<E>[] {
        return [...this.blocks];
    }

    public getBlockRange(startSeq: number, endSeq: number): EventBlock<E>[] {
        return this.blocks.filter(b => b.sequence >= startSeq && b.sequence <= endSeq);
    }

    public getLength(): number {
        return this.blocks.length;
    }

    public verifyIntegrity(): boolean {
        let expectedPrevHash = 'genesis';
        for (const block of this.blocks) {
            if (block.prevHash !== expectedPrevHash) return false;
            const blockData = {
                sequence: block.sequence,
                prevHash: block.prevHash,
                timestamp: block.timestamp,
                payload: block.payload
            };
            const computed = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
            if (block.hash !== computed) return false;
            expectedPrevHash = block.hash;
        }
        return true;
    }

    /**
     * Ingests external blocks (e.g. from network synchronization or disk log recovery).
     * Validates continuity and detects structural gaps.
     */
    public syncBlocks(incoming: EventBlock<E>[]): { synced: number; gapDetected: boolean; missingRange?: [number, number] } {
        const sorted = [...incoming].sort((a, b) => a.sequence - b.sequence);
        if (sorted.length === 0) return { synced: 0, gapDetected: false };

        const currentMax = this.blocks.length;
        const nextExpectedSeq = currentMax + 1;

        if (sorted[0].sequence > nextExpectedSeq) {
            return {
                synced: 0,
                gapDetected: true,
                missingRange: [nextExpectedSeq, sorted[0].sequence - 1]
            };
        }

        // Validate structural alignment of new blocks
        let prevHash = currentMax === 0 ? 'genesis' : this.blocks[currentMax - 1].hash;
        for (const block of sorted) {
            if (block.sequence <= currentMax) {
                // Duplicate block: verify existing hash matches
                if (this.blocks[block.sequence - 1].hash !== block.hash) {
                    throw new Error(`Integrity clash: existing block ${block.sequence} hash does not match synced block hash.`);
                }
                continue;
            }
            if (block.sequence !== this.blocks.length + 1) {
                return {
                    synced: 0,
                    gapDetected: true,
                    missingRange: [this.blocks.length + 1, block.sequence - 1]
                };
            }
            if (block.prevHash !== prevHash) {
                throw new Error(`Link failure in synced stream: block ${block.sequence} prevHash does not match computed chain sequence.`);
            }
            // Validate block payload and hash integrity
            const blockData = {
                sequence: block.sequence,
                prevHash: block.prevHash,
                timestamp: block.timestamp,
                payload: block.payload
            };
            const computed = crypto.createHash('sha256').update(canonicalizeJson(blockData)).digest('hex');
            if (block.hash !== computed) {
                throw new Error(`Integrity clash: block ${block.sequence} hash does not match computed data hash.`);
            }
            // Add block to our store
            this.blocks.push(block);
            prevHash = block.hash;
            this.lastHash = block.hash;
        }

        return { synced: sorted.filter(b => b.sequence > currentMax).length, gapDetected: false };
    }

    /**
     * Safely compacts/replaces the ledger after an authoritative snapshot.
     * Enforces continuous sequence bounds and integrity links.
     */
    public replaceLedgerAfterSnapshot(snapshot: StateSnapshot, blocks: EventBlock<E>[]): void {
        if (blocks.length > 0 && blocks[0].sequence !== snapshot.sequence + 1) {
            throw new Error(`[COMPACTION::INTEGRITY] Sync block sequence ${blocks[0].sequence} must be contiguous with snapshot sequence ${snapshot.sequence}`);
        }
        
        // Validate internal hash chain link continuity of the compacted ledger
        let expectedPrevHash = snapshot.stateHash;
        if (snapshot.sequence > 0 && snapshot.sequence <= this.blocks.length) {
            expectedPrevHash = this.blocks[snapshot.sequence - 1].hash;
        }
        
        let prevHash = expectedPrevHash;
        for (const block of blocks) {
            if (block.prevHash !== prevHash) {
                throw new Error(`[COMPACTION::INTEGRITY] Hash chain link failure: block ${block.sequence} prevHash does not match snapshot/previous block`);
            }
            prevHash = block.hash;
        }

        // Set encapsulated blocks safely
        this.blocks = [...blocks];
        this.lastHash = blocks.length > 0 ? blocks[blocks.length - 1].hash : snapshot.stateHash;
    }
}
