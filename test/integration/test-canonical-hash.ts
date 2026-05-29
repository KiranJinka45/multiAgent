import axios from 'axios';
import { startServer as createLedger } from '../../apps/governance-ledger/src/server.js';
import { logger } from '@packages/observability';
import crypto from 'crypto';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN CANONICAL HASH INTEGRATION TEST           ║');
  console.log('║           - Validating Deterministic Payloads -          ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  process.env.MOCK_DB = 'true';
  createLedger().catch(console.error);

  let passed = true;

  try {
    await wait(2000); // let ledger start on 3105
    const correlationId = `exec-canonical-${Date.now()}`;

    const payloadA = { b: 2, a: 1, c: { e: 5, d: 4 } };
    const payloadB = { a: 1, c: { d: 4, e: 5 }, b: 2 };

    // Send payloadA
    const resA = await axios.post(`http://localhost:3105/api/v1/events`, {
      eventType: 'test.event',
      correlationId,
      payload: payloadA
    });
    
    // Send payloadB
    const resB = await axios.post(`http://localhost:3105/api/v1/events`, {
      eventType: 'test.event',
      correlationId,
      payload: payloadB
    });

    const eventA = resA.data;
    const eventB = resB.data;

    console.log('Payload A Hash:', eventA.payloadHash);
    console.log('Payload B Hash:', eventB.payloadHash);

    if (eventA.payloadHash !== eventB.payloadHash) {
        throw new Error('Canonical hashing failed! Hashes do not match for identically structured payloads with different key ordering.');
    } else {
        console.log('✅ Canonical Hash validation passed: Both payloads produced the exact same hash.');
    }

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed:', err.message);
  } finally {
    console.log('\n🛑 Shutting down test...');
    if (passed) {
      console.log('\n🎉 ALL CANONICAL HASH INTEGRATION TESTS PASSED.');
      process.exit(0);
    } else {
      console.log('\n❌ CANONICAL HASH INTEGRATION TESTS FAILED.');
      process.exit(1);
    }
  }
}

run().catch((err) => {
  console.error('Fatal test wrapper failure:', err);
  process.exit(1);
});
