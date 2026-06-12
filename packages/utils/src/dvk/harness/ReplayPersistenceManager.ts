import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import type { ReplayTelemetryProfile } from './ReplayArtifactCollector.js';

export interface PersistenceOptions {
  compress?: boolean;
  batchThreshold?: number;
  retentionCeiling?: number;
  queueDelayMs?: number;
  memoryUsageBytes?: number;
  pressureCeilingMs?: number;
  enableAdaptiveShedding?: boolean;
  enableTopologySampling?: boolean;
}

export class ReplayPersistenceManager {
  private static buffer: any[] = [];
  private static dbPath = path.join(process.cwd(), 'replay_db.json');

  /**
   * Sets a custom database file path.
   */
  public static setDbPath(p: string): void {
    this.dbPath = p;
  }

  /**
   * Appends a new replay telemetry profile to the local file database,
   * supporting buffering, compression, and retention ceilings.
   */
  public static saveProfile(profile: ReplayTelemetryProfile, options?: PersistenceOptions): void {
    // 1. Observability Recursion Ceiling limit check (10MB)
    if (fs.existsSync(this.dbPath)) {
      try {
        const stats = fs.statSync(this.dbPath);
        if (stats.size >= 10 * 1024 * 1024) {
          console.warn(`[Persistence Governance] Observability Recursion Ceiling reached (DB size: ${(stats.size / 1024 / 1024).toFixed(2)} MB >= 10MB). Suppressing telemetry persist.`);
          return;
        }
      } catch (_err) {
        // Ignore stats check errors
      }
    }

    const startTime = performance.now();
    const processedProfile: any = JSON.parse(JSON.stringify(profile)); // Deep copy to prevent mutating in-memory collector

    // 2. Archaeology Prioritization Check
    const isFailureRun = 
      ['PROCESS_CRASH', 'TIMEOUT', 'MALFORMED_ARTIFACT', 'SNAPSHOT_OVERFLOW'].includes(profile.classification) ||
      profile.primary_artifacts?.infrastructure_failure !== undefined ||
      profile.secondary_artifacts?.infrastructure_failure !== undefined;

    let shedded = false;
    let sampled = false;

    // 3. Adaptive Shedding and Sampling under scheduler pressure (only for healthy runs)
    if (!isFailureRun) {
      const queueDelay = options?.queueDelayMs ?? 0;
      const ceiling = options?.pressureCeilingMs ?? 5000;

      if (options?.enableAdaptiveShedding && queueDelay > ceiling) {
        shedded = true;
        if (processedProfile.primary_artifacts) {
          processedProfile.primary_artifacts.snapshots = [];
        }
        if (processedProfile.secondary_artifacts) {
          processedProfile.secondary_artifacts.snapshots = [];
        }
        console.log(`[Persistence Governance] High queue pressure (${queueDelay} ms > ${ceiling} ms). Invoked Adaptive Write Shedding.`);
      } else if (options?.enableTopologySampling && queueDelay > ceiling / 2) {
        sampled = true;

        const filterSnapshots = (snapshots: any[]): any[] => {
          if (!snapshots || snapshots.length === 0) return [];
          const keepIndices = new Set<number>();

          const getEntropyAt = (snaps: any[], endIdx: number): number => {
            const start = Math.max(0, endIdx - 15);
            const len = endIdx - start + 1;
            const counts = new Map<string, number>();
            for (let i = start; i <= endIdx; i++) {
              const reason = snaps[i].transition_reason || 'unknown';
              counts.set(reason, (counts.get(reason) || 0) + 1);
            }
            let entropy = 0;
            for (const count of counts.values()) {
              const p = count / len;
              entropy -= p * Math.log2(p);
            }
            return entropy;
          };
          
          for (let idx = 0; idx < snapshots.length; idx++) {
            const snap = snapshots[idx];
            const prevSnap = idx > 0 ? snapshots[idx - 1] : undefined;
            
            const reason = snap.transition_reason || '';
            const isEscape = reason.includes('Escape') || reason.includes('escape') || snap.metadata?.escape_active === true || snap.metadata?.escape_active === 'true';
            const isRejectOrError = reason.includes('Reject') || reason.includes('reject') || reason.includes('error') || reason.includes('Error') || reason.includes('crash') || reason.includes('crashed') || reason.includes('timeout');
            const isDelimiter = snap.metadata?.value === '{' || snap.metadata?.value === '}' || snap.metadata?.value === '[' || snap.metadata?.value === ']' || ['LEFT_BRACE', 'RIGHT_BRACE', 'LEFT_BRACKET', 'RIGHT_BRACKET'].includes(snap.metadata?.token_type);
            
            const isStateChange = prevSnap && (
              snap.transition_reason !== prevSnap.transition_reason ||
              (snap.metadata?.parser_state && prevSnap.metadata?.parser_state && snap.metadata.parser_state !== prevSnap.metadata.parser_state)
            );
            
            const isCritical = isEscape || isRejectOrError || isDelimiter || isStateChange || reason === 'init' || reason === 'finalize';
            
            let pad = 3;
            if (idx >= 16) {
              const hCurr = getEntropyAt(snapshots, idx);
              const hPrev = getEntropyAt(snapshots, idx - 1);
              const acceleration = hCurr - hPrev;
              if (acceleration > 0.35) {
                pad = 6;
              }
            }

            if (isCritical) {
              const start = Math.max(0, idx - pad);
              const end = Math.min(snapshots.length - 1, idx + pad);
              for (let j = start; j <= end; j++) {
                keepIndices.add(j);
              }
            }
          }
          
          for (let idx = 0; idx < snapshots.length; idx++) {
            if (idx % 16 === 0) {
              keepIndices.add(idx);
            }
          }
          
          const sorted = Array.from(keepIndices).sort((a, b) => a - b);
          return sorted.map(i => snapshots[i]);
        };

        if (processedProfile.primary_artifacts?.snapshots) {
          processedProfile.primary_artifacts.snapshots = filterSnapshots(processedProfile.primary_artifacts.snapshots);
        }
        if (processedProfile.secondary_artifacts?.snapshots) {
          processedProfile.secondary_artifacts.snapshots = filterSnapshots(processedProfile.secondary_artifacts.snapshots);
        }
        console.log(`[Persistence Governance] Moderate queue pressure (${queueDelay} ms). Invoked Adaptive Archaeology Density.`);
      }
    } else {
      console.log(`[Persistence Governance] Sabotaged or collapsed run detected (${profile.classification}). Archaeology Prioritization active: bypassing telemetry degradation.`);
    }

    let telemetryConfidence = 1.0;
    if (shedded) {
      telemetryConfidence = 0.0;
    } else if (sampled) {
      let rawEdgesSum = 0;
      let intersectedEdgesSum = 0;

      const computeEdgesWithFrequency = (snaps: any[]): Map<string, number> => {
        const edges = new Map<string, number>();
        for (let i = 1; i < snaps.length; i++) {
          const prev = snaps[i - 1];
          const curr = snaps[i];
          const prevNode = prev.metadata?.parser_state || prev.transition_reason || 'unknown';
          const currNode = curr.metadata?.parser_state || curr.transition_reason || 'unknown';
          const edge = `${prevNode}->${currNode}`;
          edges.set(edge, (edges.get(edge) || 0) + 1);
        }
        return edges;
      };

      if (profile.primary_artifacts?.snapshots && processedProfile.primary_artifacts?.snapshots) {
        const rawEdges = computeEdgesWithFrequency(profile.primary_artifacts.snapshots);
        const retainedEdges = computeEdgesWithFrequency(processedProfile.primary_artifacts.snapshots);
        for (const [edge, rawFreq] of rawEdges.entries()) {
          rawEdgesSum += rawFreq;
          const retainedFreq = retainedEdges.get(edge) || 0;
          intersectedEdgesSum += Math.min(rawFreq, retainedFreq);
        }
      }

      if (profile.secondary_artifacts?.snapshots && processedProfile.secondary_artifacts?.snapshots) {
        const rawEdges = computeEdgesWithFrequency(profile.secondary_artifacts.snapshots);
        const retainedEdges = computeEdgesWithFrequency(processedProfile.secondary_artifacts.snapshots);
        for (const [edge, rawFreq] of rawEdges.entries()) {
          rawEdgesSum += rawFreq;
          const retainedFreq = retainedEdges.get(edge) || 0;
          intersectedEdgesSum += Math.min(rawFreq, retainedFreq);
        }
      }

      telemetryConfidence = rawEdgesSum > 0 ? intersectedEdgesSum / rawEdgesSum : 1.0;
    }


    let rawBytes = 0;
    let compressedBytes = 0;
    let compressionRatio = 1.0;

    if (options?.compress && !shedded) {
      // Compress primary snapshots
      if (processedProfile.primary_artifacts?.snapshots && processedProfile.primary_artifacts.snapshots.length > 0) {
        const primRaw = JSON.stringify(processedProfile.primary_artifacts.snapshots);
        rawBytes += Buffer.byteLength(primRaw, 'utf-8');
        const primComp = zlib.gzipSync(Buffer.from(primRaw, 'utf-8'));
        compressedBytes += primComp.length;
        processedProfile.primary_artifacts = {
          ...processedProfile.primary_artifacts,
          snapshots: [], // clear raw snapshots array
          snapshots_compressed: primComp.toString('base64'),
        };
      }
      // Compress secondary snapshots
      if (processedProfile.secondary_artifacts?.snapshots && processedProfile.secondary_artifacts.snapshots.length > 0) {
        const secRaw = JSON.stringify(processedProfile.secondary_artifacts.snapshots);
        rawBytes += Buffer.byteLength(secRaw, 'utf-8');
        const secComp = zlib.gzipSync(Buffer.from(secRaw, 'utf-8'));
        compressedBytes += secComp.length;
        processedProfile.secondary_artifacts = {
          ...processedProfile.secondary_artifacts,
          snapshots: [], // clear raw snapshots array
          snapshots_compressed: secComp.toString('base64'),
        };
      }

      compressionRatio = rawBytes > 0 && compressedBytes > 0 ? rawBytes / compressedBytes : 1.0;
    }

    const elapsed = performance.now() - startTime;

    processedProfile.persistence_metrics = {
      raw_bytes: rawBytes,
      compressed_bytes: compressedBytes,
      compression_ratio: compressionRatio,
      processing_time_ms: elapsed,
      shedded,
      sampled,
      telemetry_confidence: telemetryConfidence,
    };

    if (options?.batchThreshold && options.batchThreshold > 1) {
      this.buffer.push(processedProfile);
      if (this.buffer.length >= options.batchThreshold) {
        this.flush(options.retentionCeiling);
      }
    } else {
      this.writeToDb([processedProfile], options?.retentionCeiling);
    }
  }

  /**
   * Commits any buffered records to disk.
   */
  public static flush(retentionCeiling?: number): void {
    if (this.buffer.length > 0) {
      this.writeToDb(this.buffer, retentionCeiling);
      this.buffer = [];
    }
  }

  /**
   * Writes the profiles list to the database, enforcing retention ceilings.
   */
  private static writeToDb(newProfiles: any[], retentionCeiling?: number): void {
    let db: any[] = [];
    if (fs.existsSync(this.dbPath)) {
      try {
        db = JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
        if (!Array.isArray(db)) {
          db = [];
        }
      } catch {
        db = [];
      }
    }

    db.push(...newProfiles);

    if (retentionCeiling && retentionCeiling > 0 && db.length > retentionCeiling) {
      db = db.slice(db.length - retentionCeiling);
    }

    fs.writeFileSync(this.dbPath, JSON.stringify(db, null, 2), 'utf-8');
  }

  /**
   * Retrieves all saved telemetry profiles.
   */
  public static loadAllProfiles(): any[] {
    if (!fs.existsSync(this.dbPath)) {
      return [];
    }
    try {
      return JSON.parse(fs.readFileSync(this.dbPath, 'utf-8'));
    } catch {
      return [];
    }
  }

  /**
   * Resets the file database.
   */
  public static clear(): void {
    this.buffer = [];
    if (fs.existsSync(this.dbPath)) {
      try {
        fs.unlinkSync(this.dbPath);
      } catch {}
    }
  }
}
