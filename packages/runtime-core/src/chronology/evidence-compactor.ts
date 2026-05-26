import fs from 'fs';
import path from 'path';

/**
 * ─── ZTAN Evidence Compactor & Tiering System ──────────────────────────────────
 * Implements data reduction heuristics for the Evidence Vault, mitigating
 * graph database scalability challenges and disk overhead.
 * ────────────────────────────────────────────────────────────────────────────
 */

export interface CompactorEvent {
  timestampIso: string;
  type: string;
  status: 'NOMINAL' | 'DEGRADED' | 'ANOMALOUS' | 'CRITICAL';
  details?: Record<string, any>;
}

export interface ReplayTrace {
  seqId: number;
  action: string;
  prevStatus: string;
  currentStatus: string;
  diverged: boolean;
  error?: string;
}

export class EvidenceCompactor {
  private vaultDir: string;
  private coldDir: string;

  constructor(workspaceRoot: string) {
    this.vaultDir = path.resolve(workspaceRoot, '.ztan', 'evidence-vault');
    this.coldDir = path.resolve(this.vaultDir, 'cold_archive');
  }

  /**
   * Collapses long linear chains of nominal events into a single summary event.
   */
  public causalityCollapseHeuristics(events: CompactorEvent[]): CompactorEvent[] {
    if (events.length === 0) return [];

    const collapsed: CompactorEvent[] = [];
    let currentNominalChain: CompactorEvent[] = [];

    for (const event of events) {
      if (event.status === 'NOMINAL') {
        currentNominalChain.push(event);
      } else {
        // Flush nominal chain before adding non-nominal event
        if (currentNominalChain.length > 0) {
          collapsed.push(this.collapseChain(currentNominalChain));
          currentNominalChain = [];
        }
        collapsed.push(event);
      }
    }

    if (currentNominalChain.length > 0) {
      collapsed.push(this.collapseChain(currentNominalChain));
    }

    return collapsed;
  }

  /**
   * Filters snapshots to retain boundary states and periodic sparse nominal points.
   */
  public forensicSamplingRules(snapshots: any[], sampleInterval: number = 5): any[] {
    if (snapshots.length <= 2) return [...snapshots];

    const sampled: any[] = [];
    sampled.push(snapshots[0]); // Always keep the initial state

    for (let i = 1; i < snapshots.length - 1; i++) {
      const snap = snapshots[i];
      const isAnomalous = snap.trustStatus !== 'VERIFIED' && snap.trustStatus !== 'NOMINAL';
      
      // Keep if anomalous or if it hits the sampling interval
      if (isAnomalous || (i % sampleInterval === 0)) {
        sampled.push(snap);
      }
    }

    sampled.push(snapshots[snapshots.length - 1]); // Always keep the final state
    return sampled;
  }

  /**
   * Performs retention tiering by moving old records from hot vault to cold archive.
   */
  public async retentionTiering(maxAgeMs: number = 24 * 60 * 60 * 1000): Promise<{ hotSize: number; coldSize: number; archivedCount: number }> {
    if (!fs.existsSync(this.vaultDir)) {
      return { hotSize: 0, coldSize: 0, archivedCount: 0 };
    }
    if (!fs.existsSync(this.coldDir)) {
      fs.mkdirSync(this.coldDir, { recursive: true });
    }

    const now = Date.now();
    const files = fs.readdirSync(this.vaultDir);
    let archivedCount = 0;
    const coldBundleData: Record<string, string> = {};

    for (const file of files) {
      const filePath = path.join(this.vaultDir, file);
      const stat = fs.statSync(filePath);

      if (stat.isDirectory()) continue;

      const isProtected = file.startsWith('incident-') || file.includes('protected');
      const age = now - stat.mtimeMs;

      if (!isProtected && age > maxAgeMs) {
        try {
          const content = fs.readFileSync(filePath, 'utf8');
          coldBundleData[file] = content;

          // Delete from hot vault
          fs.unlinkSync(filePath);
          archivedCount++;
        } catch (err) {
          console.error(`[EvidenceCompactor] Failed to archive ${file}:`, err);
        }
      }
    }

    let coldSize = 0;
    if (archivedCount > 0) {
      // Write to cold directory in a unified compact archive
      const archiveName = `archive-${now}.json`;
      const coldFilePath = path.join(this.coldDir, archiveName);
      fs.writeFileSync(coldFilePath, JSON.stringify(coldBundleData), 'utf8');
      coldSize = fs.statSync(coldFilePath).size;
    }

    // Calculate current hot size
    let hotSize = 0;
    const remainingFiles = fs.readdirSync(this.vaultDir);
    for (const file of remainingFiles) {
      const filePath = path.join(this.vaultDir, file);
      const stat = fs.statSync(filePath);
      if (!stat.isDirectory()) {
        hotSize += stat.size;
      }
    }

    return {
      hotSize,
      coldSize,
      archivedCount
    };
  }

  /**
   * Filters replay traces to keep only divergence boundaries, state transitions, and faults.
   */
  public replaySummarization(replayHistory: ReplayTrace[]): ReplayTrace[] {
    return replayHistory.filter(trace => {
      const isTransition = trace.prevStatus !== trace.currentStatus;
      return isTransition || trace.diverged || !!trace.error;
    });
  }

  // --- PRIVATE UTILITIES ---

  private collapseChain(chain: CompactorEvent[]): CompactorEvent {
    if (chain.length === 1) return chain[0];

    return {
      timestampIso: chain[0].timestampIso,
      type: 'CAUSAL_COLLAPSE_SUMMARY',
      status: 'NOMINAL',
      details: {
        collapsedCount: chain.length,
        endTimeIso: chain[chain.length - 1].timestampIso,
        eventTypes: Array.from(new Set(chain.map(e => e.type)))
      }
    };
  }
}
