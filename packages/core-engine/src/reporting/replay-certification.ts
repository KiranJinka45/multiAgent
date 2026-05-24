import * as fs from 'fs';
import * as path from 'path';

export interface ReplayEventLog {
  workflowId: string;
  sequence: number;
  type: string;
  timestamp: number;
  payload: any;
}

export interface ReplaySession {
  workflowId: string;
  events: ReplayEventLog[];
  executionTimeMs: number;
}

export interface DriftEnvelope {
  reproducibilityRate: number; // 0.0 to 1.0
  driftScore: number;          // 0.0 to 100.0
  varianceMs: number;
  divergenceHotspots: string[];
}

export class HistoricalReplayCorpus {
  private corpusPath: string;
  private corpus: Map<string, ReplaySession> = new Map();

  constructor(corpusPath: string) {
    this.corpusPath = corpusPath;
    this.loadCorpus();
  }

  private loadCorpus(): void {
    try {
      if (fs.existsSync(this.corpusPath)) {
        const raw = fs.readFileSync(this.corpusPath, 'utf8');
        const list: ReplaySession[] = JSON.parse(raw);
        for (const session of list) {
          this.corpus.set(session.workflowId, session);
        }
      }
    } catch (err) {
      // Bounded fallback: if load fails, start with an empty corpus
      this.corpus.clear();
    }
  }

  public saveCorpus(): void {
    try {
      const list = Array.from(this.corpus.values());
      const dir = path.dirname(this.corpusPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      fs.writeFileSync(this.corpusPath, JSON.stringify(list, null, 2), 'utf8');
    } catch (err) {
      // Safe no-op on failure
    }
  }

  public register(session: ReplaySession): void {
    this.corpus.set(session.workflowId, session);
    this.saveCorpus();
  }

  public get(workflowId: string): ReplaySession | undefined {
    return this.corpus.get(workflowId);
  }

  public all(): ReplaySession[] {
    return Array.from(this.corpus.values());
  }
}

export class DriftEnvelopeAnalyzer {
  /**
   * Compares a live sequence against a recorded corpus baseline to detect drift.
   */
  static analyze(live: ReplayEventLog[], baseline: ReplayEventLog[]): { similarity: number; hotspots: string[] } {
    if (live.length === 0 || baseline.length === 0) {
      return { similarity: 0.0, hotspots: ['EMPTY_EVENT_LOG'] };
    }

    let matchCount = 0;
    const hotspots: string[] = [];
    const maxLen = Math.max(live.length, baseline.length);

    for (let i = 0; i < maxLen; i++) {
      const liveEv = live[i];
      const baseEv = baseline[i];

      if (!liveEv) {
        hotspots.push(`MISSING_LIVE_EVENT_AT_SEQ_${i}`);
        continue;
      }
      if (!baseEv) {
        hotspots.push(`EXTRA_LIVE_EVENT_AT_SEQ_${i}_TYPE_${liveEv.type}`);
        continue;
      }

      const typeMatch = liveEv.type === baseEv.type;
      const sequenceMatch = liveEv.sequence === baseEv.sequence;
      const payloadMatch = JSON.stringify(liveEv.payload) === JSON.stringify(baseEv.payload);

      if (typeMatch && sequenceMatch && payloadMatch) {
        matchCount++;
      } else {
        if (!typeMatch) hotspots.push(`EVENT_TYPE_MISMATCH_AT_SEQ_${i}_EXPECTED_${baseEv.type}_GOT_${liveEv.type}`);
        if (!payloadMatch && typeMatch) hotspots.push(`EVENT_PAYLOAD_MISMATCH_AT_SEQ_${i}_TYPE_${liveEv.type}`);
      }
    }

    return {
      similarity: matchCount / maxLen,
      hotspots,
    };
  }
}

export class ReplayVarianceRecorder {
  private timings: Map<string, number[]> = new Map();

  public record(workflowId: string, durationMs: number): void {
    if (!this.timings.has(workflowId)) {
      this.timings.set(workflowId, []);
    }
    this.timings.get(workflowId)!.push(durationMs);
  }

  public getVariance(workflowId: string): number {
    const list = this.timings.get(workflowId) ?? [];
    if (list.length <= 1) return 0;

    const mean = list.reduce((sum, t) => sum + t, 0) / list.length;
    const squaredDiffs = list.map(t => Math.pow(t - mean, 2));
    const variance = squaredDiffs.reduce((sum, d) => sum + d, 0) / list.length;

    return Math.sqrt(variance); // Return standard deviation
  }
}

export class ReplayCertificationHarness {
  private corpus: HistoricalReplayCorpus;
  private varianceRecorder: ReplayVarianceRecorder = new ReplayVarianceRecorder();

  constructor(corpusPath: string) {
    this.corpus = new HistoricalReplayCorpus(corpusPath);
  }

  /**
   * Certifies a workflow replay run against its recorded baseline.
   */
  public certify(liveSession: ReplaySession): DriftEnvelope {
    this.varianceRecorder.record(liveSession.workflowId, liveSession.executionTimeMs);
    const baseline = this.corpus.get(liveSession.workflowId);

    if (!baseline) {
      // First run: Register as baseline and certify with nominal determinism
      this.corpus.register(liveSession);
      return {
        reproducibilityRate: 1.0,
        driftScore: 0.0,
        varianceMs: 0,
        divergenceHotspots: [],
      };
    }

    // Compare live vs. baseline
    const { similarity, hotspots } = DriftEnvelopeAnalyzer.analyze(liveSession.events, baseline.events);
    const variance = this.varianceRecorder.getVariance(liveSession.workflowId);
    
    // Register latest for longitudinal corpus comparison if reproducibility is high
    if (similarity > 0.95) {
      this.corpus.register(liveSession);
    }

    return {
      reproducibilityRate: similarity,
      driftScore: Math.max(0, Math.min(100, Math.round((1.0 - similarity) * 100))),
      varianceMs: Math.round(variance),
      divergenceHotspots: hotspots,
    };
  }

  public getCorpus(): HistoricalReplayCorpus {
    return this.corpus;
  }
}
