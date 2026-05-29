import axios from 'axios';
import { createServer as createGateway } from '../../apps/intent-gateway/src/server.js';
import { createServer as createPolicy } from '../../apps/policy-engine/src/server.js';
import { startServer as createLedger } from '../../apps/governance-ledger/src/server.js';
import { startServer as createStewardshipConsole } from '../../apps/stewardship-console/src/server.js';
import { getRedisClient } from '@packages/utils';
import { logger } from '@packages/observability';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN STEWARDSHIP FREEZE INTEGRATION TEST       ║');
  console.log('║           - Validating Operator Kill Switches -          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.env.MOCK_DB = 'true';
  process.env.MOCK_REDIS = 'true';

  // Ensure un-frozen at start
  const redis = await getRedisClient();
  await redis.del('SYSTEM_FROZEN');

  const gatewayApp = createGateway();
  const policyApp = createPolicy();

  const gatewayServer = gatewayApp.listen(3090, () => logger.info('Gateway on 3090'));
  const policyServer = policyApp.listen(3100, () => logger.info('Policy on 3100'));
  
  // startServer doesn't return server instances in our simple setup, they just listen.
  createLedger().catch(console.error); // port 3105
  createStewardshipConsole().catch(console.error); // port 3110

  let passed = true;

  try {
    await wait(2000); // wait for servers

    console.log('🧪 Test 1: Verify gateway allows requests when active...');
    let res = await axios.post('http://localhost:3090/api/v1/inspect', {
        prompt: 'Hello',
        tools: [],
        requested_actions: []
    });
    if (res.status !== 200) throw new Error('Expected 200 OK from Gateway');
    console.log('✅ Gateway allowed request.');

    console.log('\n🧪 Test 2: Operator triggers freeze switch via Stewardship Console...');
    res = await axios.post('http://localhost:3110/api/v1/stewardship/freeze', { action: 'freeze' });
    if (res.data.status !== 'frozen') throw new Error('Failed to freeze system');
    console.log('✅ System frozen.');

    console.log('\n🧪 Test 3: Verify gateway rejects requests with 503 Governance Freeze...');
    try {
        await axios.post('http://localhost:3090/api/v1/inspect', {
            prompt: 'Hello again',
            tools: [],
            requested_actions: []
        });
        throw new Error('Gateway SHOULD HAVE blocked request!');
    } catch (err: any) {
        if (err.response?.status === 503) {
            console.log('✅ Gateway blocked request properly.');
        } else {
            throw new Error(`Expected 503, got ${err.response?.status}`);
        }
    }

    console.log('\n🧪 Test 4: Operator unfreezes system...');
    res = await axios.post('http://localhost:3110/api/v1/stewardship/freeze', { action: 'unfreeze' });
    if (res.data.status !== 'active') throw new Error('Failed to unfreeze system');
    console.log('✅ System active.');

    console.log('\n🧪 Test 5: Verify gateway allows requests again...');
    res = await axios.post('http://localhost:3090/api/v1/inspect', {
        prompt: 'Hello',
        tools: [],
        requested_actions: []
    });
    if (res.status !== 200) throw new Error('Expected 200 OK from Gateway');
    console.log('✅ Gateway allowed request.');

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed:', err.message);
  } finally {
    console.log('\n🛑 Shutting down test...');
    gatewayServer.close();
    policyServer.close();
    if (passed) {
      console.log('\n🎉 ALL STEWARDSHIP FREEZE INTEGRATION TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ STEWARDSHIP FREEZE INTEGRATION TESTS FAILED.');
      process.exit(1);
    }
  }
}

run().catch(console.error);
