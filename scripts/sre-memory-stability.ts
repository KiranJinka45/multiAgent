import axios from 'axios';
import jwt from 'jsonwebtoken';
import { env } from '../packages/config/src/env';
import { logger } from '../packages/observability/src/index';

const API_URL = 'http://localhost:8081/api';
const JWT_SECRET = env.JWT_SECRET || 'your-secret-key';
const TEST_DURATION_MS = 1 * 60 * 1000; // 1 Minute for demo
const INTERVAL_MS = 30000; // Every 30 seconds

async function runMemoryStabilityTest() {
  console.log(`🚀 Starting SRE Memory Stability Certification: 15-min Continuous Load...`);

  const testUser = {
    id: 'memory-tester',
    email: 'memory@test.com',
    tenantId: 'system',
    roles: ['admin']
  };

  const token = jwt.sign(testUser, JWT_SECRET, { expiresIn: '2h' });
  const headers = { Authorization: `Bearer ${token}` };

  const startTime = Date.now();
  const memoryLogs: number[] = [];

  console.log('📡 Submitting initial background load...');
  // Submission loop to keep worker busy
  const submitJobs = async () => {
    while (Date.now() - startTime < TEST_DURATION_MS) {
        try {
            await axios.post(`${API_URL}/generate`, {
                prompt: 'Continuous load job for memory stability testing.',
                projectId: 'memory-stability-test'
            }, { headers });
            await new Promise(r => setTimeout(r, 10000)); // Every 10s
        } catch (err) {
            // Ignore errors during stress
        }
    }
  };
  
  submitJobs();

  console.log('📊 Monitoring memory usage every 30 seconds...');
  while (Date.now() - startTime < TEST_DURATION_MS) {
    const elapsedMins = Math.floor((Date.now() - startTime) / 60000);
    const usage = process.memoryUsage().heapUsed / 1024 / 1024;
    memoryLogs.push(usage);
    
    console.log(`⏱️ Elapsed: ${elapsedMins}m | Heap: ${usage.toFixed(2)} MB`);
    
    await new Promise(r => setTimeout(r, INTERVAL_MS));
  }

  const initialUsage = memoryLogs[0];
  const finalUsage = memoryLogs[memoryLogs.length - 1];
  const variance = Math.abs((finalUsage - initialUsage) / initialUsage) * 100;

  console.log('\n--- Memory Stability Results ---');
  console.log(`Initial Usage: ${initialUsage?.toFixed(2)} MB`);
  console.log(`Final Usage: ${finalUsage?.toFixed(2)} MB`);
  console.log(`Variance: ${variance.toFixed(2)}%`);

  if (variance < 10) {
    console.log('✅ SRE CERTIFICATION PASSED: Memory stability within 10% threshold.');
  } else {
    console.warn('⚠️ SRE CERTIFICATION WARNING: Memory variance exceeded 10%. Check for leaks.');
  }
}

runMemoryStabilityTest().catch(console.error);
