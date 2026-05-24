import type { VectorClock } from './vector-clock.js';

export interface ConcurrencyRecord {
    sequence: number;
    schedulerOrder: string[]; // Captured scheduler task IDs sequence
    vectorStates: Record<string, Record<string, number>>; // Node -> Vector Clocks
}

export class ConcurrencyJournal {
    private records = new Map<number, ConcurrencyRecord>();

    public recordInterleaving(sequence: number, schedulerOrder: string[], vectorClocks: Record<string, VectorClock>): void {
        const clocks: Record<string, Record<string, number>> = {};
        for (const [node, vc] of Object.entries(vectorClocks)) {
            clocks[node] = vc.getClock();
        }
        
        this.records.set(sequence, {
            sequence,
            schedulerOrder: [...schedulerOrder],
            vectorStates: clocks
        });
    }

    public getRecord(sequence: number): ConcurrencyRecord | undefined {
        return this.records.get(sequence);
    }
}
