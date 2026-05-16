import { execSync } from 'child_process';
import { appendFileSync, existsSync, writeFileSync } from 'fs';
import path from 'path';

/**
 * ZTAN OPERATIONAL CONTINUITY DRILL
 * This script automates the recurring validation of the One-Command Recovery (OCR) pipeline.
 * It is designed to detect "recovery drift" over long-duration operation.
 */

const LOG_FILE = path.join(process.cwd(), 'RECOVERY_LOG.md');

function log(message: string) {
    const timestamp = new Date().toISOString();
    const formatted = `[${timestamp}] ${message}\n`;
    process.stdout.write(formatted);
}

function updateLog(status: 'SUCCESS' | 'FAILED', details: string) {
    const timestamp = new Date().toISOString();
    const entry = `| ${timestamp} | ${status} | ${details} |\n`;
    
    if (!existsSync(LOG_FILE)) {
        const header = "# ZTAN Recovery Log\n\n| Timestamp | Status | Details |\n| :--- | :--- | :--- |\n";
        writeFileSync(LOG_FILE, header);
    }
    
    appendFileSync(LOG_FILE, entry);
}

async function runDrill() {
    log('🚀 Starting ZTAN Operational Continuity Drill...');
    
    try {
        log('📦 Executing One-Command Recovery...');
        execSync('npx tsx scripts/one-command-recovery.ts', { stdio: 'inherit' });
        
        log('✅ Recovery Drill Passed.');
        updateLog('SUCCESS', 'OCR drill completed end-to-end.');
    } catch (error: any) {
        log('❌ Recovery Drill Failed.');
        updateLog('FAILED', `Drill failed during execution. Check terminal logs.`);
        process.exit(1);
    }
}

runDrill();
