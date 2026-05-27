/**
 * ZTAN — Baseline Registry Manager
 * 
 * Manages versioned reference baselines for telemetry-based regression analysis.
 * Supports registering new snapshot baselines, listing all versioned baselines,
 * and maintaining the central registry index file.
 * 
 * Hardened against Path Traversal vulnerabilities.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '..');

const BASELINES_DIR = path.join(rootDir, 'telemetry-history', 'baselines');
const REGISTRY_FILE = path.join(BASELINES_DIR, 'registry.json');

// Ensure baselines directory exists
if (!fs.existsSync(BASELINES_DIR)) {
  fs.mkdirSync(BASELINES_DIR, { recursive: true });
}

interface BaselineEntry {
  version: string;
  type: 'GOLDEN_CANONICAL' | 'CHAOS_REFERENCE' | 'STRESS_REFERENCE' | 'SOAK_REFERENCE' | 'EXPERIMENTAL_REFERENCE';
  path: string;
  timestamp: number;
  metadata: {
    durationSeconds: number;
    seed: string;
    totalLogicalBytesWritten: number;
    physicalWalByteDelta: string;
    failures: number;
  };
}

interface RegistrySchema {
  versions: BaselineEntry[];
}

function loadRegistry(): RegistrySchema {
  if (!fs.existsSync(REGISTRY_FILE)) {
    return { versions: [] };
  }
  try {
    const raw = fs.readFileSync(REGISTRY_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (e: any) {
    console.warn(`⚠️ Failed to parse baseline registry index: ${e.message}. Initializing empty registry.`);
    return { versions: [] };
  }
}

function saveRegistry(registry: RegistrySchema) {
  fs.writeFileSync(REGISTRY_FILE, JSON.stringify(registry, null, 2), 'utf8');
}

function validatePath(p: string): string {
  const resolved = path.resolve(p);
  const resolvedRoot = path.resolve(rootDir);
  if (!resolved.startsWith(resolvedRoot)) {
    throw new Error(`Security violation: path access outside root directory disallowed: ${resolved}`);
  }
  return resolved;
}

function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  if (!command) {
    console.log('ZTAN Baseline Registry Manager');
    console.log('Usage:');
    console.log('  npx tsx scripts/baseline-registry-manager.ts register <snapshot-path> <version> [type]');
    console.log('  npx tsx scripts/baseline-registry-manager.ts list');
    process.exit(1);
  }

  if (command === 'register') {
    const snapshotPathRaw = args[1];
    const version = args[2];
    const rawType = args[3] || 'GOLDEN_CANONICAL';

    if (!snapshotPathRaw || !version) {
      console.error('❌ Error: Missing arguments. Usage: register <snapshot-path> <version> [type]');
      process.exit(1);
    }

    // Validate type parameter
    const validTypes = ['GOLDEN_CANONICAL', 'CHAOS_REFERENCE', 'STRESS_REFERENCE', 'SOAK_REFERENCE', 'EXPERIMENTAL_REFERENCE'];
    if (!validTypes.includes(rawType)) {
      console.error(`❌ Error: Invalid baseline type "${rawType}". Must be one of: ${validTypes.join(', ')}`);
      process.exit(1);
    }
    const type = rawType as 'GOLDEN_CANONICAL' | 'CHAOS_REFERENCE' | 'STRESS_REFERENCE' | 'SOAK_REFERENCE' | 'EXPERIMENTAL_REFERENCE';

    // Harden version argument against path traversal
    if (!/^[a-zA-Z0-9.-]+$/.test(version)) {
      console.error('❌ Error: Invalid version format. Only alphanumeric characters, dots, and hyphens are allowed.');
      process.exit(1);
    }

    const snapshotPath = validatePath(snapshotPathRaw);
    if (!fs.existsSync(snapshotPath)) {
      console.error(`❌ Error: Snapshot file not found at: ${snapshotPath}`);
      process.exit(1);
    }

    let snapshotData: any;
    try {
      snapshotData = JSON.parse(fs.readFileSync(snapshotPath, 'utf8'));
    } catch (e: any) {
      console.error(`❌ Error: Failed to parse snapshot JSON: ${e.message}`);
      process.exit(1);
    }

    // Programmatic Validation for GOLDEN_CANONICAL baseline hygiene
    if (type === 'GOLDEN_CANONICAL') {
      const failures = snapshotData.metadata?.failures ?? 0;
      const isContaminated = snapshotData.metadata?.isStateContaminated === true;
      const auditPassed = snapshotData.metadata?.replayIntegrityAudit?.overallPassed ?? true;

      if (failures > 0 || isContaminated || !auditPassed) {
        console.error('\n❌ SRE BASELINE HYGIENE VIOLATION REFUSED:');
        console.error('   Cannot register a contaminated or degraded snapshot as a GOLDEN_CANONICAL baseline.');
        console.error(`   - Failures recorded: ${failures}`);
        console.error(`   - Ephemeral state contaminated: ${isContaminated}`);
        console.error(`   - Cryptographic chain audit passed: ${auditPassed}`);
        console.error('   Please register this snapshot as CHAOS_REFERENCE or EXPERIMENTAL_REFERENCE instead.');
        process.exit(1);
      }
    }

    const destFileName = `baseline-${version}.json`;
    const destPath = validatePath(path.join(BASELINES_DIR, destFileName));

    // Copy snapshot file
    fs.writeFileSync(destPath, JSON.stringify(snapshotData, null, 2), 'utf8');
    console.log(`✔ Copied snapshot to: ${destPath}`);

    // Update index registry
    const registry = loadRegistry();
    // Remove existing version entry if any
    registry.versions = registry.versions.filter(v => v.version !== version);

    const relativeDestPath = path.relative(rootDir, destPath).replace(/\\/g, '/');

    const entry: BaselineEntry = {
      version,
      type,
      path: relativeDestPath,
      timestamp: Date.now(),
      metadata: {
        durationSeconds: snapshotData.metadata?.durationSeconds || 0,
        seed: snapshotData.metadata?.seed || '',
        totalLogicalBytesWritten: snapshotData.metadata?.totalLogicalBytesWritten || 0,
        physicalWalByteDelta: snapshotData.metadata?.physicalWalByteDelta || '0',
        failures: snapshotData.metadata?.failures || 0
      }
    };

    registry.versions.push(entry);
    saveRegistry(registry);
    console.log(`✔ Registered baseline version "${version}" [Type: ${type}] in registry.json`);
    process.exit(0);
  } else if (command === 'list') {
    const registry = loadRegistry();
    console.log('================================================================');
    console.log('📦  ZTAN REGISTERED TELEMETRY BASELINES');
    console.log('================================================================');
    if (registry.versions.length === 0) {
      console.log('No baselines registered.');
    } else {
      registry.versions.forEach(v => {
        console.log(`• Version: ${v.version} [Type: ${v.type || 'GOLDEN_CANONICAL'}]`);
        console.log(`  Path:      ${v.path}`);
        console.log(`  Registered:${new Date(v.timestamp).toISOString()}`);
        console.log(`  Duration:  ${v.metadata.durationSeconds}s`);
        console.log(`  Seed:      ${v.metadata.seed}`);
        console.log(`  Failures:  ${v.metadata.failures}`);
        console.log('----------------------------------------------------------------');
      });
    }
    process.exit(0);
  } else {
    console.error(`❌ Unknown command: ${command}`);
    process.exit(1);
  }
}

main();
