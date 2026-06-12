import type { PrismaClient } from '@prisma/client';

/**
 * ZTAN PHASE 14 TIER P0: RLS-AWARE PRISMA CLIENT
 * 
 * This extension wraps Prisma operations to automatically inject the
 * tenant context into the PostgreSQL session via SET LOCAL.
 */

export function createTenantClient(basePrisma: PrismaClient, tenantId: string) {
    // We must use a transaction to ensure the SET LOCAL and the query execute
    // on the exact same physical database connection.
    return basePrisma.$extends({
        query: {
            $allModels: {
                async $allOperations({ model, operation, args, query }) {
                    return basePrisma.$transaction(async (tx) => {
                        // Inject the tenant context into the Postgres connection
                        await tx.$executeRawUnsafe(`SET LOCAL app.current_tenant_id = '${tenantId}';`);
                        
                        // Execute the actual query ON THE TRANSACTION INSTANCE
                        const target = (tx as any)[model];
                        if (target && target[operation]) {
                            return target[operation](args);
                        }
                        
                        // Fallback (though this breaks the transaction boundary)
                        return query(args);
                    });
                }
            }
        }
    });
}
