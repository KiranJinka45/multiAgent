/**
 * ZTAN Stewardship Console - Operator Drill Simulator
 * 
 * DESIGN CONSTRAINTS (11.10)
 * 1. Must never connect to production data.
 * 2. Must never mutate authoritative state.
 * 3. Operates purely on local SQLite / in-memory datasets for training.
 * 4. Used specifically to rehearse the "Cognitive Saturation" drill.
 */

import { EventEmitter } from 'events';

export enum DrillScenario {
  BACKEND_PARTITION = 'BACKEND_PARTITION',
  WAL_DIVERGENCE = 'WAL_DIVERGENCE',
  ROGUE_NODE_QUARANTINE = 'ROGUE_NODE_QUARANTINE',
}

export class OperatorDrillSimulator extends EventEmitter {
  private isSimulationRunning = false;

  constructor() {
    super();
    // Safety check: ensure we are absolutely not in a production environment
    if (process.env.NODE_ENV === 'production') {
      throw new Error('FATAL: Drill Simulator instantiated in production context. Process terminated.');
    }
  }

  public startDrill(scenario: DrillScenario) {
    console.log(`[SIMULATOR] Initiating SRE Training Drill: ${scenario}`);
    this.isSimulationRunning = true;

    switch (scenario) {
      case DrillScenario.BACKEND_PARTITION:
        this.simulatePartition();
        break;
      case DrillScenario.WAL_DIVERGENCE:
        this.simulateLineageDrift();
        break;
      case DrillScenario.ROGUE_NODE_QUARANTINE:
        this.simulateQuarantineWorkflow();
        break;
    }
  }

  private simulatePartition() {
    // Simulates an immediate 503 response from the simulated backend
    // This allows operators to practice reading the 'STALE CACHE' UI state
    setTimeout(() => {
      this.emit('telemetry_interrupted', { 
        reason: 'Authoritative Backend Unreachable', 
        simulatedDowntimeMs: 45000 
      });
      console.log('[SIMULATOR] Telemetry link severed. Expecting UI to enter READ-ONLY LOCAL CACHE MODE.');
    }, 2000);
  }

  private simulateLineageDrift() {
    // Simulates a WAL sequence mismatch forcing operators to identify the fork point
    setTimeout(() => {
      this.emit('wal_drift_detected', {
        authoritativeSequence: 'SEQ-9941',
        replicaSequence: 'SEQ-9880',
        driftMagnitude: 61
      });
    }, 3000);
  }

  private simulateQuarantineWorkflow() {
    // Simulates a scenario requiring a multi-operator WebAuthn ceremony
    setTimeout(() => {
      this.emit('quarantine_event', {
        partitionId: 'prt-sim-009',
        reason: 'Byzantine Fault Detected',
        requiredQuorum: 2
      });
    }, 1500);
  }

  public haltDrill() {
    this.isSimulationRunning = false;
    console.log('[SIMULATOR] Drill halted. Resetting simulated state.');
    this.emit('drill_concluded');
  }
}
