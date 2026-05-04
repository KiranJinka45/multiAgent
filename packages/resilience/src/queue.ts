/**
 * Resilience Queue Configuration
 * Standard BullMQ job options for retries and backoff.
 */
export const DEFAULT_RETRY_OPTIONS = {
  attempts: 5,
  backoff: {
    type: 'exponential',
    delay: 2000, // 2 seconds initial delay
  },
  removeOnComplete: { count: 500 }, // Keep last 500 successful jobs for audit
  removeOnFail: false, // MANDATORY for Tier-1: Never auto-delete failed jobs
};

export const DEAD_LETTER_QUEUE_NAME = 'multiagent-dlq-fleet';
