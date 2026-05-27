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
  const requestUuid = process.env.ZTAN_REQUEST_UUID;
  const auditUuid = process.env.ZTAN_AUDIT_UUID;
  const outboxUuid = process.env.ZTAN_OUTBOX_UUID;
  const ledgerBlockUuid = process.env.ZTAN_BLOCK_UUID;

  console.log(`[CHILD-RECOVERY] Starting with ZTAN_KILL_POINT=${killPoint}, requestUuid=${requestUuid}`);
  try {
    GovernanceLedger.init();
    
    // Wait until partition 0 settles
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
      console.error(`[CHILD-RECOVERY] State did not settle. Current state: ${GovernanceLedger.getState(0)}`);
      process.exit(1);
    }
    
    GovernanceLedger.stopBackgroundTasks();

    const correlationMetadata = requestUuid ? {
      requestUuid,
      auditUuid: auditUuid || '',
      outboxUuid: outboxUuid || '',
      ledgerBlockUuid: ledgerBlockUuid || ''
    } : undefined;

    const entry = await GovernanceLedger.appendEntry(
      'POLICY',
      `ZTAN-CRASH-TEST-PAYLOAD for requestUuid ${requestUuid}`,
      'CRASH-OPERATOR',
      'VERIFIED',
      '105',
      undefined,
      correlationMetadata
    );

    console.log(`[CHILD-RECOVERY] Finished append successfully: ${entry.sequenceId}`);
    process.exit(0);
  } catch (err: any) {
    console.error(`[CHILD-RECOVERY] Error: ${err.message || err}`);
    if (err.code === 'P2002' || err.message?.includes('P2002')) {
      process.exit(202); // Special exit code for unique constraint collision
    }
    process.exit(1);
  }
}

main().catch(err => {
  console.error(err);
  process.exit(2);
});
