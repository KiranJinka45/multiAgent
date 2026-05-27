import * as fs from 'node:fs';
import * as path from 'node:path';
import * as net from 'node:net';
import crypto from 'node:crypto';
import { OffHeapIndexedStore } from './offheap-store.js';
import type { WorkflowEvent } from './durable-orchestration.js';
import { ztanPartitionRingSize } from '@packages/observability';

/**
 * Consistent Hash Ring for sharding workflows across active nodes.
 * Distributes keys uniformly and minimizes ownership shifts when nodes join or leave.
 */
export class ConsistentHashRing {
    private ring = new Map<number, string>();
    private sortedKeys: number[] = [];

    constructor(private readonly virtualNodes = 10) {}

    private hash(str: string): number {
        const sha256 = crypto.createHash('sha256').update(str).digest();
        // Convert first 4 bytes to an unsigned 32-bit integer
        return sha256.readUInt32BE(0);
    }

    public addNode(nodeId: string): void {
        for (let i = 0; i < this.virtualNodes; i++) {
            const virtualKey = `${nodeId}-vnode-${i}`;
            const hashVal = this.hash(virtualKey);
            this.ring.set(hashVal, nodeId);
        }
        this.rebuildSortedKeys();
    }

    public removeNode(nodeId: string): void {
        for (let i = 0; i < this.virtualNodes; i++) {
            const virtualKey = `${nodeId}-vnode-${i}`;
            const hashVal = this.hash(virtualKey);
            this.ring.delete(hashVal);
        }
        this.rebuildSortedKeys();
    }

    private rebuildSortedKeys(): void {
        this.sortedKeys = Array.from(this.ring.keys()).sort((a, b) => a - b);
    }

    public getNode(key: string): string | null {
        if (this.sortedKeys.length === 0) return null;
        const hashVal = this.hash(key);
        
        // Binary search to find the first node clockwise (>= hashVal)
        let low = 0;
        let high = this.sortedKeys.length - 1;
        let idx = 0;

        if (hashVal > this.sortedKeys[high]) {
            // Wrap around to the first node
            return this.ring.get(this.sortedKeys[0])!;
        }

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            if (this.sortedKeys[mid] >= hashVal) {
                idx = mid;
                high = mid - 1;
            } else {
                low = mid + 1;
            }
        }
        return this.ring.get(this.sortedKeys[idx])!;
    }
}

/**
 * Manages namespaces and determines local vs. remote partition ownership.
 */
export class PartitionManager {
    private hashRing = new ConsistentHashRing();
    private activeNodes = new Set<string>();

    constructor(private readonly localNodeId: string) {
        this.addNode(localNodeId);
    }

    public addNode(nodeId: string): void {
        this.activeNodes.add(nodeId);
        this.hashRing.addNode(nodeId);
        ztanPartitionRingSize.set(this.activeNodes.size);
    }

    public removeNode(nodeId: string): void {
        this.activeNodes.delete(nodeId);
        this.hashRing.removeNode(nodeId);
        ztanPartitionRingSize.set(this.activeNodes.size);
    }

    public getOwner(workflowId: string): string | null {
        // Strip namespace if present to determine ownership context cleanly
        const parts = workflowId.split('/');
        const partitionKey = parts.length > 1 ? parts[1] : workflowId;
        return this.hashRing.getNode(partitionKey);
    }

    public isLocal(workflowId: string): boolean {
        return this.getOwner(workflowId) === this.localNodeId;
    }
}

export interface WorkflowHistoryRecord {
    workflowId: string;
    name: string;
    status: 'RUNNING' | 'COMPLETED' | 'FAILED';
    createdAt: number;
    updatedAt: number;
    ownerNodeId: string;
    epoch: number;
    history: WorkflowEvent[];
    retryCount: number;
}

/**
 * Off-Heap, index-backed workflow history query and archival service.
 */
export class WorkflowHistoryService {
    private store: OffHeapIndexedStore;

    constructor(dir: string, filename = 'workflow-history.db') {
        this.store = new OffHeapIndexedStore(dir, filename);
    }

    public saveWorkflowHistory(record: WorkflowHistoryRecord): void {
        this.store.put(record.workflowId, record);
    }

    public getWorkflowHistory(workflowId: string): WorkflowHistoryRecord | null {
        return this.store.get(workflowId);
    }

    public queryWorkflows(filter: {
        status?: 'RUNNING' | 'COMPLETED' | 'FAILED';
        name?: string;
        since?: number;
    }): WorkflowHistoryRecord[] {
        const results: WorkflowHistoryRecord[] = [];
        const keys = this.store.keys();

        for (const key of keys) {
            const record = this.store.get(key) as WorkflowHistoryRecord;
            if (record) {
                if (filter.status && record.status !== filter.status) continue;
                if (filter.name && record.name !== filter.name) continue;
                if (filter.since && record.updatedAt < filter.since) continue;
                results.push(record);
            }
        }
        return results;
    }

    public searchWorkflows(keyword: string): WorkflowHistoryRecord[] {
        const results: WorkflowHistoryRecord[] = [];
        const keys = this.store.keys();
        const lowerKeyword = keyword.toLowerCase();

        for (const key of keys) {
            const record = this.store.get(key) as WorkflowHistoryRecord;
            if (record) {
                if (
                    record.workflowId.toLowerCase().includes(lowerKeyword) ||
                    record.name.toLowerCase().includes(lowerKeyword) ||
                    record.status.toLowerCase().includes(lowerKeyword)
                ) {
                    results.push(record);
                }
            }
        }
        return results;
    }

    public pruneHistory(maxAgeMs: number): void {
        const keys = this.store.keys();
        const cutoff = Date.now() - maxAgeMs;

        for (const key of keys) {
            const record = this.store.get(key) as WorkflowHistoryRecord;
            if (record && record.updatedAt < cutoff) {
                this.store.put(key, null);
            }
        }
    }

    public close(): void {
        this.store.close();
    }
}

/**
 * Tracks and clean up open file descriptors, network servers/sockets, and timers.
 * Solves OS-specific delayed handle locks (especially on Windows EPERM/ENOTEMPTY).
 */
export class ResourceRegistry {
    private fds = new Set<number>();
    private sockets = new Set<net.Socket | net.Server>();
    private timers = new Set<NodeJS.Timeout>();
    private cleanupHooks: (() => Promise<void>)[] = [];

    constructor() {}

    public registerHook(hook: () => Promise<void>): void {
        this.cleanupHooks.push(hook);
    }

    public registerFd(fd: number): void {
        this.fds.add(fd);
    }

    public unregisterFd(fd: number): void {
        this.fds.delete(fd);
    }

    public registerSocket(socket: net.Socket | net.Server): void {
        this.sockets.add(socket);
    }

    public unregisterSocket(socket: net.Socket | net.Server): void {
        this.sockets.delete(socket);
    }

    public registerTimer(timer: NodeJS.Timeout): void {
        this.timers.add(timer);
    }

    public unregisterTimer(timer: NodeJS.Timeout): void {
        this.timers.delete(timer);
    }

    public async teardown(): Promise<void> {
        // 0. Run general cleanup hooks
        for (const hook of this.cleanupHooks) {
            try {
                await hook();
            } catch {
                // Ignore
            }
        }
        this.cleanupHooks = [];

        // 1. Clear Timers
        for (const timer of this.timers) {
            clearTimeout(timer);
        }
        this.timers.clear();

        // 2. Destroy Sockets and Server connections
        const socketTeardowns = Array.from(this.sockets).map((s) => {
            return new Promise<void>((resolve) => {
                if (s instanceof net.Server) {
                    s.close(() => resolve());
                } else {
                    s.destroy();
                    resolve();
                }
            });
        });
        await Promise.all(socketTeardowns);
        this.sockets.clear();

        // 3. Close File Descriptors
        for (const fd of this.fds) {
            try {
                fs.closeSync(fd);
            } catch {
                // Ignore descriptor handles already closed
            }
        }
        this.fds.clear();
    }
}
