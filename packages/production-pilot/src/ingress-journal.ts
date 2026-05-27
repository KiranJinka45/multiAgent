import crypto from 'node:crypto';
import { OffHeapIndexedStore } from './offheap-store.js';

export interface IngressCallbackLog {
    ingressId: string;
    boundary: 'socket' | 'watcher' | 'signal';
    payload: any;
    order: number;
}

export class IngressJournal {
    private logs: IngressCallbackLog[] = [];
    private index = 0;

    constructor(
        private readonly isReplayMode = false,
        private readonly offHeapStore?: OffHeapIndexedStore
    ) {}

    /**
     * Registers an external async boundary entrypoint callback.
     * In live mode, logs it. In replay mode, returns the logged payload in sequential order.
     */
    public registerBoundary(boundary: IngressCallbackLog['boundary'], payload: any): IngressCallbackLog {
        const ingressId = crypto
            .createHash('sha256')
            .update(`${boundary}:${JSON.stringify(payload)}:${this.index}`)
            .digest('hex')
            .substring(0, 16);

        if (this.isReplayMode) {
            const match = this.offHeapStore ? this.offHeapStore.get(ingressId) : this.logs.find(l => l.ingressId === ingressId);
            if (!match) {
                throw new Error(`[INGRESS::REPLAY_DIVERGENCE] Unregistered async boundary event detected in replay: ${boundary} (ID: ${ingressId})`);
            }
            this.index++;
            return match;
        }

        const log: IngressCallbackLog = {
            ingressId,
            boundary,
            payload,
            order: this.index++
        };
        if (this.offHeapStore) {
            this.offHeapStore.put(ingressId, log);
        } else {
            this.logs.push(log);
        }
        return log;
    }

    public getLogs(): IngressCallbackLog[] {
        if (this.offHeapStore) {
            const sortedKeys = this.offHeapStore.keys();
            const logs = sortedKeys.map(k => this.offHeapStore!.get(k) as IngressCallbackLog);
            return logs.sort((a, b) => a.order - b.order);
        }
        return [...this.logs];
    }

    public loadLogs(logs: IngressCallbackLog[]): void {
        if (this.offHeapStore) {
            for (const log of logs) {
                this.offHeapStore.put(log.ingressId, log);
            }
        } else {
            this.logs = [...logs];
        }
        this.index = 0;
    }
}
