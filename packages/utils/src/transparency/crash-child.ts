import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

if (process.env.DATABASE_URL) {
  process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^"(.*)"$/, '$1');
}

import { GovernanceLedger } from '../governance-ledger.js';

async function main() {
  const killPoint = process.env.ZTAN_KILL_POINT || 'NONE';
  console.log(`[CHILD] Starting crash child process with ZTAN_KILL_POINT=${killPoint}`);
  try {
    GovernanceLedger.init();
    
    // Wait until partition 0 transitions to ACTIVE or DEGRADED
    let settled = false;
    for (let i = 0; i < 50; i++) {
      const state = GovernanceLedger.getState(0);
      if (state === 'ACTIVE' || state === 'DEGRADED') {
        settled = true;
        break;
      }
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    if (!settled) {
      console.error(`[CHILD] State did not settle from READ_ONLY. Current state: ${GovernanceLedger.getState(0)}`);
      process.exit(1);
    }
    
    GovernanceLedger.stopBackgroundTasks();

    const entry = await GovernanceLedger.appendEntry(
      'POLICY',
      `ZTAN-CRASH-TEST-PAYLOAD for killpoint ${killPoint}`,
      'CRASH-OPERATOR',
      'VERIFIED',
      '105'
    );
    console.log(`[CHILD] Finished append successfully: ${entry.sequenceId}`);
    process.exit(0);
  } catch (err: any) {
    console.error(`[CHILD] Error: ${err.message || err}`);
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
