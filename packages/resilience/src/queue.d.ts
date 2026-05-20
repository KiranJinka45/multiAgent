/**
 * Resilience Queue Configuration
 * Standard BullMQ job options for retries and backoff.
 */
export declare const DEFAULT_RETRY_OPTIONS: {
    attempts: number;
    backoff: {
        type: string;
        delay: number;
    };
    removeOnComplete: {
        count: number;
    };
    removeOnFail: boolean;
};
export declare const DEAD_LETTER_QUEUE_NAME = "multiagent-dlq-fleet";
//# sourceMappingURL=queue.d.ts.map