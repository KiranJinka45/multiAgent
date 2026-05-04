import { db } from '../packages/db/src';

async function simulateQuotaHits() {
    const frank = await db.user.findUnique({ 
        where: { email: 'frank@dev.com' },
        include: { tenant: true }
    });

    if (frank && frank.tenant) {
        console.log(`🚀 Simulating quota exhaustion (50 missions) for Frank (${frank.tenant.id})...`);
        
        const missions = Array.from({ length: 50 }).map((_, i) => ({
            title: `Stress Test ${i + 1}`,
            status: 'completed',
            tenantId: frank.tenant!.id,
            totalCostUsd: 0.01,
            computeDurationMs: 500
        }));

        await db.mission.createMany({ data: missions });
        
        console.log('✅ Done. Frank is now at 100% quota.');
    }

    await db.$disconnect();
}

simulateQuotaHits();
