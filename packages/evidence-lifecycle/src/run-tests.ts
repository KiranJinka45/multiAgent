import { archiveAgedEvidence, compactReplayProofs } from './index.js';

function assert(condition: any, message: string) {
    if (!condition) {
        console.error(`❌ FAILED: ${message}`);
        throw new Error(message);
    } else {
        console.log(`✅ PASSED: ${message}`);
    }
}

async function runTests() {
    console.log('\n==================================================');
    console.log('🚀 TESTING EVIDENCE LIFECYCLE ENGINE');
    console.log('==================================================\n');

    try {
        console.log('👉 Running Test 1: Archiving old evidence (30 days threshold)...');
        const report = archiveAgedEvidence(30);
        assert(report.archivedCount > 0, 'Archived count must be positive');
        assert(report.bytesSaved === report.archivedCount * 256, 'Bytes saved calculation must match records count');
        assert(report.storageSavingsPct > 0, 'Storage savings pct must be positive');
        assert(report.archiveDest.includes('cold-storage'), 'Destination must indicate cold storage');

        console.log('\n👉 Running Test 2: Compacting a batch of replay proofs...');
        const dummyProofs = [
            { id: '1', hash: '0x111', payload: 'A' },
            { id: '2', hash: '0x222', payload: 'B' },
            { id: '3', hash: '0x333', payload: 'C' },
            { id: '4', hash: '0x444', payload: 'D' }
        ];
        const compactResult = compactReplayProofs(dummyProofs);
        assert(compactResult.originalHash === '0x111', 'Original hash should match first entry');
        assert(compactResult.compactedHash.startsWith('0xcompact_'), 'Compacted hash should be prefixed');
        assert(compactResult.proofCount === 4, 'Proof count should match batch size');
        assert(compactResult.compressionRatio === 75.0, 'Compression ratio should be (1 - 1/4) * 100 = 75%');
        assert(compactResult.reconstructible === true, 'Merkle rolls must remain reconstructible');

        console.log('\n==================================================');
        console.log('🎉 EVIDENCE LIFECYCLE ENGINE PASSED ALL TESTS!');
        console.log('==================================================\n');
        process.exit(0);
    } catch (error) {
        console.error('\n❌ TEST RUN FAILED:\n', error);
        process.exit(1);
    }
}

runTests();
