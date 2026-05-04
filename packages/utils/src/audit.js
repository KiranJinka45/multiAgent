"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AuditLogger = void 0;
const db_1 = require("@packages/db");
const observability_1 = require("@packages/observability");
const crypto_1 = __importDefault(require("crypto"));
/**
 * PRODUCTION AUDIT AUTHORITY
 * Standardized logging for critical security events and business mutations.
 */
exports.AuditLogger = {
    /**
     * Log a security or mutation event to the DB and JSON logs.
     * Implements Chained Hashing for Tamper Evidence.
     */
    async log(event) {
        const timestamp = new Date();
        try {
            // 1. Fetch the hash of the PREVIOUS entry for this tenant to create a chain
            const lastEntry = await db_1.db.auditLog.findFirst({
                where: { tenantId: event.tenantId || 'platform-admin' },
                orderBy: { createdAt: 'desc' },
                select: { hash: true }
            });
            const prevHash = lastEntry?.hash || '0'.repeat(64); // Genesis hash if first entry
            const refinedMetadata = {
                ...event.metadata,
                timestamp: timestamp.toISOString(),
                service: process.env.SERVICE_NAME || 'unknown',
                prevHash
            };
            // 2. Generate an integrity hash (Tamper Detection)
            // Chaining: hash = sha256(action | resource | userId | timestamp | prevHash)
            const hashData = `${event.action}|${event.resource}|${event.userId || 'system'}|${timestamp.getTime()}|${prevHash}`;
            const hash = crypto_1.default.createHash('sha256').update(hashData).digest('hex');
            // 3. Write to Database
            await db_1.db.auditLog.create({
                data: {
                    action: event.action,
                    resource: event.resource,
                    userId: event.userId,
                    tenantId: event.tenantId || 'platform-admin',
                    status: event.status,
                    metadata: refinedMetadata,
                    ipAddress: event.ipAddress,
                    hash,
                },
            });
            // 4. Emit Structured JSON Log
            observability_1.logger.info({
                audit: true,
                hash,
                prevHash,
                ...event,
                metadata: refinedMetadata,
            }, `[AUDIT] ${event.action} - ${event.status}`);
        }
        catch (err) {
            observability_1.logger.error({ err, event }, '[AuditLogger] CRITICAL: Failed to write audit log');
        }
    },
    /**
     * Verifies the cryptographic chain for a specific tenant.
     * Returns { valid: boolean, brokenAtId?: string }
     */
    async verifyChain(tenantId) {
        try {
            const logs = await db_1.db.auditLog.findMany({
                where: { tenantId },
                orderBy: { createdAt: 'asc' }
            });
            let expectedPrevHash = '0'.repeat(64);
            for (const log of logs) {
                const metadata = log.metadata;
                // Recompute hash
                const timestamp = new Date(log.createdAt).getTime();
                const hashData = `${log.action}|${log.resource}|${log.userId || 'system'}|${timestamp}|${expectedPrevHash}`;
                const actualHash = crypto_1.default.createHash('sha256').update(hashData).digest('hex');
                if (actualHash !== log.hash || metadata.prevHash !== expectedPrevHash) {
                    observability_1.logger.error({ logId: log.id, tenantId }, '[AuditLogger] LEDGER TAMPERED: Hash mismatch detected');
                    return { valid: false, brokenAtId: log.id };
                }
                expectedPrevHash = log.hash;
            }
            return { valid: true };
        }
        catch (err) {
            observability_1.logger.error({ err, tenantId }, '[AuditLogger] Verification failed');
            return { valid: false };
        }
    },
    /**
     * Specialized security events
     */
    async logSecurity(action, status, metadata) {
        await this.log({
            action,
            resource: 'auth-layer',
            status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
            metadata,
        });
    },
    /**
     * Specialized business mutation events
     */
    async logAction(action, status, metadata) {
        await this.log({
            action,
            resource: 'business-logic',
            status: status === 'SUCCESS' ? 'SUCCESS' : 'FAILURE',
            metadata,
        });
    }
};
//# sourceMappingURL=audit.js.map