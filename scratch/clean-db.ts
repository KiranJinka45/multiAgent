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

async function cleanDb() {
  try {
    console.log("Truncating ZtanWalLog...");
    await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanWalLog" RESTART IDENTITY CASCADE;');
    console.log("Truncated ZtanWalLog successfully.");

    console.log("Truncating ZtanLedgerBlock...");
    await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanLedgerBlock" RESTART IDENTITY CASCADE;');
    console.log("Truncated ZtanLedgerBlock successfully.");
    
    console.log("Truncating ZtanActiveLease...");
    await db.$executeRawUnsafe('TRUNCATE TABLE "ZtanActiveLease" RESTART IDENTITY CASCADE;');
    console.log("Truncated ZtanActiveLease successfully.");
  } catch (err) {
    console.error("Error truncating DB:", err);
  } finally {
    await db.$disconnect();
  }
}

cleanDb();
