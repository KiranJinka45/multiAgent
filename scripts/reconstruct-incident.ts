import dotenv from 'dotenv';
dotenv.config();

import { IncidentReplayer } from '../packages/runtime-core/src/archaeology/incident-replay.js';
import path from 'path';
import fs from 'fs';

/**
 * ─── ZTAN Failure Archaeology Timeline Reconstructor CLI ───────────────────
 * Loads a specified incident forensic json bundle and prints a structured,
 * chronological audit log showing safety triggers, environment drifts, and
 * ledger chain parity issues.
 * ────────────────────────────────────────────────────────────────────────────
 */

function printUsage() {
    console.log('Usage: npx tsx scripts/reconstruct-incident.ts <path-to-incident-json>');
    console.log('Example: npx tsx scripts/reconstruct-incident.ts .ztan/archaeology/incident-incident-6e8fd774.json');
}

async function main() {
    const args = process.argv.slice(2);
    if (args.length === 0 || args[0] === '--help' || args[0] === '-h') {
        printUsage();
        process.exit(1);
    }

    const filePath = path.resolve(args[0]);
    if (!fs.existsSync(filePath)) {
        console.error(`❌ Error: Incident bundle file does not exist: ${filePath}`);
        process.exit(1);
    }

    try {
        const bundle = IncidentReplayer.loadBundle(filePath);
        IncidentReplayer.printTrace(bundle);
    } catch (e: any) {
        console.error(`❌ Failed to reconstruct incident: ${e.message}`);
        process.exit(1);
    }
}

main().catch(err => {
    console.error('Fatal CLI error:', err);
    process.exit(1);
});
