import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '@packages/config';
import { db } from '@packages/db';

const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env.JWT_SECRET;
const CONCURRENCY_COUNT = 5;

async function runStressTest() {
  console.log(`🚀 Starting Concurrency Stress Test (${CONCURRENCY_COUNT} parallel jobs)...`);

  const testUser = {
    id: 'stress-test-user',
    email: 'stress@test.com',
    tenantId: 'system',
    roles: ['admin']
  };

  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
  const headers = { Authorization: `Bearer ${token}` };

  // 1. Submit parallel requests
  console.log(`📡 Submitting ${CONCURRENCY_COUNT} parallel build requests...`);
  const submissionPromises = Array.from({ length: CONCURRENCY_COUNT }).map((_, i) => 
    axios.post(`${API_URL}/generate`, {
      prompt: `Parallel Job #${i}: Build a dashboard component with real-time charts.`,
      projectId: `stress-project-${i}`
    }, { headers }).then(res => res.data.missionId)
  );

  const missionIds = await Promise.all(submissionPromises);
  console.log('✅ All missions submitted:', missionIds);

  // 2. Poll all missions
  console.log('⏳ Polling all missions for completion...');
  const activeMissions = new Set(missionIds);
  const completedMissions = new Set();
  const failedMissions = new Set();

  let attempts = 0;
  const maxAttempts = 120;

  while (attempts < maxAttempts && activeMissions.size > 0) {
    for (const missionId of activeMissions) {
      const mission = await db.mission.findUnique({ where: { id: missionId } });
      
      if (mission) {
        if (mission.status.toLowerCase() === 'completed') {
          console.log(`✅ Mission ${missionId} COMPLETED`);
          completedMissions.add(missionId);
          activeMissions.delete(missionId);
        } else if (mission.status.toLowerCase() === 'failed') {
          console.error(`❌ Mission ${missionId} FAILED`);
          failedMissions.add(missionId);
          activeMissions.delete(missionId);
        } else {
          // Log progress occasionally or just stay quiet to avoid spam
          if (attempts % 5 === 0) {
            console.log(`⏳ Mission ${missionId} is still ${mission.status}...`);
          }
        }
      }
    }

    if (activeMissions.size > 0) {
      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }
  }

  console.log('\n--- Stress Test Results ---');
  console.log(`Total Submitted: ${CONCURRENCY_COUNT}`);
  console.log(`Successfully Completed: ${completedMissions.size}`);
  console.log(`Failed: ${failedMissions.size}`);
  console.log(`Timed Out: ${activeMissions.size}`);

  if (completedMissions.size === CONCURRENCY_COUNT) {
    console.log('🎉 STRESS TEST SUCCESSFUL! All parallel missions completed.');
  } else {
    console.error('❌ STRESS TEST FAILED: Some missions did not complete successfully.');
    process.exit(1);
  }
}

runStressTest().catch(console.error);
