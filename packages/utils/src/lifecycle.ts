import { logger } from '@packages/observability';

type ShutdownTask = () => Promise<void> | void;

const tasks: { name: string; task: ShutdownTask }[] = [];

/**
 * Registers a task to be executed during graceful shutdown.
 * @param name Unique name for the task (for logging)
 * @param task The async or sync function to execute
 */
export function onShutdown(name: string, task: ShutdownTask) {
  tasks.push({ name, task });
}

let isShuttingDown = false;

/**
 * Initiates the graceful shutdown process.
 * Executes all registered tasks in reverse order of registration.
 */
export async function shutdown(signal: string) {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info({ signal }, `[Lifecycle] Shutdown signal received. Executing ${tasks.length} tasks...`);

  const timeoutMs = Number(process.env.SHUTDOWN_TIMEOUT_MS) || 30000;
  
  const timeoutPromise = new Promise((_, reject) => {
    setTimeout(() => reject(new Error('Shutdown timed out')), timeoutMs);
  });

  try {
    // We run tasks in reverse order (LIFO) - usually better for closing dependencies
    for (const { name, task } of [...tasks].reverse()) {
      logger.info(`[Lifecycle] Executing shutdown task: ${name}`);
      try {
        await Promise.race([Promise.resolve(task()), timeoutPromise]);
      } catch (err) {
        logger.error({ err, taskName: name }, `[Lifecycle] Shutdown task failed: ${name}`);
      }
    }
    
    logger.info('[Lifecycle] All shutdown tasks completed. Exiting.');
    process.exit(0);
  } catch (err) {
    logger.fatal({ err }, '[Lifecycle] Graceful shutdown encountered a fatal error or timed out.');
    process.exit(1);
  }
}

// Global listeners
process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));
process.on('unhandledRejection', (reason, promise) => {
  logger.error({ reason, promise }, '[Lifecycle] Unhandled Rejection at Promise');
});
process.on('uncaughtException', (err) => {
  logger.fatal({ err }, '[Lifecycle] Uncaught Exception. Shutting down...');
  shutdown('uncaughtException');
});
