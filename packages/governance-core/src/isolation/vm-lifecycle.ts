import { FirecrackerOrchestrator } from './firecracker-orchestrator.js';
import type { VmConfiguration } from './firecracker-orchestrator.js';
import { VmConstraintMonitor } from './vm-limits.js';
import type { VmQuotas } from './vm-limits.js';
import { DryRunSimulator } from '../simulation/dry-run.js';
import { TemporalWorkflowOrchestrator } from '../escalation/temporal-workflow.js';
import type { CommandExecutionProposal } from '../filters/command-filter.js';

export class IsolatedExecutionRunner {
    private orchestrator: FirecrackerOrchestrator;
    
    // Sweeper to ensure absolute zero-tolerance for leaked VMs
    private static orphanedVms = new Set<string>();

    constructor(orchestrator: FirecrackerOrchestrator) {
        this.orchestrator = orchestrator;
    }

    /**
     * Executes a command inside an isolated VM with guaranteed destruction.
     * Enforces quotas, DryRun simulation, and strictly cleans up in finally block.
     *
     * SAFETY INVARIANT: DryRunSimulator MUST approve the proposal before
     * any VM sandbox is created. Dangerous/irreversible operations are routed
     * to escalation workflows instead.
     */
    async executeIsolated(
        vmId: string, 
        command: string, 
        requestedQuotas: Partial<VmQuotas> = {},
        tenantId: string = 'system'
    ): Promise<string> {
        // ═══ DRY-RUN SIMULATION GATE (Remediation Fix #7) ═══
        // This MUST execute before any sandbox is created.
        const simulationProposal: CommandExecutionProposal = {
            toolName: 'vm-execute',
            tenantId,
            payload: command
        };

        const simResult = DryRunSimulator.simulateProposal(simulationProposal);

        if (!simResult.isSafe) {
            if (simResult.requiresHumanEscalation) {
                // Route to escalation workflow — do NOT create a sandbox.
                const workflowId = await TemporalWorkflowOrchestrator.startEscalationWorkflow(
                    simulationProposal,
                    3600000 // 1 hour default escalation timeout
                );
                throw new Error(
                    `[SIMULATION_BLOCKED] VM execution blocked by DryRunSimulator. ` +
                    `Reason: ${simResult.reason}. ` +
                    `Escalation workflow started: ${workflowId}. ` +
                    `Forecasted effects: ${simResult.forecastedEffects.join(', ')}`
                );
            }

            // Unsafe but not escalatable — hard reject.
            throw new Error(
                `[SIMULATION_REJECTED] VM execution denied by DryRunSimulator. ` +
                `Reason: ${simResult.reason}. ` +
                `Forecasted effects: ${simResult.forecastedEffects.join(', ')}`
            );
        }

        const quotas = VmConstraintMonitor.assertSafeQuotas(requestedQuotas);

        const config: VmConfiguration = {
            vmId,
            kernelImagePath: '/var/lib/ztan/vmlinux',
            rootfsPath: `/var/lib/ztan/rootfs/${vmId}.ext4`,
            memorySizeMb: quotas.memorySizeMb,
            vcpuCount: quotas.vcpuCount
        };

        IsolatedExecutionRunner.orphanedVms.add(vmId);

        try {
            // 1. Spawn Sandbox
            await this.orchestrator.startIsolationSandbox(config);

            // 2. Execute with Execution Timeout
            const executePromise = this.orchestrator.run(vmId, command);
            
            const timeoutPromise = new Promise<never>((_, reject) => {
                setTimeout(() => {
                    reject(new Error(`[VM_TIMEOUT] Execution exceeded hard limit of ${quotas.executionTimeoutMs}ms`));
                }, quotas.executionTimeoutMs);
            });

            return await Promise.race([executePromise, timeoutPromise]);
            
        } finally {
            // 3. Guaranteed Destruction (Zero Tolerance)
            // This finally block MUST execute regardless of errors or timeouts
            console.log(`[LIFECYCLE] Guaranteeing destruction of VM ${vmId}`);
            try {
                await this.orchestrator.destroyIsolationSandbox(vmId);
            } catch (err) {
                console.error(`[FATAL] Failed to destroy VM ${vmId}:`, err);
            } finally {
                // Ensure sweeping tracking is updated
                IsolatedExecutionRunner.orphanedVms.delete(vmId);
            }
        }
    }

    /**
     * Failsafe sweeper to catch any VMs that bypassed the finally block (e.g. process hard crash).
     * Typically run on process startup/shutdown.
     */
    static async sweepOrphanedVms(orchestrator: FirecrackerOrchestrator): Promise<void> {
        for (const vmId of this.orphanedVms) {
            console.warn(`[LIFECYCLE] Sweeping orphaned VM ${vmId}`);
            try {
                await orchestrator.destroyIsolationSandbox(vmId);
            } catch (err) {
                console.error(`[FATAL] Sweeper failed to destroy orphaned VM ${vmId}:`, err);
            }
        }
        this.orphanedVms.clear();
    }
}

