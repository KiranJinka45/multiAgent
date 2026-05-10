import * as k8s from '@kubernetes/client-node';
import { logger } from '@packages/observability';

export class K8sHelper {
  private kc: k8s.KubeConfig;
  private k8sApi: k8s.CoreV1Api;
  private k8sExec: k8s.Exec;

  constructor() {
    this.kc = new k8s.KubeConfig();
    try {
        this.kc.loadFromDefault();
    } catch (e) {
        logger.warn('[K8sHelper] Could not load default KubeConfig, using in-cluster config or mock.');
        try {
            this.kc.loadFromCluster();
        } catch (e2) {
            logger.error('[K8sHelper] KubeConfig initialization failed. Operating in MOCK mode.');
        }
    }
    this.k8sApi = this.kc.makeApiClient(k8s.CoreV1Api);
    this.k8sExec = new k8s.Exec(this.kc);
  }

  async createPod(namespace: string, podManifest: k8s.V1Pod): Promise<void> {
    try {
      await this.k8sApi.createNamespacedPod(namespace, podManifest);
      logger.info({ podName: podManifest.metadata?.name }, '[K8sHelper] Pod created successfully');
    } catch (err: any) {
      logger.error({ err: err.body?.message || err.message }, '[K8sHelper] Failed to create Pod');
      throw err;
    }
  }

  async deletePod(namespace: string, name: string): Promise<void> {
    try {
      await this.k8sApi.deleteNamespacedPod(name, namespace);
      logger.info({ podName: name }, '[K8sHelper] Pod deleted successfully');
    } catch (err: any) {
      logger.error({ err: err.body?.message || err.message }, '[K8sHelper] Failed to delete Pod');
    }
  }

  async executeCommand(namespace: string, name: string, container: string, command: string[]): Promise<{ stdout: string, stderr: string, exitCode: number }> {
    return new Promise((resolve, reject) => {
      let stdout = '';
      let stderr = '';
      
      const stream = new k8s.PassThrough();
      const errStream = new k8s.PassThrough();

      stream.on('data', (chunk) => stdout += chunk.toString());
      errStream.on('data', (chunk) => stderr += chunk.toString());

      this.k8sExec.exec(
        namespace,
        name,
        container,
        command,
        stream,
        errStream,
        null,
        false,
        (status: k8s.V1Status) => {
          const exitCode = status.status === 'Success' ? 0 : 1;
          resolve({ stdout, stderr, exitCode });
        }
      ).catch(reject);
    });
  }
}

export const k8sHelper = new K8sHelper();
