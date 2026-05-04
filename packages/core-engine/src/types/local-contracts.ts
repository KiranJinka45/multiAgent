/**
 * @packages/core-engine/local-contracts
 * 
 * Internal type definitions for the core engine.
 */

import { db } from '@packages/db';

export interface AgentContext {
  executionId: string;
  projectId: string;
  metadata: Record<string, any>;
  budget?: {
    maxTokens: number;
  };
  history?: any[];
  getProjectId?: () => string;
  getExecutionId?: () => string;
  setAgentResult?: (...args: any[]) => void;
}

export interface AgentRequest {
  prompt: string;
  context: AgentContext;
  params: any;
}

export interface AgentResponse<T = any> {
  success: boolean;
  data: T;
  error?: string;
  tokens?: any;
  metrics?: {
    tokensTotal: number;
    durationMs: number;
  };
  logs?: any[];
}

export interface ProjectV1 {
  id: string;
  name: string;
  description?: string;
}

export interface ProjectFile {
  path: string;
  content: string;
}

export interface Mission {
  id: string;
  title: string;
  status: string;
  projectId: string;
}

export type TaskGraph = any;
export type BuildEvent = any;
