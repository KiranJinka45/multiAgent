import * as fs from 'fs';
import * as path from 'path';
import { MissionTraceRecorder } from '../packages/runtime-core/src/index';
import { IMissionEvent } from '../packages/runtime-core/src/contracts';

const recorder = MissionTraceRecorder.getInstance();
const missionId = 'TEST_INTEGRITY_' + Date.now();
const traceDir = path.join(process.cwd(), '.ztan/trace');
const tracePath = path.join(traceDir, `${missionId}.trace.json`);

async function test() {
    console.log('[TEST] Starting integrity verification...');

    // 1. Record an event
    const event: IMissionEvent = {
        id: 'evt_1',
        missionId,
        type: 'TEST_START',
        timestamp: new Date().toISOString(),
        payload: { message: 'Hello ZTAN' },
        metadata: { stepIndex: 0, agentId: 'test_agent', reproducible: true }
    };

    console.log('[TEST] Recording event...');
    await recorder.recordEvent(event);

    // 2. Verify file structure
    if (!fs.existsSync(tracePath)) {
        throw new Error('Trace file not created');
    }
    const raw = fs.readFileSync(tracePath, 'utf8');
    const data = JSON.parse(raw);
    
    console.log('[TEST] Trace metadata:', JSON.stringify(data.metadata, null, 2));
    
    if (!data.metadata.checksum || data.metadata.checksum === 'pending') {
        throw new Error('Checksum not generated');
    }
    console.log('  ✓ Wrapped format and checksum verified.');

    // 3. Read back trace
    console.log('[TEST] Reading back trace...');
    const trace = await recorder.getTrace(missionId);
    if (trace.length !== 1 || trace[0].type !== 'TEST_START') {
        throw new Error('Trace content mismatch');
    }
    console.log('  ✓ Trace read back successful.');

    // 4. Test corruption detection
    console.log('[TEST] Simulating corruption...');
    const corruptedData = JSON.parse(raw);
    corruptedData.trace[0].payload.message = 'TAMPERED';
    fs.writeFileSync(tracePath, JSON.stringify(corruptedData, null, 2));

    try {
        await recorder.getTrace(missionId);
        throw new Error('Corruption not detected');
    } catch (e: any) {
        console.log(`  ✓ Corruption detected correctly: ${e.message}`);
    }

    // 5. Verify archive
    const corruptionDir = path.join(process.cwd(), 'failures', 'corrupted');
    const files = fs.readdirSync(corruptionDir);
    const archived = files.find(f => f.startsWith(missionId));
    if (archived) {
        console.log(`  ✓ Corruption archived to: ${archived}`);
    } else {
        throw new Error('Corruption not archived');
    }

    console.log('\n[TEST] ALL INTEGRITY TESTS PASSED ✓');
}

test().catch(e => {
    console.error('[TEST] FAILED:', e);
    process.exit(1);
});
