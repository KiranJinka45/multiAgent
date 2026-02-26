import logger from './logger';
import { Registry, Histogram, Counter } from 'prom-client';

export const registry = new Registry();

// Enforce safe global low-cardinality labels
registry.setDefaultLabels({
    environment: process.env.NODE_ENV || 'production',
});

// --- Agent Metrics ---

export const agentExecutionDuration = new Histogram({
    name: 'agent_execution_duration_seconds',
    help: 'Duration of agent execution in seconds',
    labelNames: ['agent_name', 'status'],
    buckets: [1, 5, 10, 30, 60, 120, 300], // buckets in seconds
    registers: [registry],
});

export const agentFailuresTotal = new Counter({
    name: 'agent_failures_total',
    help: 'Total number of agent failures',
    labelNames: ['agent_name'],
    registers: [registry],
});

export const retryCountTotal = new Counter({
    name: 'retry_count_total',
    help: 'Total number of agent retries',
    labelNames: ['agent_name'],
    registers: [registry],
});

// --- Orchestrator/Execution Level Metrics ---

export const executionSuccessTotal = new Counter({
    name: 'execution_success_total',
    help: 'Total number of successful project generations',
    registers: [registry],
});

export const executionFailureTotal = new Counter({
    name: 'execution_failure_total',
    help: 'Total number of failed project generations',
    registers: [registry],
});

// --- Queue Metrics ---

export const queueWaitTimeSeconds = new Histogram({
    name: 'queue_wait_time_seconds',
    help: 'Time a job waits in queue before being picked up',
    buckets: [0.1, 0.5, 1, 5, 10, 30],
    registers: [registry],
});

export const lockExtensionTotal = new Counter({
    name: 'lock_extension_total',
    help: 'Total number of BullMQ lock extensions',
    registers: [registry],
});

export const lockExpiredTotal = new Counter({
    name: 'lock_expired_total',
    help: 'Total number of BullMQ lock expirations detected',
    registers: [registry],
});

// --- Business/Integration Metrics ---

export const stripeWebhookEventsTotal = new Counter({
    name: 'stripe_webhook_events_total',
    help: 'Total number of stripe webhook events received',
    labelNames: ['event_type'],
    registers: [registry],
});

logger.info('Prometheus metrics initialized');
