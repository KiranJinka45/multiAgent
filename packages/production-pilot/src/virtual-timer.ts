import type { DeterministicScheduler } from './scheduler.js';

export class VirtualTimerManager {
    private static originalSetTimeout = globalThis.setTimeout;
    private static originalClearTimeout = globalThis.clearTimeout;

    /**
     * Intercepts global setTimeout, binding it to the deterministic scheduler virtual time.
     */
    public static virtualizeTimers(scheduler: DeterministicScheduler): void {
        const virtualSetTimeout = (callback: (...args: any[]) => void, delay?: number, ...args: any[]): any => {
            const taskId = scheduler.schedule(`timer-delay-${delay || 0}`, async () => {
                callback(...args);
            });
            return taskId; // Return virtual taskId as the timer handle
        };

        const virtualClearTimeout = (handle: any): void => {
            if (typeof handle === 'string') {
                // Remove task from scheduler queue if not executed
                (scheduler as any).queue = (scheduler as any).queue.filter((t: any) => t.taskId !== handle);
            }
        };

        globalThis.setTimeout = virtualSetTimeout as any;
        globalThis.clearTimeout = virtualClearTimeout as any;
    }

    /**
     * Restores native environment global timer APIs.
     */
    public static restoreTimers(): void {
        globalThis.setTimeout = this.originalSetTimeout;
        globalThis.clearTimeout = this.originalClearTimeout;
    }
}
