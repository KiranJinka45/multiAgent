import { HostDaemon } from '../../packages/runtime-core/src/supervisor/host-daemon';
import { sigstore } from '../../packages/ztan-crypto/src/sigstore/mock-cosign';
import * as crypto from 'crypto';

async function runTests() {
  console.log('--- Testing Wave 4 Provenance Gatekeeper ---');

  // 1. Simulate CI Pipeline signing a legitimate image
  const legitimateImage = 'ztan-worker';
  const legitimateDigest = 'sha256:' + crypto.createHash('sha256').update('v1.0.0-code').digest('hex');
  const ciIdentity = 'build-bot@ztan.io';

  console.log(`[CI] Building image ${legitimateImage}`);
  console.log(`[CI] Signing digest ${legitimateDigest} with identity ${ciIdentity}`);
  sigstore.signImage(legitimateImage, legitimateDigest, ciIdentity);

  // Start the Host Daemon
  const daemon = new HostDaemon();
  await daemon.start();

  let successCount = 0;
  let failCount = 0;

  try {
    // TEST 1: Legitimate Spawning
    console.log('\n[Test 1] Attempting to spawn legitimate signed image...');
    try {
      daemon.spawnEnclave({ imageName: legitimateImage, digest: legitimateDigest });
      console.log('✅ [Test 1 Passed] Legitimate image spawned successfully.');
      successCount++;
    } catch (e) {
      console.error('❌ [Test 1 Failed] Legitimate image was incorrectly rejected.', e);
      failCount++;
    }

    // TEST 2: Tag Spoofing / Unsigned Digest
    const spoofedDigest = 'sha256:' + crypto.createHash('sha256').update('malicious-code').digest('hex');
    console.log('\n[Test 2] Attempting to spawn un-signed spoofed digest...');
    try {
      daemon.spawnEnclave({ imageName: legitimateImage, digest: spoofedDigest });
      console.error('❌ [Test 2 Failed] Spoofed image was incorrectly allowed!');
      failCount++;
    } catch (e: any) {
      if (e.message.includes('SupplyChainError')) {
        console.log('✅ [Test 2 Passed] Spoofed image was correctly rejected.');
        successCount++;
      } else {
        throw e;
      }
    }

    // TEST 3: Developer / Third-Party Signed (Wrong Identity)
    const devSignedDigest = 'sha256:' + crypto.createHash('sha256').update('dev-experiment').digest('hex');
    const devIdentity = 'developer@ztan.io';
    console.log(`\n[CI] Signing dev digest ${devSignedDigest} with identity ${devIdentity}`);
    sigstore.signImage(legitimateImage, devSignedDigest, devIdentity);

    console.log('\n[Test 3] Attempting to spawn image signed by unauthorized developer identity...');
    try {
      daemon.spawnEnclave({ imageName: legitimateImage, digest: devSignedDigest });
      console.error('❌ [Test 3 Failed] Developer-signed image was incorrectly allowed!');
      failCount++;
    } catch (e: any) {
      if (e.message.includes('SupplyChainError')) {
        console.log('✅ [Test 3 Passed] Developer-signed image was correctly rejected.');
        successCount++;
      } else {
        throw e;
      }
    }

  } finally {
    daemon.stop();
    console.log(`\n--- Test Summary ---`);
    console.log(`Passed: ${successCount}`);
    console.log(`Failed: ${failCount}`);
    if (failCount > 0) {
      process.exit(1);
    }
  }
}

runTests().catch(e => {
  console.error(e);
  process.exit(1);
});
