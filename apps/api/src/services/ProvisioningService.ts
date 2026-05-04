import { db } from '@packages/db';
import { logger } from '@packages/observability';
import { v4 as uuid } from 'uuid';

export class ProvisioningService {
    /**
     * Bootstraps a new Organization and its primary Tenant.
     * Sets up default quotas and commercial metadata.
     */
    /**
     * Bootstraps a new Organization and its primary Tenant.
     * Checks the 'Warm Pool' first for an existing, unclaimed tenant.
     */
    static async provisionTenant(orgName: string, ownerId: string) {
        logger.info({ orgName, ownerId }, '[Provisioning] Requesting tenant...');

        try {
            // Attempt to claim a pre-warmed tenant
            const warmTenant = await db.tenant.findFirst({
                where: {
                    metadata: { path: ['isWarm'], equals: true },
                    organizationId: null
                }
            });

            if (warmTenant) {
                logger.info({ tenantId: warmTenant.id }, '[Provisioning] Claiming pre-warmed tenant');
                return await db.$transaction(async (tx: any) => {
                    const org = await tx.organization.create({
                        data: {
                            name: orgName,
                            ownerId: ownerId,
                            status: 'active'
                        }
                    });

                    const tenant = await tx.tenant.update({
                        where: { id: warmTenant.id },
                        data: {
                            name: `${orgName} (Main)`,
                            organizationId: org.id,
                            metadata: {
                                ...(warmTenant.metadata as any),
                                isWarm: false,
                                claimedAt: new Date().toISOString()
                            }
                        }
                    });

                    await tx.user.update({
                        where: { id: ownerId },
                        data: { organizationId: org.id, tenantId: tenant.id }
                    });

                    return { tenant, org };
                });
            }

            // Fallback: Create from scratch
            logger.info('[Provisioning] Warm pool empty, creating from scratch...');
            return await db.$transaction(async (tx: any) => {
                const org = await tx.organization.create({
                    data: {
                        name: orgName,
                        ownerId: ownerId,
                        status: 'active'
                    }
                });

                const tenantId = `tnt_${uuid().substring(0, 8)}`;
                const tenant = await tx.tenant.create({
                    data: {
                        id: tenantId,
                        name: `${orgName} (Main)`,
                        organizationId: org.id,
                        dailyQuota: 50,
                        metadata: {
                            plan: 'free',
                            provisionedAt: new Date().toISOString()
                        }
                    }
                });

                await tx.user.update({
                    where: { id: ownerId },
                    data: { organizationId: org.id, tenantId: tenant.id }
                });

                return { tenant, org };
            });
        } catch (err) {
            logger.error({ err, orgName }, '[Provisioning] FATAL: Provisioning failed');
            throw err;
        }
    }

    /**
     * Seeds the warm pool with unclaimed tenants.
     * Should be run as a background cron or during low-load periods.
     */
    static async seedWarmPool(count: number = 5) {
        logger.info({ count }, '[Provisioning] Seeding warm pool...');
        for (let i = 0; i < count; i++) {
            const tenantId = `warm_${uuid().substring(0, 8)}`;
            await db.tenant.create({
                data: {
                    id: tenantId,
                    name: 'Warm Tenant (Unclaimed)',
                    dailyQuota: 50,
                    metadata: {
                        isWarm: true,
                        provisionedAt: new Date().toISOString()
                    }
                }
            });
        }
        logger.info('[Provisioning] Warm pool seeding complete');
    }
}
