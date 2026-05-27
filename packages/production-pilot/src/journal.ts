import crypto from 'node:crypto';
import { OffHeapIndexedStore } from './offheap-store.js';

export interface JournaledEffect {
    effectId: string; // Deterministic RetryId
    name: string;
    outcome: 'success' | 'failure';
    result: any;
    error?: string;
}

export class SideEffectJournal {
    private effects = new Map<string, JournaledEffect>();
    private callCounts = new Map<string, number>();

    constructor(
        private readonly sequence: number, 
        private readonly isReplayMode = false,
        private readonly offHeapStore?: OffHeapIndexedStore
    ) {}

    public generateRetryId(effectName: string): string {
        const count = (this.callCounts.get(effectName) || 0) + 1;
        this.callCounts.set(effectName, count);

        // Deterministic Hash combining WAL sequence, effect name, and call index
        return crypto
            .createHash('sha256')
            .update(`${this.sequence}:${effectName}:${count}`)
            .digest('hex')
            .substring(0, 16);
    }

    /**
     * Executes the side-effect in live mode (recording outcomes),
     * or injects the logged outcome in replay mode without triggering I/O.
     */
    public async execute<T>(effectName: string, asyncOperation: () => Promise<T>): Promise<T> {
        const effectId = this.generateRetryId(effectName);

        if (this.isReplayMode) {
            const logged = this.offHeapStore ? this.offHeapStore.get(effectId) : this.effects.get(effectId);
            if (!logged) {
                throw new Error(`[JOURNAL::REPLAY_DIVERGENCE] No journaled outcome found for deterministic effect "${effectName}" (ID: ${effectId})`);
            }
            if (logged.outcome === 'failure') {
                throw new Error(logged.error || `Journaled error in ${effectName}`);
            }
            return logged.result as T;
        }

        // Live execution mode: run and record
        try {
            const result = await asyncOperation();
            const outcome: JournaledEffect = {
                effectId,
                name: effectName,
                outcome: 'success',
                result
            };
            if (this.offHeapStore) {
                this.offHeapStore.put(effectId, outcome);
            } else {
                this.effects.set(effectId, outcome);
            }
            return result;
        } catch (err: any) {
            const outcome: JournaledEffect = {
                effectId,
                name: effectName,
                outcome: 'failure',
                result: null,
                error: err.message
            };
            if (this.offHeapStore) {
                this.offHeapStore.put(effectId, outcome);
            } else {
                this.effects.set(effectId, outcome);
            }
            throw err;
        }
    }

    public getLoggedEffects(): JournaledEffect[] {
        if (this.offHeapStore) {
            return this.offHeapStore.keys().map(k => this.offHeapStore!.get(k) as JournaledEffect);
        }
        return Array.from(this.effects.values());
    }

    public loadLoggedEffects(effects: JournaledEffect[]): void {
        if (this.offHeapStore) {
            for (const eff of effects) {
                this.offHeapStore.put(eff.effectId, eff);
            }
        } else {
            this.effects.clear();
            for (const eff of effects) {
                this.effects.set(eff.effectId, eff);
            }
        }
    }
}
