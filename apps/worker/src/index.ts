// Entry point for @apps/worker
// CRITICAL: Telemetry must be initialized BEFORE any other imports to capture all spans.
import { initTelemetry } from '@packages/observability';

initTelemetry({
  serviceName: 'worker-fleet',
  metricsPort: 9091,
  enableTracing: true,
});

import './architecture-worker';
import './backend-worker';
import './build-worker';
import './workers/buildWorker';
import './mission-worker';
import './deploy-worker';
import './docker-worker';
import './frontend-worker';
import './generator-worker';
import './meta-agent-worker';
import './planner-worker';
import './repair-worker';
import './supervisor-worker';
import './validator-worker';
import './watchdog-worker';

// Future integration: AI Autonomous Agent
import { setupAutonomousWorker } from '@packages/autonomous-agent';
setupAutonomousWorker();

// Phase 4: Self-Improving AI
import './evolution-worker';
import './auto-refactor-worker';

import { logger } from '@packages/observability';
import { kafkaManager } from '@packages/events';

// Graceful shutdown
const shutdown = async (signal: string) => {
  logger.info({ signal }, '[Worker] Shutdown initiated');
  await kafkaManager.shutdown();
  logger.info('[Worker] Kafka connections closed — exiting');
  process.exit(0);
};

process.on('SIGTERM', () => shutdown('SIGTERM'));
process.on('SIGINT', () => shutdown('SIGINT'));

logger.info('[Worker] Fleet operational with full observability');
