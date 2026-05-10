import { 
  ISandboxProvider, 
  SandboxProfile, 
  SandboxInstance, 
  SandboxWorkload, 
  SandboxExecutionResult, 
  SandboxRuntimeClass, 
  RuntimeCapabilities,
  SandboxTelemetry
} from '../types';
import { logger } from '../../../observability/src';
import * as crypto from 'crypto';
import { k8sHelper } from '../k8s-helper';
import { V1Pod } from '@kubernetes/client-node';

/**
 * 🛡️ GVisorProvider
 * Implementation of kernel-level isolation using gVisor (runsc).
 * 
 * Strategy:
 * - Low-risk orchestration & reasoning.
 * - Faster provisioning than Firecracker.
 * - Shared kernel with strict syscall intercept.
 */
export class GVisorProvider implements ISandboxProvider {
  public readonly runtimeClass: SandboxRuntimeClass = "gvisor";

  public readonly capabilities: RuntimeCapabilities = {
    supportsSnapshot: false,             // gVisor snapshots are complex in K8s
    supportsNestedVirtualization: false,
    supportsOutboundNetworking: true,    // Scoped via NetworkPolicies
    supportsPackageInstallation: true,   // In-container apt/npm
    supportsGpuAccess: false,
    supportsDeterministicReplay: true,   // Syscall-level audit logs
    maxExecutionTimeSeconds: 300,
    isolationLevel: "kernel"
  };

  async provision(profile: SandboxProfile): Promise<SandboxInstance> {
    const namespace = process.env.SANDBOX_NAMESPACE || 'ztan-sandboxes';
    const podName = `sbx-${profile.id}`;

    logger.info({ 
      sandboxId: profile.id, 
      podName,
      runtime: this.runtimeClass 
    }, '[GVisorProvider] Provisioning real Pod with runsc runtimeClass');

    const podManifest: V1Pod = {
      metadata: {
        name: podName,
        namespace,
        labels: {
          'ztan.io/sandbox-id': profile.id,
          'ztan.io/runtime': 'gvisor'
        }
      },
      spec: {
        runtimeClassName: 'gvisor',
        restartPolicy: 'Never',
        containers: [
          {
            name: 'executor',
            image: process.env.SANDBOX_EXECUTOR_IMAGE || 'ztan/executor-base:latest',
            resources: {
              limits: {
                cpu: profile.resources.cpu,
                memory: profile.resources.memory
              }
            },
            command: ['sleep', 'infinity'] // Keep alive for execution
          }
        ]
      }
    };

    await k8sHelper.createPod(namespace, podManifest);
    
    return {
      id: profile.id,
      state: "READY",
      capabilities: this.capabilities,
      metadata: {
        podName,
        namespace,
        provider: "gvisor-k8s-driver",
        version: "1.0.0"
      }
    };
  }

  async execute(
    sandboxId: string, 
    workload: SandboxWorkload
  ): Promise<SandboxExecutionResult> {
    const executionId = crypto.randomUUID();
    const timestamp = new Date().toISOString();
    const namespace = process.env.SANDBOX_NAMESPACE || 'ztan-sandboxes';
    const podName = `sbx-${sandboxId}`;

    logger.info({ 
      executionId, 
      sandboxId, 
      command: workload.command 
    }, '[GVisorProvider] Executing in gVisor container via K8s Exec');

    const result = await k8sHelper.executeCommand(
        namespace,
        podName,
        'executor',
        [workload.command, ...workload.args]
    );
    
    return {
      executionId,
      exitCode: result.exitCode,
      stdout: result.stdout,
      stderr: result.stderr,
      metadata: {
        sandboxId,
        runtimeClass: this.runtimeClass,
        mountHash: "", 
        executionHash: "", 
        timestamp
      }
    };
  }

  async destroy(sandboxId: string): Promise<void> {
    const namespace = process.env.SANDBOX_NAMESPACE || 'ztan-sandboxes';
    const podName = `sbx-${sandboxId}`;
    logger.info({ sandboxId }, '[GVisorProvider] Terminating Pod and cleaning volumes');
    await k8sHelper.deletePod(namespace, podName);
  }

  async *telemetry(sandboxId: string): AsyncIterable<SandboxTelemetry> {
    yield { 
      timestamp: new Date().toISOString(), 
      level: "info", 
      message: "gVisor telemetry stream active" 
    };
  }
}
