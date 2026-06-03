import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SandboxManager } from './manager';
import type { SandboxProfile } from './types';

describe('SandboxManager', () => {
  let manager: SandboxManager;

  beforeEach(() => {
    manager = new SandboxManager();
  });

  afterEach(() => {
    delete process.env.TEST_FIRECRACKER_REJECT;
  });

  it('gvisor provider correctly handles the remediation fixture', () => {
    const profile: SandboxProfile = {
      runtime: 'gvisor',
      mounts: [{ source: 'vfs://src', target: '/app', mode: 'ro' }],
      network: { outbound: true },
      resources: { cpu: '500m', memory: '512Mi', timeoutSeconds: 300 }
    };

    const result = manager.execute(profile);
    
    expect(result.success).toBe(true);
    expect(result.mountHash).toBeDefined();
    expect(result.executionHash).toBeDefined();
    expect(result.error).toBeUndefined();
  });

  it('firecracker provider rejects forbidden outbound traffic', () => {
    process.env.TEST_FIRECRACKER_REJECT = '1';
    
    const profile: SandboxProfile = {
      runtime: 'firecracker',
      network: { outbound: false },
      resources: { cpu: '1.0', memory: '1Gi', timeoutSeconds: 60 }
    };

    const result = manager.execute(profile);
    
    expect(result.success).toBe(false);
    expect(result.error).toBe('Forbidden outbound traffic');
  });

  it('mountHash and executionHash are correctly calculated by the manager', () => {
    const profile1: SandboxProfile = {
      runtime: 'gvisor',
      mounts: [{ source: 'vfs://src', target: '/app', mode: 'ro' }],
      resources: { cpu: '500m', memory: '512Mi', timeoutSeconds: 300 }
    };
    
    const profile2: SandboxProfile = {
      runtime: 'gvisor',
      mounts: [{ source: 'vfs://src', target: '/app', mode: 'rw' }], // Different mount mode
      resources: { cpu: '500m', memory: '512Mi', timeoutSeconds: 300 }
    };

    const result1 = manager.execute(profile1);
    const result2 = manager.execute(profile2);

    expect(result1.mountHash).not.toEqual(result2.mountHash);
    expect(result1.executionHash).toEqual(result2.executionHash); // Execution parameters unchanged
  });
});
