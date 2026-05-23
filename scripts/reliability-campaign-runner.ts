/**
 * ZTAN — Reliability Campaign Runner
 * 
 * Orchestrates continuous background reliability campaigns:
 * - Rolling nightly (6h)
 * - Weekly (24h)
 * - Monthly (72h)
 * - Test-scale (15s) for pipeline checks
 * 
 * Spawns the continuous soak orchestrator, runs statistical analyzers,
 * and maintains the central campaign registry index.
 */

import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const HISTORY_DIR = path.join(rootDir, 'telemetry-history');
const CAMPAIGN_REGISTRY = path.join(HISTORY_DIR, 'campaign_registry.json');

// Ensure history directory exists
if (!fs.existsSync(HISTORY_DIR)) {
  fs.mkdirSync(HISTORY_DIR, { recursive: true });
}

interface CampaignEntry {
  campaignType: string;
  timestamp: number;
  duration: number;
  seed: string;
  status: 'PASSED' | 'FAILED';
  snapshotPath: string;
  isCanonical?: boolean;
  verdict: {
    failures: number;
    entropyPassed: boolean;
    regressionPassed: boolean;
  };
}

interface RegistrySchema {
  campaigns: CampaignEntry[];
}

function loadCampaignRegistry(): RegistrySchema {
  if (!fs.existsSync(CAMPAIGN_REGISTRY)) {
    return { campaigns: [] };
  }
  try {
    const raw = fs.readFileSync(CAMPAIGN_REGISTRY, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    console.warn(`⚠️ Failed to parse campaign registry: ${e.message}. Initializing empty registry.`);
    return { campaigns: [] };
  }
}

function saveCampaignRegistry(registry: RegistrySchema) {
  fs.writeFileSync(CAMPAIGN_REGISTRY, JSON.stringify(registry, null, 2), 'utf8');
}

function runCommand(command: string, args: string[]): Promise<{ code: number; stdout: string; stderr: string }> {
  return new Promise((resolve) => {
    console.log(`Running: ${command} ${args.join(' ')}`);
    const proc = spawn(command, args, { cwd: rootDir, shell: true });
    let stdout = '';
    let stderr = '';

    proc.stdout?.on('data', (data) => {
      const chunk = data.toString();
      stdout += chunk;
      process.stdout.write(chunk);
    });

    proc.stderr?.on('data', (data) => {
      const chunk = data.toString();
      stderr += chunk;
      process.stderr.write(chunk);
    });

    proc.on('close', (code) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}

async function main() {
  const args = process.argv.slice(2);
  const campaignIdx = args.indexOf('--campaign');
  const campaignType = campaignIdx !== -1 ? args[campaignIdx + 1] : 'test';

  const canonicalIdx = args.indexOf('--canonical');
  const isCanonical = canonicalIdx !== -1;

  const seedIdx = args.indexOf('--seed');
  let seed = seedIdx !== -1 ? args[seedIdx + 1] : '';
  if (!seed) {
    if (isCanonical) {
      switch (campaignType) {
        case 'hourly':
          seed = 'ZTAN_CANONICAL_SEED_1H';
          break;
        case 'nightly':
          seed = 'ZTAN_CANONICAL_SEED_6H';
          break;
        case 'weekly':
          seed = 'ZTAN_CANONICAL_SEED_24H';
          break;
        case 'monthly':
          seed = 'ZTAN_CANONICAL_SEED_72H';
          break;
        case 'test':
        default:
          seed = 'ZTAN_CANONICAL_SEED_TEST';
          break;
      }
    } else {
      seed = `ZTAN_SOAK_SEED_${Date.now()}`;
    }
  }

  // Configure durations based on campaign type
  let duration = 15;
  let waveDuration = 5;

  switch (campaignType) {
    case 'hourly':
      duration = 3600; // 1h
      waveDuration = 300; // 5m
      break;
    case 'nightly':
      duration = 21600; // 6h
      waveDuration = 1800; // 30m
      break;
    case 'weekly':
      duration = 86400; // 24h
      waveDuration = 7200; // 2h
      break;
    case 'monthly':
      duration = 259200; // 72h
      waveDuration = 21600; // 6h
      break;
    case 'test':
    default:
      duration = 15; // 15s
      waveDuration = 5;
      break;
  }

  const durationIdx = args.indexOf('--duration');
  if (durationIdx !== -1 && args[durationIdx + 1]) {
    duration = parseInt(args[durationIdx + 1], 10);
  }

  const waveDurationIdx = args.indexOf('--wave-duration');
  if (waveDurationIdx !== -1 && args[waveDurationIdx + 1]) {
    waveDuration = parseInt(args[waveDurationIdx + 1], 10);
  }

  console.log('================================================================');
  console.log(`🚀 STARTING RELIABILITY CAMPAIGN: ${campaignType.toUpperCase()}`);
  console.log(`   Duration: ${duration}s, Wave Duration: ${waveDuration}s`);
  console.log(`   Seed:     ${seed}`);
  console.log(`   Canonical: ${isCanonical}`);
  console.log('================================================================');

  // Step 1: Run the soak orchestrator
  const orchestratorArgs = [
    'tsx',
    path.join('scripts', 'continuous-soak-orchestrator.ts'),
    '--duration',
    duration.toString(),
    '--wave-duration',
    waveDuration.toString(),
    '--seed',
    seed
  ];
  if (isCanonical) {
    orchestratorArgs.push('--canonical');
  }

  const orchestratorResult = await runCommand('npx', orchestratorArgs);
  const orchestratorPassed = orchestratorResult.code === 0;

  // Let's locate the generated snapshot file
  const latestSnapshotPath = path.join(HISTORY_DIR, 'soak_snapshot_latest.json');
  let finalSnapshotPath = '';
  
  if (fs.existsSync(latestSnapshotPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(latestSnapshotPath, 'utf8'));
      const timestamp = data.metadata?.timestamp || Date.now();
      finalSnapshotPath = path.relative(rootDir, path.join(HISTORY_DIR, `soak_snapshot_${timestamp}.json`)).replace(/\\/g, '/');
    } catch {
      finalSnapshotPath = 'telemetry-history/soak_snapshot_latest.json';
    }
  } else {
    console.error('❌ Error: Orchestrator did not output latest snapshot.');
    process.exit(1);
  }

  // Step 2: Run trend analyzer
  console.log('\n📊 Running Trend Analysis...');
  const trendResult = await runCommand('npx', [
    'tsx',
    path.join('scripts', 'entropy-trend-analyzer.ts'),
    '--latest',
    latestSnapshotPath
  ]);
  const trendPassed = trendResult.code === 0;

  // Step 3: Run regression analyzer
  console.log('\n📊 Running Regression Analysis...');
  const regressionResult = await runCommand('npx', [
    'tsx',
    path.join('scripts', 'telemetry-regression-analyzer.ts'),
    '--current',
    latestSnapshotPath
  ]);
  const regressionPassed = regressionResult.code === 0;

  const campaignPassed = orchestratorPassed && trendPassed && regressionPassed;

  // Step 4: Update Registry
  const registry = loadCampaignRegistry();
  const entry: CampaignEntry = {
    campaignType,
    timestamp: Date.now(),
    duration,
    seed,
    status: campaignPassed ? 'PASSED' : 'FAILED',
    snapshotPath: finalSnapshotPath,
    isCanonical,
    verdict: {
      failures: orchestratorPassed ? 0 : 1, // simplified representation of failure presence
      entropyPassed: trendPassed,
      regressionPassed: regressionPassed
    }
  };

  registry.campaigns.push(entry);
  saveCampaignRegistry(registry);

  console.log('\n================================================================');
  console.log(`🏁 CAMPAIGN FINISHED: ${campaignPassed ? 'PASSED ✅' : 'FAILED ❌'}`);
  console.log(`   Registry entry written to telemetry-history/campaign_registry.json`);
  console.log('================================================================');

  if (campaignPassed) {
    process.exit(0);
  } else {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(`❌ Campaign runner crashed: ${err.message}`);
  process.exit(1);
});
