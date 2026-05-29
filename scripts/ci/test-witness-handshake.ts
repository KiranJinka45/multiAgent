import { EvidenceLedgerService } from '../../packages/ztan-witness/src/index';

console.log('--- Testing Wave 3 Detached Witness Handshake ---');
console.log(`Configured Host Daemon URL: ${process.env.HOST_DAEMON_URL || 'http://127.0.0.1:5050'}`);

async function runTest() {
  try {
    console.log('[WitnessNode] Initiating Out-of-Band Physical Attestation Challenge...');
    
    // We invoke the private pre-flight method directly to isolate the handshake test
    // from the PostgreSQL/Redis dependencies of the actual append() method.
    await (EvidenceLedgerService as any).performPreflightAttestation();
    
    console.log('✅ [WitnessNode] SUCCESS: Host Daemon proved its physical integrity.');
    console.log('[WitnessNode] Ready to co-sign state transitions.');
    process.exit(0);
  } catch (err: any) {
    console.error('❌ [WitnessNode] FAILURE: Host Daemon failed attestation challenge.');
    console.error(err.message);
    process.exit(1);
  }
}

// Wait briefly for the HostDaemon server to start before challenging
setTimeout(() => {
  runTest();
}, 2000);
