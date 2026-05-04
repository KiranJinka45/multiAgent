"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.onShutdown = onShutdown;
exports.shutdown = shutdown;
const observability_1 = require("@packages/observability");
const tasks = [];
/**
 * Registers a task to be executed during graceful shutdown.
 * @param name Unique name for the task (for logging)
 * @param task The async or sync function to execute
 */
function onShutdown(name, task) {
    tasks.push({ name, task });
}
let isShuttingDown = false;
/**
 * Initiates the graceful shutdown process.
 * Executes all registered tasks in reverse order of registration.
 */
async function shutdown(signal) {
    if (isShuttingDown)
        return;
    isShuttingDown = true;
    observability_1.logger.info({ signal }, `[Lifecycle] Shutdown signal received. Executing ${tasks.length} tasks...`);
    const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 30000;
    const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => reject(new Error('Shutdown timed out')), timeoutMs);
    });
    try {
        // We run tasks in reverse order (LIFO) - usually better for closing dependencies
        for (const { name, task } of [...tasks].reverse()) {
            observability_1.logger.info(`[Lifecycle] Executing shutdown task: ${name}`);
            try {
                await Promise.race([Promise.resolve(task()), timeoutPromise]);
            }
            catch (err) {
                observability_1.logger.error({ err, taskName: name }, `[Lifecycle] Shutdown task failed: ${name}`);
            }
        }
        observability_1.logger.info('[Lifecycle] All shutdown tasks completed. Exiting.');
        process.exit(0);
    }
    catch (err) {
        observability_1.logger.fatal({ err }, '[Lifecycle] Graceful shutdown encountered a fatal error or timed out.');
        process.exit(1);
    }
}
// Global listeners
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
    observability_1.logger.error({ reason, promise }, '[Lifecycle] Unhandled Rejection at Promise');
});
process.on('uncaughtException', (err) => {
    observability_1.logger.fatal({ err }, '[Lifecycle] Uncaught Exception. Shutting down...');
    shutdown('uncaughtException');
});
//# sourceMappingURL=lifecycle.js.map