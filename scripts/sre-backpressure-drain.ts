import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../packages/config/src/env';
import { db } from '../packages/db/src/index';

const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env.JWT_SECRET || 'your-secret-key';
const JOB_COUNT = 30;

async function runBackpressureTest() {
  console.log(`🚀 Starting SRE Backpressure Test: Draining ${JOB_COUNT} Jobs with 1 Worker...`);

  const testUser = {
    id: 'sre-tester',
    email: 'sre@test.com',
    tenantId: 'system',
    roles: ['admin']
  };

  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Submit 30 jobs rapidly
  console.log(`📡 Submitting ${JOB_COUNT} jobs to the queue...`);
  const missionIds: string[] = [];
  
  for (let i = 0; i < JOB_COUNT; i++) {
    try {
      const res = await axios.post(`${API_URL}/generate`, {
        prompt: `Backpressure Job #${i}: Stress testing queue drain.`,
        projectId: `backpressure-project-${i}`
      }, { headers });
      missionIds.push(res.data.missionId);
      if ((i + 1) % 5 === 0) console.log(`   Submitted ${i + 1}/${JOB_COUNT} jobs...`);
    } catch (err) {
      console.error(`❌ Failed to submit job #${i}:`, err instanceof Error ? err.message : String(err));
    }
  }

  console.log(`✅ All ${missionIds.length} missions submitted. Monitoring drain...`);

  // 2. Monitor completion
  const activeMissions = new Set(missionIds);
  const completedMissions = new Set();
  const failedMissions = new Set();

  let attempts = 0;
  const maxAttempts = 100; // Increased timeout for 30 jobs

  while (attempts < maxAttempts && activeMissions.size > 0) {
    const checkPromises = Array.from(activeMissions).map(async (missionId) => {
      try {
        const mission = await db.mission.findUnique({ where: { id: missionId } });
        if (mission) {
          if (mission.status.toLowerCase() === 'completed') {
            completedMissions.add(missionId);
            activeMissions.delete(missionId);
          } else if (mission.status.toLowerCase() === 'failed') {
            failedMissions.add(missionId);
            activeMissions.delete(missionId);
          }
        }
      } catch (err) {
        // Ignore transient DB errors during stress
      }
    });

    await Promise.all(checkPromises);

    if (attempts % 2 === 0) {
      console.log(`📊 Progress: ${completedMissions.size} Completed, ${failedMissions.size} Failed, ${activeMissions.size} Remaining...`);
    }

    if (activeMissions.size > 0) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  console.log('\n--- Backpressure Test Results ---');
  console.log(`Total Jobs: ${JOB_COUNT}`);
  console.log(`Completed: ${completedMissions.size}`);
  console.log(`Failed: ${failedMissions.size}`);
  console.log(`Remaining/Timed Out: ${activeMissions.size}`);

  if (completedMissions.size === JOB_COUNT) {
    console.log('✅ SRE CERTIFICATION PASSED: Backpressure drain successful.');
  } else {
    console.error('❌ SRE CERTIFICATION FAILED: Backlog did not drain correctly.');
    process.exit(1);
  }
}

runBackpressureTest().catch(console.error);
