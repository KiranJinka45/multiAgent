import crypto from 'node:crypto';
import { canonicalizeJson } from './replay.js';
import type { StateSnapshot, EventBlock } from './event-store.js';
import type { ReplayReducer } from './reducer.js';
import { ztanDivergenceEventsTotal } from '@packages/observability';

export interface DivergenceReport {
    diverged: boolean;
    mismatchSequence?: number;
    liveStateHash?: string;
    replayStateHash?: string;
    details?: string;
}

export class ReplayDivergenceDetector {
    /**
     * Replays the given events from the snapshot using the reducer,
     * and asserts the resulting state is absolutely identical to the production final state.
     */
    public static assertEquivalence<S, E>(
        productionState: S,
        initialSnapshot: StateSnapshot<S>,
        blocks: EventBlock<E>[],
        reducer: ReplayReducer<S, E>,
        workflowName = 'unknown'
    ): DivergenceReport {
        let replayState = JSON.parse(JSON.stringify(initialSnapshot.state));
        const sortedBlocks = [...blocks].sort((a, b) => a.sequence - b.sequence);

        for (const block of sortedBlocks) {
            if (block.sequence <= initialSnapshot.sequence) continue;

            try {
                replayState = reducer(replayState, block.payload);
            } catch (err: any) {
                ztanDivergenceEventsTotal.inc({ workflow_name: workflowName, mismatch_type: 'reducer_exception' });
                return {
                    diverged: true,
                    mismatchSequence: block.sequence,
                    details: `Reducer threw exception at sequence ${block.sequence}: ${err.message}`
                };
            }
        }

        const serializedProd = canonicalizeJson(productionState);
        const serializedReplay = canonicalizeJson(replayState);

        const hashProd = crypto.createHash('sha256').update(serializedProd).digest('hex');
        const hashReplay = crypto.createHash('sha256').update(serializedReplay).digest('hex');

        if (hashProd !== hashReplay) {
            ztanDivergenceEventsTotal.inc({ workflow_name: workflowName, mismatch_type: 'state_hash_mismatch' });
            return {
                diverged: true,
                liveStateHash: hashProd,
                replayStateHash: hashReplay,
                details: 'Reconstructed state hash diverges from live production state hash.'
            };
        }

        return { diverged: false };
    }

    /**
     * Pinpoints exactly at which event sequence a non-deterministic state divergence occurred.
     */
    public static findDivergencePoint<S, E>(
        liveStatesHistory: Map<number, string>, // sequence -> stateHash
        initialSnapshot: StateSnapshot<S>,
        blocks: EventBlock<E>[],
        reducer: ReplayReducer<S, E>
    ): number | null {
        let replayState = JSON.parse(JSON.stringify(initialSnapshot.state));
        const sortedBlocks = [...blocks].sort((a, b) => a.sequence - b.sequence);

        for (const block of sortedBlocks) {
            if (block.sequence <= initialSnapshot.sequence) continue;

            replayState = reducer(replayState, block.payload);
            
            const serialized = canonicalizeJson(replayState);
            const computedHash = crypto.createHash('sha256').update(serialized).digest('hex');

            const liveHash = liveStatesHistory.get(block.sequence);
            if (liveHash && liveHash !== computedHash) {
                return block.sequence;
            }
        }

        return null;
    }
}
