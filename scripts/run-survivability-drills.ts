import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

const TELEMETRY_DIR = path.join(process.cwd(), '.planning', 'telemetry');
const DRILL_PATH = path.join(process.cwd(), 'packages', 'ztan-witness', 'src', 'survivability-tests.ts');

async function runDrills() {
  console.log("=========================================================================");
  console.log("🚀 INITIATING ZTAN DISTRIBUTED SURVIVABILITY & WAL CHAOS EXECUTION");
  console.log("=========================================================================");

  if (!fs.existsSync(TELEMETRY_DIR)) {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  }

  const start = Date.now();
  let success = true;
  let errorMsg = '';

  try {
    execSync(`npx tsx "${DRILL_PATH}"`, { stdio: 'inherit' });
  } catch (err: any) {
    success = false;
    errorMsg = err.message || String(err);
  }

  const durationMs = Date.now() - start;
  const timestamp = new Date().toISOString();
  const summaryReport = {
    timestamp,
    durationMs,
    success,
    drill: 'survivability-tests.ts',
    error: errorMsg || null
  };

  const filename = `survivability-results-${Date.now()}.json`;
  const reportPath = path.join(TELEMETRY_DIR, filename);
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2), 'utf8');

  console.log("\n=========================================================================");
  console.log(`📊 SURVIVABILITY DRILL RESULTS SAVED: ${reportPath}`);
  console.log(`   Status   : ${success ? '✅ SUCCESS' : '❌ FAILURE'}`);
  console.log(`   Duration : ${durationMs}ms`);
  console.log("=========================================================================");

  if (!success) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runDrills().catch((err) => {
  console.error("Fatal error executing survivability drills:", err);
  process.exit(1);
});
