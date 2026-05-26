import * as fs from 'fs';
import * as path from 'path';

export interface IncidentRecord {
  incidentId: string;
  timestamp: number;
  anomalyFingerprint: string;
  workflowId: string;
  errorStack: string;
  reproductionSteps: string[];
}

export interface RecoveryScoreReport {
  incidentId: string;
  mttrMs: number;
  stepsCount: number;
  ambiguityPoints: number;
  laborEfficiencyIndex: number; // 0.0 to 100.0 (Higher is better)
  rating: 'EXCELLENT' | 'ADEQUATE' | 'INEFFICIENT';
}

export class AnomalyFingerprinter {
  /**
   * Generates a deterministic cryptographic-like hash based on failure patterns.
   */
  static generateFingerprint(stackTrace: string): string {
    if (!stackTrace) return 'GENERIC_UNSPECIFIED_ANOMALY';
    
    // Extract key lines or exception class name from stack trace
    const firstLine = stackTrace.split('\n')[0] ?? '';
    const cleanPattern = firstLine.replace(/[^a-zA-Z0-9_]/g, '_').toUpperCase();
    
    let hash = 0;
    for (let i = 0; i < stackTrace.length; i++) {
      const char = stackTrace.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `ANOMALY_${cleanPattern}_${Math.abs(hash).toString(16)}`;
  }
}

export class IncidentReplayCatalog {
  private archivePath: string;

  constructor(archivePath: string) {
    this.archivePath = archivePath;
  }

  /**
   * Registers a failed operational execution event in the persistent intelligence store.
   */
  public registerIncident(
    workflowId: string,
    errorStack: string,
    reproductionSteps: string[]
  ): IncidentRecord {
    const fingerprint = AnomalyFingerprinter.generateFingerprint(errorStack);
    const incidentId = `INCIDENT-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    const record: IncidentRecord = {
      incidentId,
      timestamp: Date.now(),
      anomalyFingerprint: fingerprint,
      workflowId,
      errorStack,
      reproductionSteps,
    };

    try {
      if (!fs.existsSync(this.archivePath)) {
        fs.mkdirSync(this.archivePath, { recursive: true });
      }
      const file = path.join(this.archivePath, `incident_${incidentId}.json`);
      fs.writeFileSync(file, JSON.stringify(record, null, 2), 'utf8');
    } catch (err) {
      // Safe no-op
    }

    return record;
  }

  public listIncidents(): IncidentRecord[] {
    if (!fs.existsSync(this.archivePath)) return [];
    try {
      const files = fs.readdirSync(this.archivePath);
      return files
        .filter(f => f.startsWith('incident_') && f.endsWith('.json'))
        .map(f => {
          const raw = fs.readFileSync(path.join(this.archivePath, f), 'utf8');
          return JSON.parse(raw);
        });
    } catch (err) {
      return [];
    }
  }
}

export class RecoveryEffectivenessScorer {
  /**
   * Evaluates manual recovery drills against standard labor curves.
   */
  static score(incidentId: string, mttrMs: number, stepsCount: number, ambiguityPoints: number): RecoveryScoreReport {
    // Labor Efficiency Index is scored starting from 100, penalizing long duration and operator confusion:
    const mttrPenalty = Math.min(40, (mttrMs / 60000) * 10); // 10 points per minute of MTTR
    const ambiguityPenalty = ambiguityPoints * 5; // 5 points per confusion event
    const stepsPenalty = Math.max(0, (stepsCount - 4) * 3); // nominal recovery steps count is 4

    const laborEfficiencyIndex = Math.max(0, Math.round(100 - mttrPenalty - ambiguityPenalty - stepsPenalty));

    let rating: RecoveryScoreReport['rating'] = 'EXCELLENT';
    if (laborEfficiencyIndex < 60) {
      rating = 'INEFFICIENT';
    } else if (laborEfficiencyIndex < 85) {
      rating = 'ADEQUATE';
    }

    return {
      incidentId,
      mttrMs,
      stepsCount,
      ambiguityPoints,
      laborEfficiencyIndex,
      rating,
    };
  }
}
