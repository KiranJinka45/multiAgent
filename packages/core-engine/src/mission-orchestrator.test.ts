import { describe, it, expect, vi, beforeEach } from 'vitest';
import { MissionOrchestrator } from './mission-orchestrator';
import { SandboxManager } from '../../sandbox/src/manager';
import type { SandboxProfile } from '../../sandbox/src/types';

vi.mock('../../sandbox/src/manager');

describe('MissionOrchestrator', () => {
  let orchestrator: MissionOrchestrator;
  let mockSandboxManager: vi.Mocked<SandboxManager>;

  beforeEach(() => {
    mockSandboxManager = new SandboxManager() as vi.Mocked<SandboxManager>;
    orchestrator = new MissionOrchestrator(mockSandboxManager);
  });

  it('mission remains READY until approved', async () => {
    const mission = orchestrator.createMission('m-1');
    expect(mission.state).toBe('READY');

    await orchestrator.processPilotGate('m-1', { decision: 'REJECT', rationale: 'Not safe' });
    
    const updated = orchestrator.getMission('m-1');
    expect(updated?.state).toBe('FAILED');
    expect(updated?.metadata?.rationale).toBe('Not safe');
  });

  it('mission transitions to EXECUTING when approved', async () => {
    const mission = orchestrator.createMission('m-2');
    await orchestrator.processPilotGate('m-2', { decision: 'APPROVE', rationale: 'Looks good' });
    
    const updated = orchestrator.getMission('m-2');
    expect(updated?.state).toBe('EXECUTING');
    expect(updated?.metadata?.rationale).toBe('Looks good');
  });

  it('fails if credits are zero', async () => {
    orchestrator.createMission('m-3');
    await orchestrator.processPilotGate('m-3', { decision: 'APPROVE' });

    const profile: SandboxProfile = {
      runtime: 'gvisor',
      resources: { cpu: '1', memory: '1Gi', timeoutSeconds: 60 }
    };

    await orchestrator.provisionSandbox('m-3', profile, 0, 100);

    const updated = orchestrator.getMission('m-3');
    expect(updated?.state).toBe('FAILED');
    expect(updated?.metadata?.reason).toBe('INSUFFICIENT_FUNDS');
    expect(mockSandboxManager.execute).not.toHaveBeenCalled();
  });

  it('provisions sandbox if credits are sufficient', async () => {
    orchestrator.createMission('m-4');
    await orchestrator.processPilotGate('m-4', { decision: 'APPROVE' });

    const profile: SandboxProfile = {
      runtime: 'gvisor',
      resources: { cpu: '1', memory: '1Gi', timeoutSeconds: 60 }
    };

    mockSandboxManager.execute.mockReturnValue({ success: true, executionHash: 'hash123' });

    await orchestrator.provisionSandbox('m-4', profile, 200, 100);

    const updated = orchestrator.getMission('m-4');
    expect(updated?.state).toBe('EXECUTING'); // remains EXECUTING
    expect(mockSandboxManager.execute).toHaveBeenCalledWith(profile);
  });
});
