import { db, redis, QUEUE_FREE } from '@packages/utils';
import { v4 as uuid } from 'uuid';
import { Queue } from 'bullmq';

/**
 * Integration Test: Operational Intelligence (Phase 2)
 * Triggers a mission and verifies that real AI logic is invoked.
 */

async function main() {
    console.log('🚀 Starting Integration Test: Phase 2 Agents');

    const projectId = uuid();
    const missionId = uuid();
    const prompt = 'Create a simple hello-world Next.js page with a blue heading.';

    // 0. Setup Tenant
    await db.tenant.upsert({
        where: { id: 'test-tenant' },
        update: {},
        create: { id: 'test-tenant', name: 'Test Tenant' }
    });

    // 1. Create Project
    await db.project.create({
        data: {
            id: projectId,
            name: 'Phase 2 Test Project',
            status: 'active',
            tenantId: 'test-tenant'
        }
    });

    // 2. Create Mission
    await db.mission.create({
        data: {
            id: missionId,
            title: 'AI Intelligence Test',
            description: prompt,
            status: 'queued',
            tenantId: 'test-tenant'
        }
    });

    console.log(`✅ Mission created: ${missionId}`);

    // 3. Enqueue Job
    const queue = new Queue(QUEUE_FREE, { connection: redis });
    await queue.add('mission', {
        executionId: missionId,
        prompt,
        projectId,
        tenantId: 'test-tenant'
    });

    console.log(`📡 Job enqueued to ${QUEUE_FREE}. Waiting for processing...`);

    // 4. Poll for status
    let attempts = 0;
    while (attempts < 20) {
        const mission = await db.mission.findUnique({ where: { id: missionId } });
        console.log(`[${new Date().toLocaleTimeString()}] Status: ${mission?.status}`);

        if (mission?.status === 'complete' || mission?.status === 'completed') {
            console.log('🎉 MISSION COMPLETED SUCCESSFULLY!');
            
            // Verify files in DB
            const files = await db.projectFile.findMany({ where: { projectId } });
            console.log(`📁 Files Generated: ${files.length}`);
            files.forEach(f => console.log(`   - ${f.path}`));

            process.exit(0);
        }

        if (mission?.status === 'failed') {
            const errorMsg = (mission as any).metadata?.error || mission.error || 'Unknown error';
            console.error('❌ MISSION FAILED:', errorMsg);
            process.exit(1);
        }

        await new Promise(r => setTimeout(r, 5000));
        attempts++;
    }

    console.error('⏰ Test timed out.');
    process.exit(1);
}

main().catch(err => {
    console.error('💥 Test execution error:', err);
    process.exit(1);
});
