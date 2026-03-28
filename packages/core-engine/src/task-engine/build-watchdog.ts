import { logger, eventBus } from '@packages/utils/src/server';

export class BuildWatchdog {
    private interval: NodeJS.Timeout | null = null;
    private graph: TaskGraph;
    private executionId: string;
    private projectId: string;
    private timeoutMs: number;

    constructor(graph: TaskGraph, executionId: string, projectId: string, timeoutMs: number = 20000) {
        this.graph = graph;
        this.executionId = executionId;
        this.projectId = projectId;
        this.timeoutMs = timeoutMs;
    }

    start() {
        logger.info({ executionId: this.executionId }, '[BuildWatchdog] Monitoring started');
        this.interval = setInterval(() => this.check(), 10000); // Check every 10s
    }

    stop() {
        if (this.interval) {
            clearInterval(this.interval);
            this.interval = null;
            logger.info({ executionId: this.executionId }, '[BuildWatchdog] Monitoring stopped');
        }
    }

    private async check() {
        // 1. Memory Health Check (Phase 9 Hardening)
        const mem = process.memoryUsage();
        const heapUsedMB = Math.round(mem.heapUsed / 1024 / 1024);
        if (heapUsedMB > 1200) { // 1.2GB Threshold
            logger.error({ heapUsedMB, executionId: this.executionId }, '[BuildWatchdog] CRITICAL MEMORY USAGE. Initiating safety cleanup.');
            await eventBus.error(this.executionId, 'Build engine exceeded memory threshold. Attempting emergency recovery...', this.projectId);
            // In a real prod env, this might trigger a process.exit(1) to let the orchestrator restart the worker
        }

        const runningTasks = this.graph.getAllTasks().filter(t => t.status === 'running');
        
        for (const task of runningTasks) {
            if (this.graph.isStuck(task.id, this.timeoutMs)) {
                const retryCount = task.retryCount || 0;
                if (retryCount < 1) {
                    logger.warn({ taskId: task.id, executionId: this.executionId }, '[BuildWatchdog] Stall detected. Resetting node.');
                    await eventBus.agent(this.executionId, 'System', 'watchdog_recovery', `Restarting stalled task: ${task.title}`, this.projectId);
                    this.graph.resetTask(task.id);
                } else {
                    logger.error({ taskId: task.id, executionId: this.executionId }, '[BuildWatchdog] Persistent stall. Aborting node.');
                    this.graph.abortTask(task.id);
                    await eventBus.error(this.executionId, `Watchdog: Node ${task.title} aborted after persistent stall.`, this.projectId);
                }
            }
        }
        
        // Check for total pipeline stall (no tasks running, none ready but graph not completed)
        if (runningTasks.length === 0 && !this.graph.isCompleted() && !this.graph.hasFailed()) {
            const ready = this.graph.getAllTasks().filter(t => t.status === 'ready' || t.status === 'waiting');
            if (ready.length === 0) {
                logger.error({ executionId: this.executionId }, '[BuildWatchdog] CRITICAL STRUCTURAL STALL: Pipeline deadlock detected.');
                await eventBus.error(this.executionId, 'Build pipeline encountered a structural stall. Aborting mission.', this.projectId);
                // Mark all incomplete tasks as aborted to break the loop
                this.graph.getAllTasks().forEach(t => {
                    if (t.status !== 'completed') this.graph.abortTask(t.id);
                });
            }
        }
    }
}
