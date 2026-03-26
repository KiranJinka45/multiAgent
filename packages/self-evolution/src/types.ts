export interface SystemMetrics {
  apiLatency: number;
  errorRate: number;
  cpuUsage?: number;
  memoryUsage?: number;
}

export interface SystemIssue {
  type: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  metadata?: any;
}

export interface RefactorPlan {
  issue: string;
  proposal: string;
  filesToModify: string[];
}
