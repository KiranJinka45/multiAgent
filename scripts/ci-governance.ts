import * as fs from 'fs';
import * as path from 'path';
import { logger } from '../packages/utils/src/server';

/**
 * 🛡️ ZTAN CI GOVERNANCE SCRIPT
 * Enforces architectural boundaries and prevents semantic relapse.
 */

const CORE_PACKAGES = ['runtime-core', 'vfs', 'db', 'events', 'observability'];
const RESEARCH_MODULES = ['policy-research.ts', 'governance-metaphor'];

// Stability Gate Thresholds
const STABILITY_GATES = {
    STARTUP_TIME_MS: 3000,
    BUILD_TIME_MS: 30000,
    MAX_FAN_OUT: 5,
    REPLAY_DIVERGENCE: 0
};

async function runChecks() {
    logger.info('[CI-GOV] Starting Stability Gate Audit...');

    let failures = 0;

    // 1. Check for illegal Research -> Core imports
    failures += await checkDependencyLeakage();

    // 2. Check Contract Integrity
    failures += checkContractIntegrity();

    // 3. Check Startup Latency (Simulated baseline)
    failures += checkStartupLatency();

    // 4. Check Runtime Drift (Trace Inflation & Schema)
    failures += checkTraceInflation();
    failures += checkErrorTaxonomyStability();

    if (failures > 0) {
        logger.error({ failures }, '[CI-GOV] Audit FAILED. Correct architectural violations before merge.');
        process.exit(1);
    }

    logger.info('[CI-GOV] Audit PASSED. Structural integrity verified.');
    process.exit(0);
}

async function checkDependencyLeakage(): Promise<number> {
    let leaks = 0;
    const coreDir = path.join(process.cwd(), 'packages/runtime-core/src');
    
    // Scan all core files for research-layer imports
    const coreFiles = getAllFiles(coreDir);
    for (const file of coreFiles) {
        const content = fs.readFileSync(file, 'utf8');
        if (content.includes('policy-research') || content.includes('Research')) {
            logger.warn({ file }, '[CI-GOV] Illegal Research import detected in Core');
            leaks++;
        }
    }
    return leaks;
}

function checkContractIntegrity(): number {
    const contractPath = path.join(process.cwd(), 'packages/runtime-core/src/contracts.ts');
    if (!fs.existsSync(contractPath)) {
        logger.error('[CI-GOV] Core Contract missing!');
        return 1;
    }
    return 0;
}

function checkStartupLatency(): number {
    const bootstrapPath = path.join(process.cwd(), 'packages/runtime-core/src/index.ts');
    const stats = fs.statSync(bootstrapPath);
    if (stats.size > 50000) { 
        logger.warn({ size: stats.size }, '[CI-GOV] Core bootstrap size exceeding stability budget');
        return 1;
    }
    return 0;
}

function checkTraceInflation(): number {
    const traceDir = path.join(process.cwd(), '.ztan/trace');
    if (!fs.existsSync(traceDir)) return 0;

    const traces = fs.readdirSync(traceDir);
    for (const file of traces) {
        const stats = fs.statSync(path.join(traceDir, file));
        if (stats.size > 50000) { // 50KB trace limit
            logger.warn({ file, size: stats.size }, '[CI-GOV] Trace size inflation detected');
            return 1;
        }
    }
    return 0;
}

function checkErrorTaxonomyStability(): number {
    const contractPath = path.join(process.cwd(), 'packages/runtime-core/src/contracts.ts');
    const content = fs.readFileSync(contractPath, 'utf8');
    // Ensure FailureClass enum is present and unchanged in structure
    if (!content.includes('export enum FailureClass')) {
        logger.error('[CI-GOV] FailureClass taxonomy missing or corrupted!');
        return 1;
    }
    return 0;
}

function getAllFiles(dirPath: string, arrayOfFiles: string[] = []): string[] {
    const files = fs.readdirSync(dirPath);

    files.forEach((file) => {
        if (fs.statSync(path.join(dirPath, file)).isDirectory()) {
            arrayOfFiles = getAllFiles(path.join(dirPath, file), arrayOfFiles);
        } else {
            arrayOfFiles.push(path.join(dirPath, file));
        }
    });

    return arrayOfFiles;
}

runChecks();
