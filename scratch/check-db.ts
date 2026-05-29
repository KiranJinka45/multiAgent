import * as dotenv from 'dotenv';
import * as dotenvExpand from 'dotenv-expand';
import * as path from 'path';
import * as fs from 'fs';

// Load environment variables from workspace root
const rootEnv = path.resolve(process.cwd(), '.env');
if (fs.existsSync(rootEnv)) {
    const envConfig = dotenv.config({ path: rootEnv });
    dotenvExpand.expand(envConfig);
}

const { db } = await import('../packages/db/src/index.js');

async function checkDb() {
  try {
    const walCount = await db.ztanWalLog.count();
    console.log(`ZtanWalLog Count: ${walCount}`);
    
    const ledgerCount = await db.ztanLedgerBlock.count();
    console.log(`ZtanLedgerBlock Count: ${ledgerCount}`);
    
    // Check active locks/queries
    const activeQueries = await db.$queryRawUnsafe(`
      SELECT pid, state, query, age(clock_timestamp(), query_start) 
      FROM pg_stat_activity 
      WHERE state != 'idle' AND query NOT LIKE '%pg_stat_activity%';
    `);
    console.log("Active Queries:", activeQueries);
  } catch (err) {
    console.error("Error checking DB:", err);
  } finally {
    await db.$disconnect();
  }
}

checkDb();
