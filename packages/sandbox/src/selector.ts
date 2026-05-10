import { SandboxProfile, SandboxRuntimeClass } from './types';
import * as crypto from 'crypto';

/**
 * 🛡️ SandboxSelector
 * Logic for selecting the appropriate SandboxProfile based on task risk.
 */
export class SandboxSelector {
  /**
   * Determine the best runtime based on the task description and agent type.
   */
  static selectProfile(missionId: string, taskType: string, riskLevel: 'low' | 'high' = 'low'): SandboxProfile {
    const sandboxId = `sb-${missionId}-${crypto.randomBytes(2).toString('hex')}`;
    
    // Default: gVisor for orchestration/low-risk
    let runtime: SandboxRuntimeClass = "gvisor";
    
    if (riskLevel === 'high' || taskType === 'coder' || taskType === 'executor') {
      runtime = "firecracker";
    }

    return {
      id: sandboxId,
      runtime,
      mounts: [], // To be populated by VFS
      network: {
        outbound: runtime === "gvisor", // Firecracker is air-gapped by default
      },
      resources: {
        cpu: runtime === "firecracker" ? "1.0" : "500m",
        memory: runtime === "firecracker" ? "1024Mi" : "512Mi",
        timeoutSeconds: 300
      },
      replay: {
        snapshot: runtime === "firecracker",
        lineageRequired: true
      }
    };
  }
}
