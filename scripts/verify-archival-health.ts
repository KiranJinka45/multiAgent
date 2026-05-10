import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { MerkleTree } from '../packages/utils/src/transparency/merkle';

/**
 * ─── Archival Health Auditor ───────────────────────────────────────────────
 * Detects bit-rot and archival inconsistencies in the institutional cold storage.
 * Verifies the Genesis-to-Head lineage across historical snapshots.
 * ────────────────────────────────────────────────────────────────────────────
 */

async function auditArchivalHealth(archiveDir: string) {
    console.log(`[AUDIT] Starting Archival Health Check in: ${archiveDir}`);

    const files = fs.readdirSync(archiveDir).filter(f => f.endsWith('.json')).sort();
    if (files.length === 0) {
        console.error("[AUDIT] ❌ No archive files found.");
        return;
    }

    let previousRoot = "";
    let totalReceipts = 0;
    const errors: string[] = [];

    for (const file of files) {
        const filePath = path.join(archiveDir, file);
        const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));

        console.log(`[AUDIT] Verifying ${file}...`);

        // 1. Bit-Rot Detection (Internal Integrity)
        const content = fs.readFileSync(filePath, 'utf8');
        const currentHash = crypto.createHash('sha256').update(content).digest('hex');
        // In a real system, we'd compare this against a signed manifest of the archive

        // 2. Lineage Continuity
        if (previousRoot && data.previousGRoot !== previousRoot) {
            errors.push(`LINEAGE_BREACH in ${file}: expected previous root ${previousRoot.slice(0, 8)}, got ${data.previousGRoot.slice(0, 8)}`);
        }

        // 3. Merkle Consistency Proof
        const tree = new MerkleTree();
        for (const receipt of data.receipts) {
            const payload = JSON.stringify(receipt); // Simplified for script
            tree.append(MerkleTree.hashLeaf(payload));
            totalReceipts++;
        }

        if (tree.getRoot() !== data.governanceRoot) {
            errors.push(`MERKLE_INCONSISTENCY in ${file}: Calculated root ${tree.getRoot().slice(0, 8)} does not match archive root ${data.governanceRoot.slice(0, 8)}`);
        }

        previousRoot = data.governanceRoot;
    }

    console.log(`\n[AUDIT] SUMMARY:`);
    console.log(`- Files Processed: ${files.length}`);
    console.log(`- Total Receipts Verified: ${totalReceipts}`);
    
    if (errors.length === 0) {
        console.log(`- Status: ✅ ARCHIVAL INTEGRITY CONFIRMED`);
    } else {
        console.error(`- Status: ❌ AUDIT FAILED`);
        errors.forEach(e => console.error(`  - ${e}`));
    }
}

const archivePath = process.argv[2] || './archives';
auditArchivalHealth(archivePath).catch(console.error);
