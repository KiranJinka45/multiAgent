export declare class IdempotencyManager {
    /**
     * Executes an operation that includes external side effects (e.g. Stripe).
     * Passes the key down to the operation so the external system can deduplicate it.
     */
    static executeExternal<T>(key: string, executionId: string, region: string, operation: (idempotencyKey: string) => Promise<T>): Promise<T>;
    /**
     * Executes an operation involving pure DB mutations atomically.
     * Uses Prisma $transaction to guarantee that the idempotency lock and the
     * side effects commit or rollback together.
     */
    static executeDbAtomic<T>(key: string, executionId: string, region: string, operation: (tx: any) => Promise<T>): Promise<T>;
}
//# sourceMappingURL=idempotency.d.ts.map