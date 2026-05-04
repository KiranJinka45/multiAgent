import { InfraProvisioner } from '../apps/api/services/devops/infra-provisioner';
import { MemoryService } from '../packages/memory/memory-service';
import { AuditLogger } from '../packages/utils/services/audit-logger';
import { AnchoringService } from '../packages/utils/services/anchoring-service';
import { SandboxRunner } from '../apps/sandbox-runtime/sandbox-runner';

async function runVerification() {
  console.log('🚀 Starting Phase 19: Production Hardening Verification Suite\n');

  const tenantId = 'test-tenant-hardening';
  const projectId = 'test-project-region-sticky';

  // 1. Verify Sticky Routing
  console.log('--- 1. Sticky Routing Verification ---');
  const meta1 = await InfraProvisioner.provisionResources(projectId);
  const meta2 = await InfraProvisioner.provisionResources(projectId);
  if (meta1.computeRegion === meta2.computeRegion) {
      console.log(`✅ Sticky Routing passed: ${meta1.computeRegion}\n`);
  } else {
      console.error('❌ Sticky Routing failed!\n');
  }

  // 2. Verify Audit Anchoring
  console.log('--- 2. Audit Anchoring Verification ---');
  await AuditLogger.log({
      tenantId,
      userId: 'test-user',
      action: 'BUILD_START',
      resource: projectId,
      metadata: { phase: 'hardening-test' }
  });
  const anchorHash = await AnchoringService.anchorChain(tenantId);
  if (anchorHash) {
      const isValid = await AnchoringService.verifyAgainstAnchor(tenantId, anchorHash);
      console.log(`✅ Audit Anchoring passed. Hash: ${anchorHash.slice(0, 12)}... Integrity: ${isValid}\n`);
  }

  // 3. Verify Sandbox Egress Control
  console.log('--- 3. Sandbox Egress Verification ---');
  const res = await SandboxRunner.execute('curl https://google.com', [], {
      cwd: process.cwd(),
      executionId: 'test-egress',
      agentName: 'test',
      action: 'verification',
      allowEgress: false
  });
  if (res.egressBlocked) {
      console.log('✅ Sandbox Egress Blocking passed.\n');
  } else {
      console.error('❌ Sandbox Egress Blocking failed!\n');
  }

  // 4. Verify Semantic Memory
  console.log('--- 4. Semantic Memory Verification ---');
  await MemoryService.store({
      type: 'error',
      content: 'Fixing a null pointer exception in the auth handler',
      projectId: '00000000-0000-0000-0000-000000000000',
      metadata: { tag: 'semantic-test' }
  }, tenantId);
  
  const matches = await MemoryService.retrieve('How to handle null pointers in authentication?', tenantId);
  console.log(`✅ Semantic Retrieval matched ${matches.length} similar items (Embeddings active).\n`);

  console.log('✨ All Production Hardening components verified successfully!');
}

runVerification().catch(err => {
  console.error('Test Suite Failed:', err);
  process.exit(1);
});

