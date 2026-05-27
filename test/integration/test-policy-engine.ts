import { createServer as createGateway } from '../../apps/intent-gateway/src/server.js';
import { createServer as createSandbox } from '../../apps/sandbox-service/src/server.js';
import { createServer as createPolicy } from '../../apps/policy-engine/src/server.js';
import { MissionOrchestrator } from '../../packages/core-engine/src/index.js';
import { logger } from '@packages/observability';
import axios from 'axios';
import jwt from 'jsonwebtoken';

async function wait(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function run() {
  console.log('\n╔══════════════════════════════════════════════════════════╗');
  console.log('║           ZTAN DETERMINISTIC POLICY INTEGRATION TEST     ║');
  console.log('║           - Validating Phase 5 Layer 8 Governance -       ║');
  console.log('╚══════════════════════════════════════════════════════════╝\n');

  // Spawn services on local test ports
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

  let passed = true;

  try {
    await wait(2000);

    const orchestrator = new MissionOrchestrator();

    // ─── Test 1: Standard Safe Request ───
    console.log('🧪 Running Test 1: Compliant Safe Prompt...');
    const safeResult = await orchestrator.execute(
      'policy-test-safe',
      'Please build a beautiful frontend counter component.',
      'safe-counter-project'
    );

    console.log('Safe Prompt Result:', JSON.stringify(safeResult, null, 2));

    if (safeResult.success === true && safeResult.files.length > 0) {
      console.log('✅ Compliant Safe Prompt Passed.');
    } else {
      throw new Error(`Expected clean approval and file generation, got error: ${safeResult.error}`);
    }

    // ─── Test 2: Token Bypass & Direct Policy Probe ───
    console.log('\n🧪 Running Test 2: Token Bypass / Authentication Check...');
    try {
      const directEvaluateRes = await axios.post('http://localhost:3100/api/v1/policy/evaluate', {
        token: '', // Missing token
        operator: 'steward_omega',
        action: 'EXECUTE_PLAN',
        files: []
      });
      console.log('Direct probe result:', JSON.stringify(directEvaluateRes.data));
      if (directEvaluateRes.data.allowed === false && directEvaluateRes.data.reason.includes('JWT_VERIFICATION_FAILED')) {
        console.log('✅ Token Bypass Prevention Passed (Rejected direct check without signature).');
      } else {
        throw new Error('Security vulnerability: Policy Engine allowed evaluation without valid JWT execution token!');
      }
    } catch (err: any) {
      throw new Error(`Direct evaluation request failed: ${err.message}`);
    }

    // ─── Test 3: Path Violation Check (Post-Generation) ───
    console.log('\n🧪 Running Test 3: Path Restriction Violations...');
    // We will sign a mock token to authenticate our evaluate request to the Policy Engine directly
    const jwtSecret = process.env.JWT_SECRET || 'super-secret-key-123-that-is-at-least-thirty-two-chars-long';
    const mockToken = jwt.sign({
      execution_intent_id: 'mock-audit-id',
      risk_score: 10,
      policy_snapshot: 'test-snapshot',
      timestamp: Date.now()
    }, jwtSecret, { expiresIn: '10m' });

    try {
      const badPathRes = await axios.post('http://localhost:3100/api/v1/policy/evaluate', {
        token: mockToken,
        operator: 'steward_omega',
        action: 'WRITE_FILES',
        files: [
          { path: '.env', content: 'SECRET_API_KEY=leak' }
        ]
      });
      console.log('Restricted path violation result:', JSON.stringify(badPathRes.data));
      if (badPathRes.data.allowed === false && badPathRes.data.reason.includes('POLICY_VIOLATION')) {
        console.log('✅ Path Restriction Check Passed (Writing to .env was blocked).');
      } else {
        throw new Error('Security bypass: Policy Engine incorrectly allowed write to .env!');
      }
    } catch (err: any) {
      throw new Error(`Path check failed: ${err.message}`);
    }

    // ─── Test 4: Unsafe Client-Side Imports Scans ───
    console.log('\n🧪 Running Test 4: Dangerous Import Restrictions...');
    try {
      const unsafeImportRes = await axios.post('http://localhost:3100/api/v1/policy/evaluate', {
        token: mockToken,
        operator: 'steward_omega',
        action: 'WRITE_FILES',
        files: [
          { path: 'src/app/page.tsx', content: 'import child from "child_process";\nexport default function Page() { return null; }' }
        ]
      });
      console.log('Unsafe import result:', JSON.stringify(unsafeImportRes.data));
      if (unsafeImportRes.data.allowed === false && unsafeImportRes.data.reason.includes('POLICY_VIOLATION') && unsafeImportRes.data.reason.includes('child_process')) {
        console.log('✅ Dangerous Import restriction Passed (Importing child_process was blocked).');
      } else {
        throw new Error('Security bypass: Policy Engine incorrectly allowed import of child_process in client-side code!');
      }
    } catch (err: any) {
      throw new Error(`Import check failed: ${err.message}`);
    }

    // ─── Test 5: Unauthorized Operator Scan ───
    console.log('\n🧪 Running Test 5: Unauthorized / Compromised Operators...');
    try {
      const rogueOperatorRes = await axios.post('http://localhost:3100/api/v1/policy/evaluate', {
        token: mockToken,
        operator: 'compromised_operator',
        action: 'EXECUTE_PLAN',
        files: []
      });
      console.log('Rogue operator result:', JSON.stringify(rogueOperatorRes.data));
      if (rogueOperatorRes.data.allowed === false && rogueOperatorRes.data.reason.includes('POLICY_VIOLATION')) {
        console.log('✅ Rogue Operator restriction Passed.');
      } else {
        throw new Error('Security bypass: Policy Engine allowed compromised operator to execute plans!');
      }
    } catch (err: any) {
      throw new Error(`Operator check failed: ${err.message}`);
    }

  } catch (err: any) {
    passed = false;
    console.error('❌ Integration test failed with error:', err.message);
  } finally {
    console.log('\n🛑 Shutting down all test servers...');
    gatewayServer.close(() => {
      sandboxServer.close(() => {
        policyServer.close(() => {
          console.log('All test servers closed.');
          if (passed) {
            console.log('\n🎉 ALL DETERMINISTIC POLICY INTEGRATION TESTS PASSED FUNCTIONALLY.');
            process.exit(0);
          } else {
            console.log('\n❌ DETERMINISTIC POLICY INTEGRATION TESTS FAILED.');
            process.exit(1);
          }
        });
      });
    });
  }
}

run().catch((err) => {
  console.error('Fatal test wrapper failure:', err);
  process.exit(1);
});
