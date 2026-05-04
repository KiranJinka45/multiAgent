export interface AuditEvent {
    action: string;
    resource: string;
    userId?: string;
    tenantId?: string;
    status: 'SUCCESS' | 'FAILURE' | 'ERROR';
    metadata?: Record<string, any>;
    ipAddress?: string;
}
/**
 * PRODUCTION AUDIT AUTHORITY
 * Standardized logging for critical security events and business mutations.
 */
export declare const AuditLogger: {
    /**
     * Log a security or mutation event to the DB and JSON logs.
     * Implements Chained Hashing for Tamper Evidence.
     */
    log(event: AuditEvent): Promise<void>;
    /**
     * Verifies the cryptographic chain for a specific tenant.
     * Returns { valid: boolean, brokenAtId?: string }
     */
    verifyChain(tenantId: string): Promise<{
        valid: boolean;
        brokenAtId: any;
    } | {
        valid: boolean;
        brokenAtId?: undefined;
    }>;
    /**
     * Specialized security events
     */
    logSecurity(action: string, status: "SUCCESS" | "FAILURE", metadata?: any): Promise<void>;
    /**
     * Specialized business mutation events
     */
    logAction(action: string, status: "SUCCESS" | "FAILURE", metadata?: any): Promise<void>;
};
//# sourceMappingURL=audit.d.ts.map