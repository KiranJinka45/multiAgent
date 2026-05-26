import { GovernanceLedger } from '../governance-ledger.js';

async function runChildAppender() {
  console.log(`[CHILD-${process.pid}] Starting concurrent child appender...`);
  
  // Wait a small bit to align execution with parent
  await new Promise(resolve => setTimeout(resolve, 100));

  GovernanceLedger.init();
  let retries = 0;
  const count = GovernanceLedger.getPartitionCount();
  let allActive = false;
  while (!allActive && retries < 50) {
    allActive = true;
    for (let p = 0; p < count; p++) {
      if (GovernanceLedger.getState(p) !== 'ACTIVE') {
        allActive = false;
        break;
      }
    }
    if (!allActive) {
      await new Promise(resolve => setTimeout(resolve, 100));
      retries++;
    }
  }
  GovernanceLedger.stopBackgroundTasks();

  for (let i = 1; i <= 10; i++) {
    try {
      const payload = `ZTAN-CONCURRENT-CHILD-${i}: Operator ceremony child lock write`;
      const entry = await GovernanceLedger.appendEntry('POLICY', payload, `CHILD-OPERATOR-${process.pid}`, 'VERIFIED', '105');
      console.log(`[CHILD-${process.pid}] ✅ Appended block ${entry.sequenceId} successfully.`);
    } catch (err: any) {
      console.error(`[CHILD-${process.pid}] ❌ Append failed: ${err.message || err}`);
    }
    // Small sleep to introduce timing variance
    await new Promise(resolve => setTimeout(resolve, 50));
  }

  console.log(`[CHILD-${process.pid}] Finished concurrent child appender.`);
  process.exit(0);
}

runChildAppender().catch(err => {
  console.error('Fatal error in child appender:', err);
  process.exit(1);
});
