import * as k8s from '@kubernetes/client-node';
import { logger } from '@packages/observability';

/**
 * KubernetesActuator: Interface for real infrastructure mutations.
 * Implements blast-radius controls and RBAC-aware operations.
 */
export class KubernetesActuator {
  private appsApi: k8s.AppsV1Api;
  private coreApi: k8s.CoreV1Api;
  private readonly MAX_POD_SCALE = 10; // Blast radius limit

  constructor() {
    const kc = new k8s.KubeConfig();
    try {
      kc.loadFromDefault();
      this.appsApi = kc.makeApiClient(k8s.AppsV1Api);
      this.coreApi = kc.makeApiClient(k8s.CoreV1Api);
      logger.info('[K8S] Actuator initialized with local KubeConfig');
    } catch (e) {
      logger.warn('[K8S] KubeConfig not found. Running in MOCK mode.');
      this.appsApi = null as any;
      this.coreApi = null as any;
    }
  }

  /**
   * Scales a deployment with hard blast-radius limits.
   */
  public async scaleDeployment(namespace: string, name: string, replicas: number) {
    if (replicas > this.MAX_POD_SCALE) {
      logger.warn({ replicas, limit: this.MAX_POD_SCALE }, '[K8S] Scale request exceeds blast-radius limit. Capping.');
      replicas = this.MAX_POD_SCALE;
    }

    if (!this.appsApi) {
      logger.info({ namespace, name, replicas }, '[K8S-MOCK] Scaling Deployment');
      const { chaosOrchestrator } = require('./chaos-orchestrator');
      chaosOrchestrator.heal(name);
      return;
    }

    try {
      const res = await this.appsApi.readNamespacedDeployment(name, namespace);
      const deployment = res.body;
      deployment.spec!.replicas = replicas;

      await this.appsApi.replaceNamespacedDeployment(name, namespace, deployment);
      logger.info({ namespace, name, replicas }, '[K8S] Scale Successful');
    } catch (error) {
      logger.error({ error, name }, '[K8S] Scale Failed');
      throw error;
    }
  }

  /**
   * Restarts a deployment by patching the pod template annotation (Strategic Merge Patch).
   */
  public async restartDeployment(namespace: string, name: string) {
    if (!this.appsApi) {
      logger.info({ namespace, name }, '[K8S-MOCK] Restarting Deployment');
      const { chaosOrchestrator } = require('./chaos-orchestrator');
      chaosOrchestrator.heal(name);
      return;
    }

    const patch = {
      spec: {
        template: {
          metadata: {
            annotations: {
              'kubectl.kubernetes.io/restartedAt': new Date().toISOString()
            }
          }
        }
      }
    };

    try {
      await this.appsApi.patchNamespacedDeployment(
        name,
        namespace,
        patch,
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
        { headers: { 'Content-Type': 'application/strategic-merge-patch+json' } }
      );
      logger.info({ namespace, name }, '[K8S] Restart Successful');
    } catch (error) {
      logger.error({ error, name }, '[K8S] Restart Failed');
      throw error;
    }
  }
}

export const kubernetesActuator = new KubernetesActuator();
