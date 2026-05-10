import * as fs from 'fs';
import * as path from 'path';
import { MissionTraceRecorder } from '../packages/runtime-core/src/index';
import { IMissionEvent } from '../packages/runtime-core/src/contracts';

const recorder = MissionTraceRecorder.getInstance();
const missionId = 'VALID_TRACE_' + Date.now();

async function run() {
    const event: IMissionEvent = {
        id: 'evt_valid',
        missionId,
        type: 'VALID_EVENT',
        timestamp: new Date().toISOString(),
        payload: { status: 'OK' },
        metadata: { stepIndex: 0, agentId: 'test_agent', reproducible: true }
    };

    console.log('[GEN] Recording valid event...');
    await recorder.recordEvent(event);
    console.log('[GEN] Valid trace generated:', missionId);
}

run().catch(console.error);
