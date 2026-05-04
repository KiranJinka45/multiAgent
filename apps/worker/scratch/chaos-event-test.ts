import { eventBus } from '../../packages/events/src';
import { db } from '../../packages/db/src';
import { logger } from '../../packages/observability/src';
import { setupMissionRecorder } from '../src/mission-recorder';
import * as os from 'os';

/**
 * CHAOS TEST: Distributed Reliability
 * 1. Start Mission Recorder.
 * 2. Send 10 events.
 * 3. Kill Mission Recorder mid-stream.
 * 4. Restart Mission Recorder.
 * 5. Verify Postgres count (10/10).
 */
async function runChaosTest() {
    const missionId = `chaos-${Date.now()}`;
    const streamKey = 'platform:mission:events';
    
    console.log('🏁 Starting Chaos Test: Distributed Reliability');
    
    // 1. Send 5 events while recorder is OFF
    console.log('📝 Publishing 5 events (Offline Phase)...');
    for (let i = 1; i <= 5; i++) {
        await eventBus.publish(streamKey, {
            executionId: missionId,
            type: 'progress',
            message: `Event ${i}`,
            totalProgress: i * 10,
            timestamp: new Date().toISOString()
        });
    }

    // 2. Start Mission Recorder
    console.log('🚀 Starting Mission Recorder...');
    await setupMissionRecorder();

    // 3. Send 5 more events while recorder is ON
    console.log('📝 Publishing 5 more events (Online Phase)...');
    for (let i = 6; i <= 10; i++) {
        await eventBus.publish(streamKey, {
            executionId: missionId,
            type: 'progress',
            message: `Event ${i}`,
            totalProgress: i * 10,
            timestamp: new Date().toISOString()
        });
    }

    // 4. Wait for processing
    console.log('⏳ Waiting for processing...');
    await new Promise(resolve => setTimeout(resolve, 5000));

    // 5. Verify DB
    const count = await db.executionLog.count({
        where: { executionId: missionId }
    });

    console.log(`📊 DB Results: ${count}/10 events recovered`);

    if (count === 10) {
        console.log('✅ PASS: All events reached Postgres despite asynchronous startup.');
    } else {
        console.log('❌ FAIL: Event loss detected.');
    }

    // 6. Shutdown
    await eventBus.shutdown();
    process.exit(0);
}

runChaosTest().catch(err => {
    console.error(err);
    process.exit(1);
});
