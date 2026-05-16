import { logger } from '@packages/observability';
import type { SREEvent, SREUpdate } from '@packages/contracts';

export interface LogAnomaly {
  severity: 'ERROR' | 'FATAL';
  message: string;
  source: string;
  count: number;
}

/**
 * LogAnalyzer: Scans service logs within an SREUpdate to find anomalous patterns.
 */
export class LogAnalyzer {
  private static ERROR_KEYWORDS = ['exception', 'error', 'failed', 'timeout', 'refused'];

  /**
   * Analyzes an SREUpdate for log-based anomalies.
   */
  public static async analyze(update: SREUpdate): Promise<LogAnomaly[]> {
    const anomalies: LogAnomaly[] = [];
    
    // Extract logs from events
    // @ts-ignore
    const logs = update.events?.filter((e: any) => e.type === 'LOG') || [];
    
    if (logs.length === 0) return [];

    const grouped: Record<string, LogAnomaly> = {};

    for (const log of logs) {
      const msg = log.desc.toLowerCase();
      if (this.ERROR_KEYWORDS.some(kw => msg.includes(kw))) {
        const key = `${log.type}:${log.severity}`;
        if (!grouped[key]) {
          grouped[key] = {
            severity: log.severity === 'CRITICAL' ? 'FATAL' : 'ERROR',
            message: log.desc,
            source: log.type,
            count: 0
          };
        }
        grouped[key].count++;
      }
    }

    return Object.values(grouped);
  }

  /**
   * Detects correlations between log anomalies and system-level RCAs.
   */
  public static correlate(anomalies: LogAnomaly[], events: SREEvent[]): boolean {
    const rcas = events.filter((e: any) => e.type === 'RCA');
    const actions = events.filter((e: any) => e.type === 'ACTION');

    if (rcas.length > 0 && anomalies.length > 0) {
      logger.info({ 
        anomalyCount: anomalies.length, 
        rcaCount: rcas.length 
      }, '[LOG-ANALYZER] Strong correlation between log errors and topological RCA');
      return true;
    }

    return false;
  }
}
