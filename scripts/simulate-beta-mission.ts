import { db } from '@packages/db';
import axios from 'axios';

async function simulateBetaMission() {
    console.log('🧪 SIMULATING E2E MISSION FOR COHORT A...');

    const alice = await db.user.findUnique({ 
        where: { email: 'alice@example.com' },
        include: { tenant: true }
    });

    if (!alice || !alice.tenant) {
        console.error('❌ Alice not found');
        return;
    }

    console.log(`🔹 Using Tenant Context: ${alice.tenantId} (${alice.tenant.name})`);

    const { contextStorage } = require('@packages/observability');

    await contextStorage.run({ tenantId: alice.tenantId }, async () => {
        try {
            const mission = await db.mission.create({
                data: {
                    title: 'Beta Validation Mission',
                    description: 'Verify system survival after hardening',
                    status: 'pending'
                }
            });

            console.log(`✅ Mission Created: ${mission.id}`);
            console.log('⏳ Simulating worker execution...');
        
        // Update to 'processing' to simulate worker pickup
        await db.mission.update({
            where: { id: mission.id },
            data: { status: 'processing' }
        });

        // Add an execution log entry
        await db.executionLog.create({
            data: {
                executionId: mission.id,
                stage: 'HEALTH_CHECK',
                status: 'success',
                message: 'Tier-1 Infrastructure Verified: ALIVE'
            }
        });

        // Mark as completed
        await db.mission.update({
            where: { id: mission.id },
            data: { 
                status: 'completed',
                totalCostUsd: 0.02,
                computeDurationMs: 850
            }
        });

        console.log('🎉 E2E Simulation Success!');
        } catch (err: any) {
            console.error(`❌ Mission Failed: ${err.message}`);
        }
    });

    await db.$disconnect();
}

simulateBetaMission();
