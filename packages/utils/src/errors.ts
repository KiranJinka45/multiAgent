/**
 * FAILURE TAXONOMY ERROR CLASSES
 * 
 * Standardized error hierarchy that dictates precise self-healing, backpressure, 
 * retry, and Dead Letter Queue (DLQ) containment policies across the platform.
 */

export abstract class BaseExecutionError extends Error {
    public abstract readonly action: 'retry' | 'backoff' | 'dlq' | 'quarantine' | 'skip' | 'reconciliation';

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
        Object.setPrototypeOf(this, new.target.prototype);
    }
}

/**
 * TransientFailure
 * Represents network hiccups, rate-limits, database locking retries, and temporary lag.
 * Recovery Action: Standard retries with exponential backoff.
 */
export class TransientFailure extends BaseExecutionError {
    public readonly action = 'retry';
}

/**
 * DependencyUnavailableFailure
 * Represents a downstream dependency/microservice outage.
 * Recovery Action: Standard backoff but suppressed if active dependency probes report down.
 */
export class DependencyUnavailableFailure extends BaseExecutionError {
    public readonly action = 'backoff';
}

/**
 * MalformedPayloadFailure
 * Represents invalid JSON, missing required fields, or validation failures on input schema.
 * Recovery Action: Non-retryable. Immediate Dead Letter Queue (DLQ) containment.
 */
export class MalformedPayloadFailure extends BaseExecutionError {
    public readonly action = 'dlq';
}

/**
 * InvariantViolationFailure
 * Represents a business logic or state corruption breach (e.g. negative balances, invalid sequence IDs).
 * Recovery Action: Non-retryable. Immediate quarantine/halt of node execution to protect state.
 */
export class InvariantViolationFailure extends BaseExecutionError {
    public readonly action = 'quarantine';
}

/**
 * DuplicateExecutionFailure
 * Represents a duplicate operation that has already been successfully committed.
 * Recovery Action: Clean skip/ignore, returning the previously cached response.
 */
export class DuplicateExecutionFailure extends BaseExecutionError {
    public readonly action = 'skip';
}

/**
 * TimeoutAmbiguityFailure
 * Represents a request that timed out with an unconfirmed commit state (e.g. HTTP timeout on Stripe).
 * Recovery Action: Reconciliation loop / compensating transactions.
 */
export class TimeoutAmbiguityFailure extends BaseExecutionError {
    public readonly action = 'reconciliation';
}
