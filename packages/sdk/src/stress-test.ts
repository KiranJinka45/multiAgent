import 'dotenv/config';
import { freeQueue } from '@packages/queue';
import { missionController } from '@packages/utils';
import crypto from 'crypto';

/**
 * MultiAgent Pipeline Stress Test Script
 * Executes parallel jobs to identify race conditions and bottleneck limits.
 */
async function runStressTest(jobsCount: number, loopIndex: number) {
  console.log(`\n[Loop ${loopIndex}] 🚀 Starting Stress Test with ${jobsCount} parallel jobs...`);
  const startTime = Date.now();
  
  const promises: Promise<any>[] = [];
  for (let i = 0; i < jobsCount; i++) {
    const missionId = crypto.randomUUID();
    const projectId = `stress-l${loopIndex}-j${i}`;
    const userId = `tester-sre`;
    const prompt = `Automated stress test job ${i} for loop ${loopIndex}. Build a standard high-performance landing page.`;

    console.log(`  [Job ${i}] Enqueuing mission ${missionId}`);

    const mission = {
      id: missionId,
      projectId,
      userId,
      prompt,
      status: 'queued',
      createdAt: new Date(),
      updatedAt: new Date(),
      tenantId: 'stress-test',
      metadata: {
        fastPath: true,
        stressLoop: loopIndex,
        stressJob: i
      }
    };

    // 1. Create mission state in DB
    await missionController.createMission(mission);

    // 2. Enqueue for BullMQ processing
    promises.push(freeQueue.add('build-init', {
      projectId,
      executionId: missionId,
      userId,
      prompt,
      isFastPreview: true
    }, {
      jobId: `stress:${projectId}:${missionId}`,
      removeOnComplete: true,
      attempts: 3,
      backoff: { 
          type: 'exponential', 
          delay: 2000 
      }
    }));
  }

  try {
    await Promise.all(promises);
    const duration = Date.now() - startTime;
    console.log(`  ✅ Loop ${loopIndex} enqueued in ${duration}ms.`);
    return { duration, success: true };
  } catch (error) {
    console.error(`  ❌ Failed to enqueue Loop ${loopIndex}:`, error);
    return { duration: Date.now() - startTime, success: false };
  }
}

async function main() {
  const count = parseInt(process.argv[2] || '3', 10);
  const loops = parseInt(process.argv[3] || '1', 10);
  
  if (isNaN(count) || count < 1) {
    console.error('Usage: pnpm stress-test [count] [loops]');
    process.exit(1);
  }

  const results: Array<{ duration: number; success: boolean }> = [];
  console.log(`🔥🔥 TOTAL TARGET: ${count * loops} jobs over ${loops} loops 🔥🔥`);

  for (let l = 1; l <= loops; l++) {
    const res = await runStressTest(count, l);
    results.push(res);
    // Brief pause between loops to prevent network saturation during enqueuing
    if (loops > 1) await new Promise(r => setTimeout(r, 1000));
  }

  const totalSuccess = results.filter(r => r.success).length;
  const avgDuration = results.reduce((acc, r) => acc + r.duration, 0) / loops;

  console.log('\n' + '='.repeat(40));
  console.log('🏁 STRESS TEST SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total Jobs:     ${count * loops}`);
  console.log(`Loops:          ${loops}`);
  console.log(`Success Rate:   ${((totalSuccess / loops) * 100).toFixed(1)}%`);
  console.log(`Avg Loop Enq:   ${avgDuration.toFixed(0)}ms`);
  console.log('='.repeat(40) + '\n');
  
  setTimeout(() => process.exit(0), 1000);
}

main().catch(err => {
    console.error('Unhandled Exception:', err);
    process.exit(1);
});
