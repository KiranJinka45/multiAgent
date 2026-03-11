import { Queue, QueueEvents, DefaultJobOptions } from 'bullmq';
import redis from '@queue/redis-client';
import logger from '@config/logger';

export const QUEUE_PLANNER = 'planner-queue';
export const QUEUE_ARCHITECTURE = 'architecture-queue';
export const QUEUE_GENERATOR = 'generator-queue';
export const QUEUE_VALIDATOR = 'validator-queue';
export const QUEUE_DOCKER = 'docker-queue';
export const QUEUE_DEPLOY = 'deploy-queue';
export const QUEUE_SUPERVISOR = 'supervisor-queue';
export const QUEUE_REPAIR = 'repair-queue';
export const QUEUE_META = 'meta-agent-queue';

const connection = redis as any;

const defaultOptions: DefaultJobOptions = {
    attempts: 3,
    backoff: {
        type: 'exponential',
        delay: 5000,
    },
    removeOnComplete: false,
    removeOnFail: {
        age: 24 * 3600, // keep for 24 hours
    },
};

// Isolated stage queues
export const plannerQueue = new Queue(QUEUE_PLANNER, { connection, defaultJobOptions: defaultOptions });
export const architectureQueue = new Queue(QUEUE_ARCHITECTURE, { connection, defaultJobOptions: defaultOptions });
export const generatorQueue = new Queue(QUEUE_GENERATOR, { connection, defaultJobOptions: defaultOptions });
export const validatorQueue = new Queue(QUEUE_VALIDATOR, { connection, defaultJobOptions: defaultOptions });
export const dockerQueue = new Queue(QUEUE_DOCKER, { connection, defaultJobOptions: defaultOptions });
export const deployQueue = new Queue(QUEUE_DEPLOY, { connection, defaultJobOptions: defaultOptions });
export const supervisorQueue = new Queue(QUEUE_SUPERVISOR, { connection, defaultJobOptions: defaultOptions });
export const repairQueue = new Queue(QUEUE_REPAIR, { connection, defaultJobOptions: defaultOptions });
export const metaQueue = new Queue(QUEUE_META, { connection, defaultJobOptions: defaultOptions });

// Queue Events for monitoring
export const plannerEvents = new QueueEvents(QUEUE_PLANNER, { connection });
export const architectureEvents = new QueueEvents(QUEUE_ARCHITECTURE, { connection });
export const generatorEvents = new QueueEvents(QUEUE_GENERATOR, { connection });
export const validatorEvents = new QueueEvents(QUEUE_VALIDATOR, { connection });
export const dockerEvents = new QueueEvents(QUEUE_DOCKER, { connection });
export const deployEvents = new QueueEvents(QUEUE_DEPLOY, { connection });
export const supervisorEvents = new QueueEvents(QUEUE_SUPERVISOR, { connection });
export const repairEvents = new QueueEvents(QUEUE_REPAIR, { connection });
export const metaEvents = new QueueEvents(QUEUE_META, { connection });

logger.info(`Autonomous Distributed Queues initialized: Planner, Architecture, Generator, Validator, Docker, Deploy, Supervisor, Repair, Meta`);
