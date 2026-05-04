/**
 * SandboxRunner
 *
 * Safely executes self-modification proposals and builds in an isolated process.
 * Includes resource monitoring and automated termination of runaway tasks.
 */
export declare class SandboxRunner {
    private sandboxDir;
    private executionId;
    private watchdogTimer;
    private process;
    private MAX_MEMORY_MB;
    private MAX_CPU_TIME_MS;
    constructor(executionId: string);
    runSimulation(proposalId: string): Promise<boolean>;
    private prepareSnapshot;
    /**
     * Spawns a child process and monitors its resource usage.
     */
    private executeIsolated;
    private cleanup;
}
