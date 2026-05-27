import async_hooks from 'node:async_hooks';
import { AsyncLocalStorage } from 'node:async_hooks';

export interface AsyncContext {
    causalId: string;
    parentCausalId?: string;
    taskId?: string;
}

export class AsyncExecutionTracker {
    private static storage = new AsyncLocalStorage<AsyncContext>();
    private static activeHook: async_hooks.AsyncHook | null = null;
    private static relationMap = new Map<number, number>(); // asyncId -> parentAsyncId

    /**
     * Initializes the native Async Hook boundary to trace promise/microtask parentage.
     */
    public static initializeBoundary(): void {
        if (this.activeHook) return;

        this.activeHook = async_hooks.createHook({
            init: (asyncId, type, triggerAsyncId) => {
                this.relationMap.set(asyncId, triggerAsyncId);
            },
            destroy: (asyncId) => {
                this.relationMap.delete(asyncId);
            }
        });
        this.activeHook.enable();
    }

    public static disableBoundary(): void {
        if (this.activeHook) {
            this.activeHook.disable();
            this.activeHook = null;
        }
        this.relationMap.clear();
    }

    public static runWithContext<T>(context: AsyncContext, operation: () => T): T {
        return this.storage.run(context, operation);
    }

    public static getContext(): AsyncContext | undefined {
        return this.storage.getStore();
    }

    /**
     * Reconstructs the exact causal lineage ancestry path of the current promise.
     */
    public static getCausalPath(): number[] {
        const path: number[] = [];
        let current = async_hooks.executionAsyncId();
        while (current && this.relationMap.has(current)) {
            path.push(current);
            current = this.relationMap.get(current)!;
        }
        return path;
    }
}
