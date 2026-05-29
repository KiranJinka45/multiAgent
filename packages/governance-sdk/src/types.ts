export enum GovernanceEventType {
  INTENT_RECEIVED = 'security.intent.received',
  INTENT_BLOCKED = 'security.intent.blocked',
  POLICY_PRECHECK_ALLOWED = 'policy.precheck.allowed',
  POLICY_PRECHECK_DENIED = 'policy.precheck.denied',
  SIMULATION_PASSED = 'sandbox.simulation.passed',
  SIMULATION_FAILED = 'sandbox.simulation.failed',
  GENERATION_STARTED = 'generation.started',
  GENERATION_COMPLETED = 'generation.completed',
  EXECUTION_FINALIZED = 'execution.finalized',
  CAPABILITY_GRANTED = 'capability.granted',
  CAPABILITY_USED = 'capability.used',
  CAPABILITY_DENIED = 'capability.denied',
  RESOURCE_EXCEEDED = 'resource.exceeded',
  SANDBOX_TERMINATED = 'sandbox.terminated',
  EXECUTION_ATTESTATION_CREATED = 'execution.attestation.created',
  EXECUTION_REPLAY_STORED = 'execution.replay.stored'
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
