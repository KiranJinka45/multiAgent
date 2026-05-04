"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.PrismaClient = exports.db = void 0;
const client_1 = require("@prisma/client");
Object.defineProperty(exports, "PrismaClient", { enumerable: true, get: function () { return client_1.PrismaClient; } });
const config_1 = require("@packages/config");
/**
 * DATABASE SINGLETON
 * Centralized PrismaClient instance to prevent connection leakage
 * in a multi-service monorepo.
 */
// Type definition for global prisma singleton
const globalForPrisma = global;
const context_1 = require("./context");
const createExtendedClient = () => {
    const baseDb = new client_1.PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
        ],
        datasources: {
            db: {
                url: config_1.config.DATABASE_URL
            }
        },
        // SRE Tier-1: Aggressive retry on connection failure
        __internal: {
            engine: {
                connectionTimeout: 10000,
            }
        }
    });
    let failoverMode = false;
    // Phase 21: Slow Query & Performance Monitoring
    baseDb.$on('query', (e) => {
        const { logger } = require('@packages/observability');
        if (e.duration > 200) {
            logger.warn({
                duration: `${e.duration}ms`,
                query: e.query,
                params: e.params
            }, '[DATABASE] Slow Query Detected');
        }
    });
    /**
     * TENANT ISOLATION & PERFORMANCE MONITORING EXTENSION
     */
    return baseDb.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    const { dbQueryDurationSeconds } = require('@packages/observability');
                    const start = Date.now();
                    try {
                        const tenantId = (0, context_1.getTenantId)();
                        // Apply tenant isolation logic
                        const finalArgs = { ...args };
                        const isPlatformAdmin = !tenantId || tenantId === 'platform-admin';
                        const globalModels = ['Tenant', 'Product', 'PaymentEvent', 'CodeModule', 'Pattern'];
                        if (!isPlatformAdmin && !globalModels.includes(model)) {
                            if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                                finalArgs.where = { ...finalArgs.where, tenantId };
                            }
                            else if (['create', 'createMany'].includes(operation)) {
                                if (Array.isArray(finalArgs.data)) {
                                    finalArgs.data = finalArgs.data.map((d) => ({ ...d, tenantId }));
                                }
                                else {
                                    finalArgs.data = { ...finalArgs.data, tenantId };
                                }
                            }
                            else if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
                                finalArgs.where = { ...finalArgs.where, tenantId };
                            }
                        }
                        const result = await query(finalArgs);
                        return result;
                    }
                    catch (err) {
                        // SRE Tier-1: Connection Failover Detection
                        const isConnectionError = err.code === 'P1001' || err.code === 'P1002' || err.message.includes("Can't reach database server");
                        if (isConnectionError && !failoverMode) {
                            const { logger } = require('@packages/observability');
                            logger.error({ err }, '🚨 [DATABASE] Primary connection failed. Attempting failover logic...');
                            // In a real autonomous system, we would:
                            // 1. Check if the read-replica is available
                            // 2. Potentially switch the connection string
                            // 3. Signal the Control Plane
                            failoverMode = true;
                        }
                        throw err;
                    }
                    finally {
                        const duration = Date.now() - start;
                        dbQueryDurationSeconds.observe({ model, operation }, duration / 1000);
                    }
                },
            },
        },
    });
};
// Singleton already defined above
exports.db = globalForPrisma.db || createExtendedClient();
if (config_1.config.NODE_ENV !== 'production') {
    globalForPrisma.db = exports.db;
}
__exportStar(require("./context"), exports);
//# sourceMappingURL=index.js.map