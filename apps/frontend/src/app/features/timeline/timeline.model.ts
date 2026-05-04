export interface TimelineEvent {
  missionId: string;
  stage: 'INIT' | 'PLAN' | 'BUILD' | 'COMPLETE';
  timestamp: string;
  duration?: number;
  error?: string;
}
