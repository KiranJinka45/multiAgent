import { execSync } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';
import dotenv from 'dotenv';
import dotenvExpand from 'dotenv-expand';

const envConfig = dotenv.config();
dotenvExpand.expand(envConfig);

const TELEMETRY_DIR = path.join(process.cwd(), '.planning', 'telemetry');
const TRANSPARENCY_DIR = path.join(process.cwd(), 'packages', 'utils', 'src', 'transparency');

const DRILLS = [
  'test-lease-fencing.ts',
  'test-failure-semantics.ts',
  'test-outbox-self-healing.ts',
  'test-outbox-resilience.ts',
  'test-ledger-compaction.ts',
  'test-multi-writer.ts',
  'test-byzantine-drift.ts',
  'test-hsm-ceremony.ts',
  'test-replicated-consensus.ts'
];

interface DrillResult {
  name: string;
  success: boolean;
  durationMs: number;
  error?: string;
}

async function runAllDrills() {
  console.log("=========================================================================");
  console.log("🚀 STARTING ZTAN PHASE E POSTGRES FAILOVER & LEASE CHAOS DRILLS");
  console.log("=========================================================================");

  if (!fs.existsSync(TELEMETRY_DIR)) {
    fs.mkdirSync(TELEMETRY_DIR, { recursive: true });
  }

  const results: DrillResult[] = [];
  let successCount = 0;
  let failureCount = 0;

  for (const drill of DRILLS) {
    const drillPath = path.join(TRANSPARENCY_DIR, drill);
    console.log(`\n[DRILL] Running ${drill}...`);
    const start = Date.now();

    try {
      execSync(`npx tsx "${drillPath}"`, {
        env: { ...process.env, ZTAN_PARTITIONS: '1' },
        stdio: 'inherit'
      });
      const durationMs = Date.now() - start;
      console.log(`✅ [SUCCESS] ${drill} passed in ${durationMs}ms`);
      results.push({ name: drill, success: true, durationMs });
      successCount++;
    } catch (err: any) {
      const durationMs = Date.now() - start;
      console.error(`❌ [FAILURE] ${drill} failed after ${durationMs}ms`);
      results.push({
        name: drill,
        success: false,
        durationMs,
        error: err.message || String(err)
      });
      failureCount++;
    }
  }

  const timestamp = new Date().toISOString();
  const summaryReport = {
    timestamp,
    successCount,
    failureCount,
    totalCount: DRILLS.length,
    results
  };

  const filename = `drill-results-${Date.now()}.json`;
  const reportPath = path.join(TELEMETRY_DIR, filename);
  fs.writeFileSync(reportPath, JSON.stringify(summaryReport, null, 2), 'utf8');

  console.log("\n=========================================================================");
  console.log(`📊 CHAOS DRILL EXECUTION COMPLETED at ${timestamp}`);
  console.log(`   Success: ${successCount} / ${DRILLS.length}`);
  console.log(`   Failure: ${failureCount} / ${DRILLS.length}`);
  console.log(`   Report saved to: ${reportPath}`);
  console.log("=========================================================================");

  if (failureCount > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAllDrills().catch((err) => {
  console.error("Fatal error executing Phase E drills:", err);
  process.exit(1);
});
