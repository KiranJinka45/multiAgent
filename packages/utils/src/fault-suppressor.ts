import { logger } from '@packages/observability';

interface FaultWindow {
  firstSeen: number;
  lastSeen: number;
  count: number;
  logged: boolean;
  severity: string;
  partitions: Set<number | string>;
}

/**
 * ─── Fault-Window Log Suppressor ─────────────────────────────────────────────
 * Deduplicates repeated fault messages during sustained failures.
 * Instead of emitting identical error lines thousands of times,
 * it logs the first occurrence, then emits a suppression summary
 * when the fault window closes.
 *
 * Example output:
 *   [FaultSuppressor] DB unreachable (42 occurrences suppressed over 60s)
 * ─────────────────────────────────────────────────────────────────────────────
 */
class FaultSuppressor {
  private windows = new Map<string, FaultWindow>();
  private readonly windowMs = 60_000; // 60-second suppression window
  private flushInterval: NodeJS.Timeout;

  constructor() {
    this.flushInterval = setInterval(() => this.flush(), this.windowMs);
    if (this.flushInterval.unref) this.flushInterval.unref();
  }

  /**
   * Report a fault occurrence. First occurrence in a window is logged immediately.
   * Subsequent occurrences within the same window are suppressed and counted.
   * When the window expires, a summary is emitted.
   */
  report(faultKey: string, message: string, meta?: Record<string, unknown>): void {
    const severity = (meta?.severity as string) || 'error';
    const partition = meta?.partition as string | number;
    const compoundKey = `${faultKey}::${severity}`;
    
    const now = Date.now();
    const existing = this.windows.get(compoundKey);

    if (existing && (now - existing.firstSeen) < this.windowMs) {
      // Within active suppression window — count but don't log
      existing.count++;
      existing.lastSeen = now;
      if (partition !== undefined) existing.partitions.add(partition);
      
      if (!existing.logged) {
        logger[severity === 'warn' ? 'warn' : 'error'](meta ?? {}, message);
        existing.logged = true;
      }
      return;
    }

    // Window expired or new fault — emit summary for closed window, start new one
    if (existing && existing.count > 1) {
      const durationSec = Math.round((existing.lastSeen - existing.firstSeen) / 1000);
      logger.warn({
        faultKey,
        severity,
        suppressedCount: existing.count - 1,
        partitions: Array.from(existing.partitions),
        windowDurationMs: existing.lastSeen - existing.firstSeen
      }, `[FaultSuppressor] ${message} (${existing.count - 1} occurrences suppressed over ${durationSec}s across ${existing.partitions.size} partitions)`);
    }

    this.windows.set(compoundKey, {
      firstSeen: now,
      lastSeen: now,
      count: 1,
      logged: true,
      severity,
      partitions: new Set(partition !== undefined ? [partition] : [])
    });
    logger[severity === 'warn' ? 'warn' : 'error'](meta ?? {}, message);
  }

  /**
   * Flush expired fault windows and emit their suppression summaries.
   */
  private flush(): void {
    const now = Date.now();
    for (const [key, window] of this.windows) {
      if (now - window.lastSeen > this.windowMs) {
        if (window.count > 1) {
          logger.warn({ faultKey: key, severity: window.severity, partitions: Array.from(window.partitions), suppressedCount: window.count - 1 },
            `[FaultSuppressor] Fault window closed for '${key}': ${window.count - 1} occurrences suppressed across ${window.partitions.size} partitions`);
        }
        this.windows.delete(key);
      }
    }
  }

  /**
   * Clean shutdown: flush all remaining windows.
   */
  destroy(): void {
    clearInterval(this.flushInterval);
    this.flush();
  }
}

export const faultSuppressor = new FaultSuppressor();
