import crypto from 'node:crypto';
import { canonicalizeJson } from './replay.js';
import type { StateSnapshot, EventBlock } from './event-store.js';

export type ReplayReducer<S, E> = (state: S, event: E) => S;

export class StateConvergenceEngine<S, E> {
    private currentState: S;
    private sequence = 0;
    private snapshots = new Map<number, StateSnapshot<S>>();

    constructor(
        private readonly initialState: S,
        private readonly reducer: ReplayReducer<S, E>,
        private readonly snapshotInterval = 10
    ) {
        this.currentState = JSON.parse(JSON.stringify(initialState));
    }

    public transition(event: E): void {
        this.currentState = this.reducer(this.currentState, event);
        this.sequence++;

        if (this.sequence % this.snapshotInterval === 0) {
            this.createSnapshot();
        }
    }

    public getState(): S {
        return JSON.parse(JSON.stringify(this.currentState));
    }

    public getSequence(): number {
        return this.sequence;
    }

    public getSnapshot(seq: number): StateSnapshot<S> | undefined {
        return this.snapshots.get(seq);
    }

    public loadSnapshot(snapshot: StateSnapshot<S>): void {
        this.currentState = JSON.parse(JSON.stringify(snapshot.state));
        this.sequence = snapshot.sequence;
    }

    public replayFromSnapshot(snapshot: StateSnapshot<S>, blocks: EventBlock<E>[]): S {
        let tempState = JSON.parse(JSON.stringify(snapshot.state));
        
        // Ensure blocks are in correct order and sequence matches snapshot bounds
        const sortedBlocks = [...blocks].sort((a, b) => a.sequence - b.sequence);
        for (const block of sortedBlocks) {
            if (block.sequence <= snapshot.sequence) continue;
            tempState = this.reducer(tempState, block.payload);
        }

        return tempState;
    }

    private createSnapshot(): StateSnapshot<S> {
        const stateCopy = this.getState();
        const serialized = canonicalizeJson(stateCopy);
        const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');
        
        const snapshot: StateSnapshot<S> = {
            sequence: this.sequence,
            stateHash,
            state: stateCopy
        };
        this.snapshots.set(this.sequence, snapshot);
        return snapshot;
    }
}
