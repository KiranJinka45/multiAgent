import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '@packages/config';
import { db } from '@packages/db';
import { redis } from '@packages/utils';

const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env.JWT_SECRET;

async function runE2ELoop() {
  console.log('🚀 Starting E2E Loop Validation...');

  // 1. Generate a valid test token
  const testUser = {
    id: 'e2e-test-user',
    email: 'e2e@test.com',
    tenantId: 'system',
    roles: ['admin', 'agents:read', 'missions:read']
  };

  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '1h' });
  console.log('✅ Generated E2E Test Token');

  // 2. Submit a build request
  console.log('📡 Submitting build request to /api/generate...');
  try {
    const res = await axios.post(`${API_URL}/generate`, {
      prompt: 'Build a premium SaaS landing page with dark mode and glassmorphism.'
    }, {
      headers: {
        Authorization: `Bearer ${token}`
      }
    });

    const { missionId } = res.data;
    console.log(`✅ Build submitted. Mission ID: ${missionId}`);

    // 3. Poll mission status
    console.log('⏳ Polling mission status...');
    let attempts = 0;
    const maxAttempts = 120; // 10 minute timeout with 5s intervals

    while (attempts < maxAttempts) {
      // We can check DB directly or via API
      const mission = await db.mission.findUnique({
        where: { id: missionId }
      });

      if (!mission) {
        console.log('⚠️ Mission not found in DB yet...');
      } else {
        console.log(`📊 Current Status: ${mission.status} (${attempts}/${maxAttempts})`);
        
        if (mission.status.toLowerCase() === 'completed') {
          console.log('🎉 E2E LOOP SUCCESSFUL! Mission Completed.');
          return;
        }
        if (mission.status.toLowerCase() === 'failed') {
          console.error('❌ E2E LOOP FAILED: Mission failed.');
          process.exit(1);
        }
      }

      await new Promise(r => setTimeout(r, 5000));
      attempts++;
    }

    console.error('❌ E2E LOOP TIMEOUT: Mission did not complete in time.');
    process.exit(1);

  } catch (err: any) {
    console.error('❌ E2E LOOP ERROR:', err.response?.data || err.message);
    process.exit(1);
  }
}

runE2ELoop().catch(console.error);
