import fs from 'fs';
import path from 'path';
import { LOCAL_FEDERATION } from '../packages/utils/src/transparency/witness-federation';

/**
 * ─── Replay Corpus Exporter ────────────────────────────────────────────────
 * Exports the institutional state and history as deterministic fixtures
 * for cross-implementation verification (TS vs Rust).
 * ────────────────────────────────────────────────────────────────────────────
 */

async function exportCorpus() {
    console.log("[CORPUS] Exporting Institutional Replay Fixtures...");
    
    // Seed history if empty
    if (LOCAL_FEDERATION.getGovernanceLog().length === 0) {
        console.log("[CORPUS] Seeding baseline history...");
        (LOCAL_FEDERATION as any).governanceLog.push({
            receipt: {
                sequenceNumber: 1,
                epochId: 0,
                action: 'STATE_CHECKPOINT',
                previousGRoot: '0000000000000000000000000000000000000000000000000000000000000000',
                gRoot: 'f0e1d2c3b4a5968778695a4b3c2d1e0f0e1d2c3b4a5968778695a4b3c2d1e0f',
                signatures: []
            },
            appliedAt: new Date().toISOString()
        });
    }
    const history = LOCAL_FEDERATION.getGovernanceLog();
    
    const corpusDir = path.join(__dirname, '..', 'fixtures', 'replay-corpus');
    if (!fs.existsSync(corpusDir)) {
        fs.mkdirSync(corpusDir, { recursive: true });
    }

    // 1. Genesis Fixture
    const genesisFixture = {
        witnesses: LOCAL_FEDERATION.getMembers(),
        threshold: LOCAL_FEDERATION.getThreshold(),
        council: LOCAL_FEDERATION.getCouncilAt(new Date().toISOString()),
        auditors: LOCAL_FEDERATION.getAuditorAt(new Date().toISOString())
    };

    fs.writeFileSync(
        path.join(corpusDir, 'genesis_bootstrap.json'),
        JSON.stringify(genesisFixture, null, 4)
    );

    // 2. Full History Fixture
    fs.writeFileSync(
        path.join(corpusDir, 'full_history.json'),
        JSON.stringify({ history }, null, 4)
    );

    console.log(`[CORPUS] ✅ Fixtures exported to: ${corpusDir}`);
}

exportCorpus().catch(console.error);
