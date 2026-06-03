import { SandboxManager } from "../../sandbox/src/manager";
import { SandboxProfile } from "../../sandbox/src/types";

export interface PilotGate {
  decision: 'APPROVE' | 'REJECT';
  rationale?: string;
}

export type MissionState = 'READY' | 'EXECUTING' | 'FAILED' | 'COMPLETED';

export interface Mission {
  id: string;
  state: MissionState;
  metadata?: {
    rationale?: string;
    reason?: string;
    [key: string]: any;
  };
}

export class MissionOrchestrator {
  private missions: Map<string, Mission> = new Map();
  private sandboxManager: SandboxManager;

  constructor(sandboxManager?: SandboxManager) {
    this.sandboxManager = sandboxManager || new SandboxManager();
  }

  public createMission(id: string): Mission {
    const mission: Mission = { id, state: 'READY', metadata: {} };
    this.missions.set(id, mission);
    return mission;
  }

  public getMission(id: string): Mission | undefined {
    return this.missions.get(id);
  }

  public async processPilotGate(missionId: string, gate: PilotGate): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    if (mission.state !== 'READY') {
      throw new Error(`Cannot process gate for mission in state ${mission.state}`);
    }

    if (gate.decision === 'APPROVE') {
      mission.state = 'EXECUTING';
    } else {
      mission.state = 'FAILED';
    }

    mission.metadata = mission.metadata || {};
    if (gate.rationale) {
      mission.metadata.rationale = gate.rationale;
    }
  }

  public async provisionSandbox(missionId: string, profile: SandboxProfile, credits: number, requiredCredits: number): Promise<void> {
    const mission = this.missions.get(missionId);
    if (!mission) throw new Error(`Mission ${missionId} not found`);

    if (mission.state !== 'EXECUTING') {
      throw new Error(`Mission must be EXECUTING to provision sandbox`);
    }

    if (credits < requiredCredits) {
      mission.state = 'FAILED';
      mission.metadata = mission.metadata || {};
      mission.metadata.reason = 'INSUFFICIENT_FUNDS';
      return;
    }

    const result = this.sandboxManager.execute(profile);
    if (!result.success) {
      mission.state = 'FAILED';
      mission.metadata = mission.metadata || {};
      mission.metadata.reason = result.error;
    }
  }
}
