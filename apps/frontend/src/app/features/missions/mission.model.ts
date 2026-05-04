export interface MissionLog {
  timestamp: string;
  message: string;
}

export interface MissionStep {
  id: string;
  title: string;
  agentType: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed' | 'skipped';
  dependsOnIds: string[];
}

export interface Mission {
  id: string;
  status: 'queued' | 'running' | 'retrying' | 'failed' | 'completed';
  createdAt: string;
  updatedAt: string;
  retries: number;
  failureReason?: string;
  failureStage?: string;
  lastError?: string;
  logs?: MissionLog[];
  sequence?: string;
  steps?: MissionStep[];
}
