// Entry point for @apps/worker
import { initInstrumentation } from './instrumentation';
import { startMetricsServer } from '@packages/observability';

// Initialize instrumentation and starts metrics server
// initInstrumentation('worker-fleet');
startMetricsServer(9091);

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
