const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const TRACE_DIR = path.join(process.cwd(), '.ztan/trace');
const missionId = 'TEST_JS_' + Date.now();
const tracePath = path.join(TRACE_DIR, `${missionId}.trace.json`);

function calculateChecksum(data) {
    return crypto.createHash('sha256').update(data).digest('hex');
}

async function test() {
    console.log('[TEST] JS Integrity Verification...');

    if (!fs.existsSync(TRACE_DIR)) fs.mkdirSync(TRACE_DIR, { recursive: true });

    const events = [{
        id: 'evt_1',
        missionId,
        type: 'TEST_START',
        payload: { msg: 'JS Test' }
    }];

    const wrapper = {
        metadata: {
            environmentHash: 'test-hash',
            checksum: calculateChecksum(JSON.stringify(events)),
            timestamp: new Date().toISOString()
        },
        trace: events
    };

    // 1. Write wrapped format
    fs.writeFileSync(tracePath, JSON.stringify(wrapper, null, 2));
    console.log('  ✓ Wrote wrapped trace');

    // 2. Read back
    const raw = fs.readFileSync(tracePath, 'utf8');
    const data = JSON.parse(raw);
    if (data.metadata.checksum !== calculateChecksum(JSON.stringify(data.trace))) {
        throw new Error('Checksum validation failed');
    }
    console.log('  ✓ Checksum valid');

    // 3. Test corruption
    data.trace[0].payload.msg = 'TAMPERED';
    if (data.metadata.checksum === calculateChecksum(JSON.stringify(data.trace))) {
        throw new Error('Checksum should have failed');
    }
    console.log('  ✓ Corruption detection logic verified');

    console.log('[TEST] JS TEST PASSED ✓');
}

test().catch(console.error);
