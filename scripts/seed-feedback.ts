import { db } from '../packages/db/src';

async function seedFeedback() {
    const alice = await db.user.findUnique({ where: { email: 'alice@example.com' } });
    const frank = await db.user.findUnique({ where: { email: 'frank@dev.com' } });

    if (alice) {
        await db.betaFeedback.create({
            data: {
                userId: alice.id,
                tenantId: alice.tenantId!,
                type: 'IMPROVEMENT',
                content: 'Onboarding was a bit slow (took me ~8 mins). I wish the mission creation was more intuitive.',
                status: 'pending'
            }
        });
    }

    if (frank) {
        await db.betaFeedback.create({
            data: {
                userId: frank.id,
                tenantId: frank.tenantId!,
                type: 'ISSUE',
                content: 'Got blocked by quota after 50 missions. The error message could be clearer about when it resets.',
                status: 'triaged'
            }
        });
        
        await db.betaFeedback.create({
            data: {
                userId: frank.id,
                tenantId: frank.tenantId!,
                type: 'IMPROVEMENT',
                content: 'I want to see the Neural Mesh logs directly in the dashboard.',
                status: 'pending'
            }
        });
    }

    console.log('✅ Mock feedback seeded.');
    await db.$disconnect();
}

seedFeedback();
