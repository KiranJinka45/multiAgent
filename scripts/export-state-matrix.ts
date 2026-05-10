import fs from 'fs';
import path from 'path';
import { LOCAL_FEDERATION } from '../packages/utils/src/transparency/witness-federation';

/**
 * ─── State Matrix Generator ────────────────────────────────────────────────
 * Exports the authoritative institutional state transition matrix from the 
 * runtime logic into a formal JSON artifact for model checking and audit.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function generateMatrix() {
    console.log("[MATRIX] Exporting Authoritative Legal Runtime...");
    
    const matrix = LOCAL_FEDERATION.exportStateTransitionMatrix();
    const targetPath = path.join(__dirname, 'formal', 'STATE_MATRIX.json');
    
    if (!fs.existsSync(path.join(__dirname, 'formal'))) {
        fs.mkdirSync(path.join(__dirname, 'formal'));
    }
    
    fs.writeFileSync(targetPath, JSON.stringify(matrix, null, 4));
    console.log(`[MATRIX] ✅ Authority exported to: ${targetPath}`);
}

generateMatrix().catch(console.error);
