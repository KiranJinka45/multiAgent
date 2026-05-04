/**
 * @packages/contracts
 * 
 * Shared service contracts and ubiquitous language definitions.
 * This is the SOURCE OF TRUTH for cross-service communication.
 */

export * from './api';
export * from './sre';

export enum MissionStatus {
    PENDING = 'PENDING',
    RUNNING = 'RUNNING',
    COMPLETED = 'COMPLETED',
    FAILED = 'FAILED'
}

export enum ProjectStatus {
    DRAFT = 'DRAFT',
    ACTIVE = 'ACTIVE',
    ARCHIVED = 'ARCHIVED'
}

export interface ActivityInput {
  missionId: string;
  projectId: string;
  [key: string]: any;
}

export interface BuildActivityResult {
  success: boolean;
  artifactPath?: string;
  artifacts?: any[];
  duration?: number;
  error?: string;
}

export interface DeployActivityResult {
  success: boolean;
  url?: string;
  previewUrl?: string;
  error?: string;
}

export interface AgentRequest {
  prompt: string;
  context: AgentContext;
  params?: any;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  metrics?: {
    tokensTotal: number;
    durationMs: number;
    confidence?: number;
  };
}

export interface AgentContext {
  executionId: string;
  projectId: string;
  metadata?: Record<string, any>;
}

/**
 * PROJECT DTO
 */
export interface Project {
  id: string;
  name: string;
  description?: string;
  status: ProjectStatus;
  createdAt: string | number;
  updatedAt: string | number;
  missionId?: string;
  userId?: string;
  tenantId?: string;
  files?: ProjectFile[];
}

export interface ProjectFile {
  path: string;
  content: string;
}

/**
 * MISSION DTO
 */
export interface MissionLifecycleUpdate {
  sequenceId: number;
  timestamp: number;
  clusterId: string;
  region: string;
  intent: string;
  prompt: string;
  status: MissionStatus | string;
  title?: string;
  executionId?: string;
  createdAt: string | number;
}

export interface Mission {
  id: string;
  projectId: string;
  userId: string;
  prompt: string;
  status: MissionStatus | string;
  title?: string;
  executionId?: string;
  createdAt: string | number;
  updatedAt?: string | number;
  tenantId?: string;
  metadata?: Record<string, any>;
}

export interface Chat {
  id: string;
  projectId: string;
  messages: Message[];
}


export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

// ── Compatibility Shims ──────────────────────────────────────────────────
export type ProjectV1 = Project;
export type ProjectHistoryV1 = any;
