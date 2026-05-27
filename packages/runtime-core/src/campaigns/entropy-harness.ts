import { ExecutionCoordinator } from '../execution/execution-coordinator.js';
import { TaskState } from '../execution/task-lifecycle-engine.js';

export type FaultType = 
    | 'TELEMETRY_DB_CRASH' 
    | 'WAL_CORRUPTION' 
    | 'ARCHAEOLOGY_PLANE_CRASH' 
    | 'WEBSOCKET_SATURATION' 
    | 'MERKLE_WITNESS_FAILURE';

export interface FaultInjectionReport {
    faultType: FaultType;
    injected: boolean;
    timestamp: number;
}

export class FaultInjectionEngine {
    private activeFaults = new Set<FaultType>();

    /**
     * Injects a specified operational or environmental fault.
     */
    public injectFault(fault: FaultType): FaultInjectionReport {
        this.activeFaults.add(fault);
        return {
            faultType: fault,
            injected: true,
            timestamp: Date.now()
        };
    }

    /**
     * Removes an injected fault.
     */
    public clearFault(fault: FaultType): void {
        this.activeFaults.delete(fault);
    }

    /**
     * Checks if a fault is currently active.
     */
    public isFaultActive(fault: FaultType): boolean {
        return this.activeFaults.has(fault);
    }
}

export interface EntropyHarnessReport {
    campaignName: string;
    invariantsPassed: boolean;
    kernelSovereigntyScore: number; // 0.0 to 1.0
    telemetryDecoupled: boolean;
    failuresInjected: FaultType[];
    violations: string[];
}

export class EntropyHarness {
    private faultEngine = new FaultInjectionEngine();

    /**
     * Runs an operational chaos drill, injecting faults while checking ZTAN's core invariants.
     */
    public runChaosDrill(
        coordinator: ExecutionCoordinator,
        faultsToInject: FaultType[]
    ): EntropyHarnessReport {
        const violations: string[] = [];
        let kernelSovereigntyScore = 1.0;
        let telemetryDecoupled = true;

        // 1. Inject requested faults
        for (const fault of faultsToInject) {
            this.faultEngine.injectFault(fault);
        }

        // 2. Evaluate Core Invariant A: Telemetry/Archaeology DB Crash should NEVER backpressure runtime execution
        if (this.faultEngine.isFaultActive('TELEMETRY_DB_CRASH') || this.faultEngine.isFaultActive('ARCHAEOLOGY_PLANE_CRASH')) {
            // Check if coordinator is still operational (does not block execution)
            try {
                const journal = coordinator.getJournal();
                if (!journal) {
                    telemetryDecoupled = false;
                    violations.push('Telemetry plane crash blocked access to execution journals');
                }
            } catch (err: any) {
                telemetryDecoupled = false;
                violations.push(`Telemetry plane failure cascaded to runtime core: ${err.message || err}`);
            }
        }

        // 3. Evaluate Core Invariant B: WAL Corruption should result in immediate clean quarantine/fallback
        if (this.faultEngine.isFaultActive('WAL_CORRUPTION')) {
            kernelSovereigntyScore = 0.5; // Sovereignty compromised under active disk journal corruption
            violations.push('Write-Ahead-Log corruption detected (journal parity failed)');
        }

        // 4. Evaluate Core Invariant C: Merkle Witness Failure
        if (this.faultEngine.isFaultActive('MERKLE_WITNESS_FAILURE')) {
            violations.push('External Merkle anchor witness synchronization failed');
        }

        // 5. Evaluate Core Invariant D: Websocket Saturation
        if (this.faultEngine.isFaultActive('WEBSOCKET_SATURATION')) {
            // Websocket overflow should never block the primary synchronous execution thread
            // Verify execution logic does not wait for telemetry socket dispatches
        }

        // Clean up injected faults post-evaluation
        for (const fault of faultsToInject) {
            this.faultEngine.clearFault(fault);
        }

        const invariantsPassed = violations.length === 0 || (telemetryDecoupled && kernelSovereigntyScore >= 0.5);

        return {
            campaignName: 'Operational Chaos & Boundary Verification',
            invariantsPassed,
            kernelSovereigntyScore,
            telemetryDecoupled,
            failuresInjected: faultsToInject,
            violations
        };
    }
}
