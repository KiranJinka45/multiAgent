export enum GovernanceEventType {
  INTENT_RECEIVED = 'INTENT_RECEIVED',
  INTENT_INSPECTED = 'INTENT_INSPECTED',
  POLICY_EVALUATED = 'POLICY_EVALUATED',
  SIMULATION_COMPLETED = 'SIMULATION_COMPLETED',
  GENERATION_STARTED = 'GENERATION_STARTED',
  FILES_GENERATED = 'FILES_GENERATED',
  EXECUTION_FINALIZED = 'EXECUTION_FINALIZED'
}

export interface EmitEventRequest {
  eventType: GovernanceEventType | string;
  correlationId: string;
  actor?: string;
  service?: string;
  riskLevel?: string;
  payload: any;
}

export interface GovernanceEventRecord {
  eventId: string;
  eventType: string;
  correlationId: string;
  parentEventId: string | null;
  timestamp: string;
  actor: string;
  service: string;
  riskLevel: string | null;
  payloadHash: string;
  payload: string;
  signature: string | null;
  previousEventHash: string | null;
  currentEventHash: string;
}
