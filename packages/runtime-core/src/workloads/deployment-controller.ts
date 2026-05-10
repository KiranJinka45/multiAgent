import { MissionTraceRecorder } from '../index';
import { IDeploymentManifest, IDeploymentResult } from './deployment';
import { IMissionEvent, FailureClass } from '../contracts';
import { logger } from '@packages/utils';
import { v4 as uuidv4 } from 'uuid';

/**
 * 🚢 ZTAN Traceable Deployment Controller (TDC)
 * Version: 1.0.0
 */

export class DeploymentController {
    private recorder = MissionTraceRecorder.getInstance();

    async executeDeployment(manifest: IDeploymentManifest): Promise<IDeploymentResult> {
        const deploymentId = manifest.id;
        const startTime = new Date().toISOString();
        logger.info({ deploymentId }, '[TDC] Starting Traceable Deployment');

        let stepsExecuted = 0;
        try {
            for (const step of manifest.steps) {
                // Simulate occasional random failure for OTM testing
                if (step.name === 'FAIL_TEST') {
                    throw new Error('SIMULATED_OPERATIONAL_FAILURE');
                }

                await this.recordStepEvent(deploymentId, step, 'START');
                
                // Simulate action execution
                logger.info({ deploymentId, step: step.name }, `[TDC] Executing action: ${step.action}`);
                await new Promise(resolve => setTimeout(resolve, 500)); // Simulating I/O
                
                await this.recordStepEvent(deploymentId, step, 'COMPLETED');
                stepsExecuted++;
            }

            const result: IDeploymentResult = {
                deploymentId,
                status: 'SUCCESS',
                startTime,
                endTime: new Date().toISOString(),
                traceId: deploymentId,
                stepsExecuted
            };

            await this.emitTruthMetrics(result);
            return result;

        } catch (error: any) {
            const failureClass = error.message === 'SIMULATED_OPERATIONAL_FAILURE' 
                ? FailureClass.DEPLOYMENT_FAILURE 
                : FailureClass.NON_RECOVERABLE;

            logger.error({ deploymentId, failureClass, error: error.message }, '[TDC] Deployment Failed');
            
            const result: IDeploymentResult = {
                deploymentId,
                status: 'FAILED',
                startTime,
                endTime: new Date().toISOString(),
                traceId: deploymentId,
                stepsExecuted
            };
            
            await this.recordFailureEvent(deploymentId, error.message, failureClass);
            await this.emitTruthMetrics(result);
            return result;
        }
    }

    private async recordFailureEvent(deploymentId: string, error: string, failureClass: FailureClass) {
        const event: IMissionEvent = {
            id: uuidv4(),
            missionId: deploymentId,
            type: 'DEPLOYMENT_FAILURE_EVENT',
            timestamp: new Date().toISOString(),
            payload: { error },
            metadata: {
                stepIndex: -1,
                agentId: 'TDC_V1',
                reproducible: true,
                failureClass
            }
        };
        await this.recorder.recordEvent(event);
    }

    private async recordStepEvent(deploymentId: string, step: any, status: string) {
        const event: IMissionEvent = {
            id: uuidv4(),
            missionId: deploymentId,
            type: `DEPLOYMENT_STEP_${status}`,
            timestamp: new Date().toISOString(),
            payload: { step },
            metadata: {
                stepIndex: 0,
                agentId: 'TDC_V1',
                reproducible: true
            }
        };
        await this.recorder.recordEvent(event);
    }

    private async emitTruthMetrics(result: IDeploymentResult) {
        logger.info({
            deploymentId: result.deploymentId,
            successRate: result.status === 'SUCCESS' ? 1.0 : 0.0,
            replayDeterminism: 1.0, // Initial target
            recoveryTimeMs: 0 // To be measured by chaos matrix
        }, '[OTM] Operational Truth Metrics Emitted');
    }
}

// 🛡️ Bootstrap TDC if run directly
if (require.main === module) {
    const tdc = new DeploymentController();
    const demoManifest: IDeploymentManifest = {
        id: `DEP_${Date.now()}`,
        targetEnvironment: 'staging',
        rollbackPolicy: 'auto',
        steps: [
            { name: 'Copy Assets', action: 'copy', params: { src: './build', dest: '/var/www' }, critical: true },
            { name: 'Restart Service', action: 'restart', params: { service: 'nginx' }, critical: true }
        ]
    };

    tdc.executeDeployment(demoManifest).then(() => {
        logger.info('[TDC] Demo Deployment Complete');
        process.exit(0);
    });
}
