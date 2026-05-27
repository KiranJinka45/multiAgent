import crypto from 'node:crypto';
import { canonicalizeJson } from './replay.js';

export interface EpochCheckpoint<S = any> {
    epochId: string;
    sequence: number;
    stateHash: string;
    state: S;
}

export class ExecutionEpochManager<S = any> {
    private checkpoint: EpochCheckpoint<S> | null = null;
    private sequence = 0;

    /**
     * Starts an execution epoch by capturing a state checkpoint.
     */
    public startEpoch(state: S, sequence: number): string {
        const epochId = crypto.randomBytes(8).toString('hex');
        const serialized = canonicalizeJson(state);
        const stateHash = crypto.createHash('sha256').update(serialized).digest('hex');

        this.checkpoint = {
            epochId,
            sequence,
            stateHash,
            state: JSON.parse(JSON.stringify(state))
        };
        this.sequence = sequence;
        return epochId;
    }

    /**
     * Rolls back state and sequence to the saved checkpoint.
     */
    public rollback(): { state: S; sequence: number } {
        if (!this.checkpoint) {
            throw new Error('[EPOCH::ROLLBACK_FAILED] No active epoch checkpoint registered.');
        }
        console.log(`[EPOCH] Initiating rollback to epoch checkpoint ${this.checkpoint.epochId} (seq: ${this.checkpoint.sequence})`);
        return {
            state: JSON.parse(JSON.stringify(this.checkpoint.state)),
            sequence: this.checkpoint.sequence
        };
    }

    /**
     * Commits the current epoch, releasing the checkpoint.
     */
    public commit(): void {
        this.checkpoint = null;
    }

    public hasActiveEpoch(): boolean {
        return this.checkpoint !== null;
    }
}
