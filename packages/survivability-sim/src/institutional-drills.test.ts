import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OperatorDrillSimulator, DrillScenario } from './drill-simulator';

// Overriding NODE_ENV for testing to prevent fatal exception in constructor
const originalEnv = process.env.NODE_ENV;

describe('Institutional Survivability Drills (Phase 08.5)', () => {
    let simulator: OperatorDrillSimulator;

    beforeEach(() => {
        process.env.NODE_ENV = 'test';
        simulator = new OperatorDrillSimulator();
        vi.useFakeTimers();
    });

    afterEach(() => {
        process.env.NODE_ENV = originalEnv;
        simulator.haltDrill();
        vi.useRealTimers();
    });

    it('emits cell_resurrection_required when testing cell resurrection', () => {
        const spy = vi.fn();
        simulator.on('cell_resurrection_required', spy);

        simulator.startDrill(DrillScenario.CELL_RESURRECTION);
        vi.advanceTimersByTime(1100);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            offlineTrustRegistry: 'registry_snapshot_v9',
            lastKnownGovernanceEpoch: 'epoch-alpha'
        }));
    });

    it('emits governance_rotation_required when testing succession', () => {
        const spy = vi.fn();
        simulator.on('governance_rotation_required', spy);

        simulator.startDrill(DrillScenario.GOVERNANCE_SUCCESSION);
        vi.advanceTimersByTime(1600);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            retiringSignatures: ['sig_alpha', 'sig_beta'],
            newEpochId: 'epoch-beta'
        }));
    });

    it('emits archive_reconstruction_started when testing archive reconstruction', () => {
        const spy = vi.fn();
        simulator.on('archive_reconstruction_started', spy);

        simulator.startDrill(DrillScenario.ARCHIVE_RECONSTRUCTION);
        vi.advanceTimersByTime(2100);

        expect(spy).toHaveBeenCalledTimes(1);
        expect(spy).toHaveBeenCalledWith(expect.objectContaining({
            packetsToProcess: 500,
            expectedRootHash: '0xfinal_root_hash'
        }));
    });
});
