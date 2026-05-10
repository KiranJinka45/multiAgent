import { LOCAL_FEDERATION } from '../packages/utils/src/transparency/witness-federation';
import { InstitutionalState } from '../packages/utils/src/transparency/governance';

async function seedHistory() {
    console.log("[SEED] Seeding institutional history for Phase Ω verification...");
    
    // 1. Propose something
    const proposal = {
        id: 'prop_' + Date.now(),
        proposerId: 'witness_1',
        action: 'STATE_CHECKPOINT',
        payload: { message: 'Phase Ω Baseline' },
        timestamp: new Date().toISOString(),
        signatures: []
    };

    // We manually push to the log to simulate history for the corpus
    // since we don't want to run the full consensus loop here.
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

    console.log("[SEED] ✅ History seeded.");
}

seedHistory().catch(console.error);
