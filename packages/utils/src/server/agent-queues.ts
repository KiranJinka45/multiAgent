import { Queue, QueueEvents, DefaultJobOptions, ConnectionOptions } from 'bullmq';
import { redis } from './redis';
import { logger } from './logger';
import { createLazyProxy } from './runtime';

export const QUEUE_PLANNER = 'planner-queue';
export const QUEUE_ARCHITECTURE = 'architecture-queue';
export const QUEUE_GENERATOR = 'generator-queue';
export const QUEUE_VALIDATOR = 'validator-queue';
export const QUEUE_DOCKER = 'docker-queue';
export const QUEUE_DEPLOY = 'deploy-queue';
export const QUEUE_SUPERVISOR = 'supervisor-queue';
export const QUEUE_REPAIR = 'repair-queue';
export const QUEUE_META = 'meta-agent-queue';

const connection = redis as unknown as ConnectionOptions;

const defaultOptions: DefaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 5000,
    },
    removeOnComplete: {
        age: 3600, // Keep completed for 1 hour
        count: 100
    },
    removeOnFail: false, // Don't remove on fail so we can dead-letter it
};

export const QUEUE_DLQ = 'dead-letter-queue';
export const deadLetterQueue = createLazyProxy(() => new Queue(QUEUE_DLQ, { connection }), 'Queue_DLQ');

// Isolated stage queues
export const plannerQueue = createLazyProxy(() => new Queue(QUEUE_PLANNER, { connection, defaultJobOptions: defaultOptions }), 'Queue_Planner');
export const architectureQueue = createLazyProxy(() => new Queue(QUEUE_ARCHITECTURE, { connection, defaultJobOptions: defaultOptions }), 'Queue_Architecture');
export const generatorQueue = createLazyProxy(() => new Queue(QUEUE_GENERATOR, { connection, defaultJobOptions: defaultOptions }), 'Queue_Generator');
export const validatorQueue = createLazyProxy(() => new Queue(QUEUE_VALIDATOR, { connection, defaultJobOptions: defaultOptions }), 'Queue_Validator');
export const dockerQueue = createLazyProxy(() => new Queue(QUEUE_DOCKER, { connection, defaultJobOptions: defaultOptions }), 'Queue_Docker');
export const deployQueue = createLazyProxy(() => new Queue(QUEUE_DEPLOY, { connection, defaultJobOptions: defaultOptions }), 'Queue_Deploy');
export const supervisorQueue = createLazyProxy(() => new Queue(QUEUE_SUPERVISOR, { connection, defaultJobOptions: defaultOptions }), 'Queue_Supervisor');
export const repairQueue = createLazyProxy(() => new Queue(QUEUE_REPAIR, { connection, defaultJobOptions: defaultOptions }), 'Queue_Repair');
export const metaQueue = createLazyProxy(() => new Queue(QUEUE_META, { connection, defaultJobOptions: defaultOptions }), 'Queue_Meta');

// Queue Events for monitoring
export const plannerEvents = createLazyProxy(() => new QueueEvents(QUEUE_PLANNER, { connection }), 'Events_Planner');
export const architectureEvents = createLazyProxy(() => new QueueEvents(QUEUE_ARCHITECTURE, { connection }), 'Events_Architecture');
export const generatorEvents = createLazyProxy(() => new QueueEvents(QUEUE_GENERATOR, { connection }), 'Events_Generator');
export const validatorEvents = createLazyProxy(() => new QueueEvents(QUEUE_VALIDATOR, { connection }), 'Events_Validator');
export const dockerEvents = createLazyProxy(() => new QueueEvents(QUEUE_DOCKER, { connection }), 'Events_Docker');
export const deployEvents = createLazyProxy(() => new QueueEvents(QUEUE_DEPLOY, { connection }), 'Events_Deploy');
export const supervisorEvents = createLazyProxy(() => new QueueEvents(QUEUE_SUPERVISOR, { connection }), 'Events_Supervisor');
export const repairEvents = createLazyProxy(() => new QueueEvents(QUEUE_REPAIR, { connection }), 'Events_Repair');
export const metaEvents = createLazyProxy(() => new QueueEvents(QUEUE_META, { connection }), 'Events_Meta');

// Queues are initialized lazily via proxies
