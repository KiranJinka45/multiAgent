import fs from 'fs';
import path from 'path';
import { MissionTraceRecorder } from '@packages/runtime-core';
import { IncidentArchiveRegistry } from '@packages/utils';
import { logger } from '@packages/utils';

const TRACE_DIR = path.join(process.cwd(), '.ztan', 'trace');

/**
 * 🛡️ ZTAN Chaos Matrix (Tier 5 Validation)
 * Simulates hard operational failures to verify recovery and integrity.
 */
async function runChaosMatrix() {
    const missionId = `CHAOS_TEST_${Date.now()}`;
    logger.info({ missionId }, '[ChaosMatrix] Initiating Tier 5 failure validation...');

    // 1. Trace Durability Test
    await MissionTraceRecorder.recordEvent(missionId, { type: 'STEP_1', status: 'OK' });
    const tracePath = path.join(TRACE_DIR, `${missionId}.trace.json`);
    
    if (fs.existsSync(tracePath)) {
        logger.info('[ChaosMatrix] PASS: Initial trace persisted.');
    } else {
        logger.error('[ChaosMatrix] FAIL: Trace persistence failed.');
    }

    // 2. Corrupted Trace Resilience Test
    fs.writeFileSync(tracePath, '{ "corrupted": true, [INVALID_JSON] }');
    logger.warn('[ChaosMatrix] Simulated TRACE_CORRUPTION injected.');
    
    try {
        // Attempt to record new event into corrupted trace
        await MissionTraceRecorder.recordEvent(missionId, { type: 'STEP_2', status: 'RECOVERY' });
        logger.info('[ChaosMatrix] PASS: System handled corrupted file write.');
    } catch (err) {
        logger.error({ err }, '[ChaosMatrix] FAIL: System crashed on trace corruption.');
    }

    // 3. Incident Integrity Persistence Test
    await IncidentArchiveRegistry.recordIncident(missionId, 'SIMULATED_FAILURE', 'CHAOS_MATRIX_RECOVERY_TEST');
    const incidentPath = path.join(process.cwd(), '.ztan', 'registry', 'incidents.json');
    
    const incidents = JSON.parse(fs.readFileSync(incidentPath, 'utf8'));
    if (incidents[missionId]) {
        logger.info('[ChaosMatrix] PASS: Incident scar survived simulated process lifecycle.');
    } else {
        logger.error('[ChaosMatrix] FAIL: Incident scar lost.');
    }

    logger.info('[ChaosMatrix] Tier 5 Failure Validation Complete.');
}

runChaosMatrix().catch(err => {
    console.error('Chaos Matrix Error:', err);
    process.exit(1);
});
