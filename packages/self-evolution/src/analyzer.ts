import { SystemMetrics, SystemIssue } from './types';

export function analyzeSystem(metrics: SystemMetrics, logs: string[]): SystemIssue[] {
  const issues: SystemIssue[] = [];

  if (metrics.apiLatency > 1000) {
    issues.push({
      type: 'PERFORMANCE',
      description: 'High API latency detected (>1000ms)',
      severity: 'high',
      metadata: { latency: metrics.apiLatency }
    });
  }

  if (metrics.errorRate > 0.05) {
    issues.push({
      type: 'RELIABILITY',
      description: `High error rate detected: ${(metrics.errorRate * 100).toFixed(2)}%`,
      severity: 'critical',
      metadata: { errorRate: metrics.errorRate }
    });
  }

  const criticalLogPatterns = [
    { pattern: 'MODULE_NOT_FOUND', type: 'ARCHITECTURE', description: 'Broken imports detected' },
    { pattern: 'ECONNREFUSED', type: 'INFRASTRUCTURE', description: 'Connection refused errors detected' },
    { pattern: 'Out of memory', type: 'RESOURCE', description: 'Memory exhaustion detected' }
  ];

  for (const log of logs) {
    for (const { pattern, type, description } of criticalLogPatterns) {
      if (log.includes(pattern)) {
        issues.push({
          type,
          description,
          severity: 'high',
          metadata: { pattern, logSnippet: log.substring(0, 100) }
        });
      }
    }
  }

  return issues;
}
