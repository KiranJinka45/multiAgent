import { createHash } from 'crypto';
import type { LogEntry } from './consensus.js';

export class MerkleTree {
    static hashEntry(entry: LogEntry): string {
        const payload = `${entry.term}:${entry.command}`;
        return createHash('sha256').update(payload).digest('hex');
    }

    static computeRoot(log: LogEntry[]): string {
        if (log.length === 0) return createHash('sha256').update('empty-log').digest('hex');

        let currentLayer = log.map(entry => this.hashEntry(entry));

        while (currentLayer.length > 1) {
            const nextLayer = [];
            for (let i = 0; i < currentLayer.length; i += 2) {
                if (i + 1 < currentLayer.length) {
                    const combined = currentLayer[i] + currentLayer[i + 1];
                    nextLayer.push(createHash('sha256').update(combined).digest('hex'));
                } else {
                    // If odd number of nodes, duplicate the last node
                    const combined = currentLayer[i] + currentLayer[i];
                    nextLayer.push(createHash('sha256').update(combined).digest('hex'));
                }
            }
            currentLayer = nextLayer;
        }

        return currentLayer[0];
    }
}
