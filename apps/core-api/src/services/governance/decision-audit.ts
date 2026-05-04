import { logger } from '@packages/observability';

export interface AuditRecord {
  timestamp: number;
  anomalyScore: number;
  burnRate: number;
  decision: string;
  hasQuorum: boolean;
  rationale: string;
  metadata?: any;
}

/**
 * DecisionAudit: Maintains a historical record of all autonomous decisions.
 * Essential for incident post-mortems and trust validation.
 */
export class DecisionAudit {
  private logs: AuditRecord[] = [];
  private readonly MAX_LOGS = 1000;

  public record(entry: AuditRecord) {
    this.logs.push(entry);
    if (this.logs.length > this.MAX_LOGS) {
      this.logs.shift();
    }
    logger.debug({ decision: entry.decision }, '[AUDIT] Decision logged');
  }

  public getRecent(count: number = 50) {
    return this.logs.slice(-count);
  }
}

export const decisionAudit = new DecisionAudit();
