import { createServer as createGateway } from '../../apps/intent-gateway/src/server.js';
import { createServer as createSandbox } from '../../apps/sandbox-service/src/server.js';
import { createServer as createPolicy } from '../../apps/policy-engine/src/server.js';
import { startServer as createLedger } from '../../apps/governance-ledger/src/server.js';
import { MissionOrchestrator } from '../../packages/core-engine/src/index.js';
import { logger } from '@packages/observability';
import axios from 'axios';
import crypto from 'crypto';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN GOVERNANCE FABRIC INTEGRATION TEST        ║');
  console.log('║           - Validating Immutable Hash Chain -            ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.env.MOCK_DB = 'true';

  const gatewayApp = createGateway();
  const sandboxApp = createSandbox();
  const policyApp = createPolicy();

  const gatewayServer = gatewayApp.listen(3090, () => {
    logger.info('Test Intent Gateway listening on port 3090');
  });
  const sandboxServer = sandboxApp.listen(3095, () => {
    logger.info('Test Sandbox Service listening on port 3095');
  });
  const policyServer = policyApp.listen(3100, () => {
    logger.info('Test Policy Engine listening on port 3100');
  });

  // We have to wait for the Ledger server to start, since startServer calls app.listen directly inside.
  // Actually startServer doesn't return the server instance, it just listens. Let's fix that later or just run it.
  // Wait, startServer in apps/governance-ledger/src/server.ts returns nothing (or rather undefined) but it starts listening on PORT 3105.
  createLedger().catch(console.error);

  let passed = true;

  try {
    await wait(2000);

    const orchestrator = new MissionOrchestrator();
    const executionId = `exec-hash-test-${Date.now()}`;

    // ─── Test 1: Generate Events via Orchestrator ───
    console.log('🧪 Running Test 1: Full Orchestration Lifecycle...');
    const result = await orchestrator.execute(
      executionId,
      'Generate a safe page',
      'safe-hash-project'
    );

    if (result.success !== true) {
      throw new Error(`Orchestration failed: ${result.error}`);
    }

    console.log('✅ Orchestration Completed Successfully.');

    // ─── Test 2: Validate the Cryptographic Hash Chain ───
    console.log('\n🧪 Running Test 2: Verifying Tamper-Evident Hash Chains...');
    
    // Fetch the events from the ledger
    const eventsRes = await axios.get(`http://localhost:3105/api/v1/events/${executionId}`);
    const events = eventsRes.data.events;

    if (!events || events.length === 0) {
        throw new Error('Ledger returned no events for the execution!');
    }

    console.log(`Retrieved ${events.length} events from the ledger for correlationId: ${executionId}`);

    let previousHash = 'GENESIS';
    let previousEventId = null;

    for (let i = 0; i < events.length; i++) {
        const event = events[i];
        
        // 1. Verify links
        if (event.parentEventId !== previousEventId) {
            throw new Error(`Tampered Linkage: Event ${i} parentEventId ${event.parentEventId} does not match expected ${previousEventId}`);
        }
        if (event.previousEventHash !== (previousHash === 'GENESIS' ? null : previousHash)) {
            throw new Error(`Tampered Hash Chain: Event ${i} previousEventHash ${event.previousEventHash} does not match expected ${previousHash}`);
        }

        // 2. Re-compute Payload Hash
        const computedPayloadHash = crypto.createHash('sha256').update(event.payload).digest('hex');
        if (computedPayloadHash !== event.payloadHash) {
            throw new Error(`Tampered Payload: Event ${i} computed payload hash does not match stored hash!`);
        }

        // 3. Re-compute Current Event Hash
        const hashData = `${event.eventType}:${event.correlationId}:${event.parentEventId}:${event.payloadHash}:${event.previousEventHash || 'GENESIS'}`;
        const computedCurrentHash = crypto.createHash('sha256').update(hashData).digest('hex');
        if (computedCurrentHash !== event.currentEventHash) {
            throw new Error(`Tampered Event Hash: Event ${i} computed event hash does not match stored hash!`);
        }

        previousHash = event.currentEventHash;
        previousEventId = event.eventId;
    }

    console.log('✅ Immutable Cryptographic Hash Chain Validation Passed. 0 Anomalies detected.');

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed with error:', err.message);
  } finally {
    console.log('\n🛑 Shutting down all test servers...');
    gatewayServer.close();
    sandboxServer.close();
    policyServer.close();
    
    // We didn't capture ledger server instance to close it cleanly because it's hardcoded in startServer,
    // but the process will exit anyway.
    
    if (passed) {
      console.log('\n🎉 ALL GOVERNANCE FABRIC INTEGRATION TESTS PASSED FUNCTIONALLY.');
      process.exit(0);
    } else {
      console.log('\n❌ GOVERNANCE FABRIC INTEGRATION TESTS FAILED.');
      process.exit(1);
    }
  }
}

run().catch((err) => {
  console.error('Fatal test wrapper failure:', err);
  process.exit(1);
});
