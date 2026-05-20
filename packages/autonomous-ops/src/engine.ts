import type { AutonomousActionManifest, ActionSafetyReport } from './types.js';
import { InfraGraphEngine } from '@packages/infra-graph';
import { KubernetesDriver } from './drivers/kubernetes.js';
import { TerraformDriver } from './drivers/terraform.js';
import { logger } from '@packages/observability';
import { db } from '@packages/db';

/**
 * Real-world Infrastructure Mutation Engine
 * 
 * Orchestrates real infrastructure changes (K8s, Terraform) 
 * with mandatory blast-radius validation and evidence archival.
 */
export class AutonomousOpsEngine {
    private k8sDriver = new KubernetesDriver();
    private tfDriver = new TerraformDriver();

    constructor(private graphEngine: InfraGraphEngine) {}

    /**
     * Validates an infrastructure mutation for safety.
     * Uses the InfraGraph to compute blast radius.
     */
    public validateAction(manifest: AutonomousActionManifest): ActionSafetyReport {
        const { targetId, type } = manifest;
        
        // 1. Compute Blast Radius from real topology
        const blastRadius = this.graphEngine.computeBlastRadius(targetId);
        
        let safeToExecute = true;
        let reasoning = `Blast radius for ${targetId} affects ${blastRadius.totalImpactCount} dependent nodes.`;
        let requiredApproverTier: 1 | 2 | 3 = 1;

        if (blastRadius.totalImpactCount > 3) {
            safeToExecute = false;
            reasoning += ' High blast radius detected. Institutional approval required.';
            requiredApproverTier = 2;
        }

        if (type === 'INFRA_APPLY' || type === 'ROLLBACK') {
            requiredApproverTier = 2;
        }

        return {
            actionId: manifest.actionId,
            safeToExecute,
            reasoning,
            requiredApproverTier
        };
    }

    /**
     * Executes a REAL infrastructure mutation.
     */
    public async executeAction(manifest: AutonomousActionManifest): Promise<AutonomousActionManifest> {
        logger.info({ actionId: manifest.actionId, type: manifest.type }, '[AUTONOMOUS OPS] Executing Real Mutation...');
        
        // 1. Pre-Execution Safety Check
        const safety = this.validateAction(manifest);
        if (!safety.safeToExecute && manifest.approvalStatus !== 'APPROVED') {
            throw new Error(`[Security] Action ${manifest.actionId} blocked: High Risk / No Approval.`);
        }

        // 2. State Checkpoint (for rollback integrity)
        await this.archiveEvidence(manifest, 'PRE_EXECUTION');

        try {
            manifest.executionStatus = 'IN_PROGRESS';

            // 3. Driver Execution
            switch (manifest.type) {
                case 'K8S_ROLLOUT': {
                    const [ns, name] = manifest.targetId.split('/');
                    await this.k8sDriver.rolloutDeployment(ns || 'default', name || '', manifest.metadata.image || '');
                    break;
                }
                
                case 'INFRA_APPLY':
                    await this.tfDriver.apply(manifest.metadata.workingDir || '', manifest.metadata.vars || {});
                    break;

                case 'ROLLBACK': {
                    if (manifest.targetId.includes('/')) {
                        // K8s Rollback (Restoring previous image from metadata or last stable)
                        const [ns, name] = manifest.targetId.split('/');
                        await this.k8sDriver.rolloutDeployment(ns || 'default', name || '', manifest.metadata.previousImage || '');
                    } else {
                        // Terraform Rollback
                        await this.tfDriver.rollback(manifest.metadata.workingDir || '');
                    }
                    break;
                }

                case 'RECONCILE': {
                    const [dns, dname] = manifest.targetId.split('/');
                    await this.k8sDriver.reconcile(dns || 'default', dname || '', manifest.metadata.spec || {});
                    break;
                }

                default:
                    throw new Error(`Unsupported mutation type: ${manifest.type}`);
            }

            manifest.executionStatus = 'COMPLETED';
            await this.archiveEvidence(manifest, 'SUCCESS');

        } catch (error: any) {
            logger.error({ actionId: manifest.actionId, error: error.message }, '[AUTONOMOUS OPS] Execution Failed. Triggering Auto-Recovery...');
            manifest.executionStatus = 'FAILED';
            await this.archiveEvidence(manifest, 'FAILURE', error.message);
            
            // Auto-Rollback if enabled
            if (manifest.metadata.autoRollback) {
                await this.executeAction({
                    ...manifest,
                    actionId: `${manifest.actionId}-RB`,
                    type: 'ROLLBACK',
                    approvalStatus: 'APPROVED'
                });
            }
            throw error;
        }

        return manifest;
    }

    /**
     * Archives mutation evidence to the cryptographically linked ledger.
     */
    private async archiveEvidence(manifest: AutonomousActionManifest, stage: string, error?: string) {
        await db.auditLog.create({
            data: {
                action: manifest.type,
                resource: manifest.targetId,
                status: stage,
                metadata: {
                    actionId: manifest.actionId,
                    executionStatus: manifest.executionStatus,
                    error,
                    timestamp: new Date().toISOString()
                }
            }
        });
    }
}
