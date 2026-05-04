import { db } from '../packages/db/src';
import { BillingEnforcer } from '../packages/billing/src/enforcer';

async function triggerViolation() {
    const frank = await db.user.findUnique({ 
        where: { email: 'frank@dev.com' },
        include: { tenant: true }
    });

    if (frank && frank.tenant) {
        console.log(`🛡️ Attempting 51st mission for Frank (${frank.tenant.id})...`);
        
        try {
            const result = await BillingEnforcer.check(frank.tenant.id);
            if (!result.allowed) {
                console.log(`✅ Success: Mission blocked as expected. Reason: ${result.reason}`);
                
                await db.auditLog.create({
                    data: {
                        userId: frank.id,
                        action: 'QUOTA_ENFORCEMENT_BLOCK',
                        status: 'failure',
                        resource: `tenant:${frank.tenant.id}`,
                        metadata: { 
                            tenantId: frank.tenant.id, 
                            reason: result.reason,
                            limit: 50
                        }
                    }
                });
            } else {
                console.log('❌ Error: Mission allowed when it should have been blocked!');
            }
        } catch (err: any) {
            console.error(`❌ Unexpected Error: ${err.message}`);
        }
    }

    await db.$disconnect();
}

triggerViolation();
