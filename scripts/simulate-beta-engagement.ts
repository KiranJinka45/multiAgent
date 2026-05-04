import { db } from '@packages/db';

async function simulateEngagement() {
    console.log('🧪 SIMULATING BETA ENGAGEMENT (DAY 3)...');

    const tester01 = await db.user.findFirst({ where: { email: 'beta-test-01@example.com' } });
    const tester02 = await db.user.findFirst({ where: { email: 'beta-test-02@example.com' } });

    if (!tester01 || !tester02) {
        console.error('Testers not found. Run provision-beta-user first.');
        return;
    }

    // 1. Complete 2 more missions for tester 01 (reaching 3 total -> Activation)
    console.log('✅ Completing activation missions for beta-test-01...');
    for (let i = 0; i < 2; i++) {
        await db.mission.create({
            data: {
                title: `Beta Activation Mission ${i + 2}`,
                status: 'complete',
                tenantId: tester01.tenantId,
                margin: 0.45,
                metadata: { simulated: true }
            }
        });
    }

    // 2. Submit Improvement Feedback
    console.log('📝 Submitting improvement feedback for beta-test-01...');
    await db.betaFeedback.create({
        data: {
            tenantId: tester01.tenantId!,
            userId: tester01.id,
            type: 'IMPROVEMENT',
            content: 'The ROI dashboard is great, but I would love to see a breakdown of costs per mission type directly in the list view.',
            status: 'pending'
        }
    });

    // 3. Submit Issue Feedback
    console.log('🐞 Submitting issue feedback for beta-test-02...');
    await db.betaFeedback.create({
        data: {
            tenantId: tester02.tenantId!,
            userId: tester02.id,
            type: 'ISSUE',
            content: 'Encountered a timeout when trying to scale the worker fleet during a high-concurrency run.',
            status: 'pending'
        }
    });

    console.log('🎉 SIMULATION COMPLETE.');
    await db.$disconnect();
}

simulateEngagement();
