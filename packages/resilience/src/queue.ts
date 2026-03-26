/**
 * Resilience Queue Configuration
 * Standard BullMQ job options for retries and backoff.
 */
export const DEFAULT_RETRY_OPTIONS = {
  attempts: 3,
  backoff: {
    type: 'exponential',
    delay: 5000, // 5 seconds initial delay
  },
  removeOnComplete: { count: 100 }, // Keep last 100 jobs
  removeOnFail: { count: 500 }, // Keep some failed for analysis
};

export const DEAD_LETTER_QUEUE_NAME = 'dead-letter-hooks';
