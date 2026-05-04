type ShutdownTask = () => Promise<void> | void;
/**
 * Registers a task to be executed during graceful shutdown.
 * @param name Unique name for the task (for logging)
 * @param task The async or sync function to execute
 */
export declare function onShutdown(name: string, task: ShutdownTask): void;
/**
 * Initiates the graceful shutdown process.
 * Executes all registered tasks in reverse order of registration.
 */
export declare function shutdown(signal: string): Promise<void>;
export {};
//# sourceMappingURL=lifecycle.d.ts.map