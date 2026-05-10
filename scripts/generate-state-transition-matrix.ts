import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ─── State Transition Matrix Generator ──────────────────────────────────────
 * Exports the institutional logic for formal model checking (TLA+/Alloy).
 * ────────────────────────────────────────────────────────────────────────────
 */

function main() {
    const fed = new WitnessFederation();
    const matrix = fed.exportStateTransitionMatrix();

    const outputDir = path.join(process.cwd(), 'formal');
    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir);

    const outputPath = path.join(outputDir, 'STATE_MATRIX.json');
    fs.writeFileSync(outputPath, JSON.stringify(matrix, null, 2));

    console.log(`[FORMAL] State Transition Matrix exported to ${outputPath}`);
    console.log(`[FORMAL] Institutional Invariants Anchored for Model Checking.`);
}

main();
