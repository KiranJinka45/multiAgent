import * as k8s from '@kubernetes/client-node';
import logger from '../config/logger';

export class SandboxPodController {
    private k8sApi: k8s.CoreV1Api;
    private namespace: string = 'multi-agent-sandboxes';

    constructor() {
        const kc = new k8s.KubeConfig();
        kc.loadFromDefault();
        this.k8sApi = kc.makeApiClient(k8s.CoreV1Api);
    }

    async createSandbox(projectId: string, executionId: string): Promise<string> {
        const podName = `sandbox-${projectId}-${executionId}`.toLowerCase().replace(/[^a-z0-9-]/g, '-');
        
        const pod: k8s.V1Pod = {
            metadata: {
                name: podName,
                labels: {
                    app: 'sandbox',
                    projectId,
                    executionId
                }
            },
            spec: {
                containers: [{
                    name: 'runtime',
                    image: 'multi-agent-sandbox-runtime:latest',
                    resources: {
                        limits: {
                            memory: '512Mi',
                            cpu: '500m'
                        }
                    },
                    env: [
                        { name: 'PROJECT_ID', value: projectId },
                        { name: 'EXECUTION_ID', value: executionId }
                    ]
                }],
                restartPolicy: 'Never'
            }
        };

        try {
            await this.k8sApi.createNamespacedPod(this.namespace, pod);
            logger.info({ podName, projectId }, '[SandboxPodController] Pod created successfully');
            return podName;
        } catch (err: any) {
            logger.error({ err, podName }, '[SandboxPodController] Failed to create pod');
            throw err;
        }
    }

    async deleteSandbox(podName: string): Promise<void> {
        try {
            await this.k8sApi.deleteNamespacedPod(podName, this.namespace);
            logger.info({ podName }, '[SandboxPodController] Pod deleted');
        } catch (err: any) {
             logger.error({ err, podName }, '[SandboxPodController] Failed to delete pod');
        }
    }
}

export const sandboxPodController = new SandboxPodController();
