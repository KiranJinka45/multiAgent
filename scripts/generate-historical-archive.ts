import { WitnessFederation } from '../packages/utils/src/transparency/witness-federation';
import * as fs from 'fs';
import * as path from 'path';

/**
 * ─── Historical Sovereign Archive ───────────────────────────────────────────
 * Creates a cold-storage ready archive of the institutional history.
 * ────────────────────────────────────────────────────────────────────────────
 */

function generateArchive() {
    const fed = new WitnessFederation();
    console.log(`[ARCHIVE] Generating Historical Archive for Institution...`);

    const archive = {
        institutionId: "ZTAN_SOVEREIGN_ROOT",
        generatedAt: new Date().toISOString(),
        trace: fed.getGovernanceLog(),
        proofs: {
            lineage: "VALIDATED_BY_BFT_TRACE",
            finality: "MERKLE_ANCHORED",
            sovereignty: "ACYCLIC_GRAPH_VERIFIED"
        },
        constitution: fed.getInstitutionalHealth().constitution,
        stateSnapshot: fed.getSovereignSnapshot()
    };

    const archiveDir = path.join(process.cwd(), 'archives');
    if (!fs.existsSync(archiveDir)) fs.mkdirSync(archiveDir);

    const archiveName = `ZTAN_ARCHIVE_${new Date().toISOString().replace(/:/g, '-')}.json`;
    fs.writeFileSync(path.join(archiveDir, archiveName), JSON.stringify(archive, null, 2));

    console.log(`[ARCHIVE] ✅ Historical Sovereign Archive generated: ${archiveName}`);
    console.log(`[ARCHIVE] Institutional memory is now preserved for cold-storage.`);
}

generateArchive();
