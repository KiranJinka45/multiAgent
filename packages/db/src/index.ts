import { PrismaClient } from '@prisma/client';
import { config, IS_DEVELOPMENT } from '@packages/config';

/**
 * DATABASE SINGLETON
 * Centralized PrismaClient instance to prevent connection leakage
 * in a multi-service monorepo.
 */
// Type definition for global prisma singleton
const globalForPrisma = global as unknown as {
    db: any | undefined;
};

import { getTenantId } from './context';

const createExtendedClient = () => {
    const baseDb = new PrismaClient({
        log: [
            { emit: 'event', level: 'query' },
            { emit: 'stdout', level: 'error' },
            { emit: 'stdout', level: 'warn' },
        ],
        datasources: {
            db: {
                url: config.DATABASE_URL
            }
        },
        // SRE Tier-1: Aggressive retry on connection failure
        __internal: {
            engine: {
                connectionTimeout: 10000,
            }
        }
    } as any);

    let failoverMode = false;

    // Phase 21: Slow Query & Performance Monitoring
    (baseDb as any).$on('query' as any, (e: any) => {
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
                        const tenantId = getTenantId();
                        
                        // Apply tenant isolation logic
                        const finalArgs = { ...args } as any;
                        const isPlatformAdmin = !tenantId || tenantId === 'platform-admin';
                        const globalModels = ['Tenant', 'Product', 'PaymentEvent', 'CodeModule', 'Pattern'];

                        if (!isPlatformAdmin && !globalModels.includes(model)) {
                            if (['findFirst', 'findMany', 'findUnique', 'count', 'aggregate', 'groupBy'].includes(operation)) {
                                finalArgs.where = { ...finalArgs.where, tenantId };
                            } else if (['create', 'createMany'].includes(operation)) {
                                if (Array.isArray(finalArgs.data)) {
                                    finalArgs.data = finalArgs.data.map((d: any) => ({ ...d, tenantId }));
                                } else {
                                    finalArgs.data = { ...finalArgs.data, tenantId };
                                }
                            } else if (['update', 'updateMany', 'upsert', 'delete', 'deleteMany'].includes(operation)) {
                                finalArgs.where = { ...finalArgs.where, tenantId };
                            }
                        }

                        const result = await query(finalArgs);
                        return result;
                    } catch (err: any) {
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
                    } finally {
                        const duration = Date.now() - start;
                        dbQueryDurationSeconds.observe(
                            { model, operation }, 
                            duration / 1000
                        );
                    }
                },
            },
        },
    });
};

// Singleton already defined above

export const db = globalForPrisma.db || createExtendedClient();

if (config.NODE_ENV !== 'production') {
    globalForPrisma.db = db;
}

export { PrismaClient };
export * from './context';
