import * as crypto from 'crypto';

/**
 * 🛡️ CanonicalReplayLayer
 * Ensures that all replay inputs are normalized and serialized deterministically.
 * Prevents "False Determinism" caused by unstable JSON ordering or provider noise.
 */
export class CanonicalReplayLayer {
  /**
   * Sorts and normalizes an object to ensure deterministic JSON serialization.
   */
  static canonicalize(obj: any): string {
    if (obj === null || typeof obj !== 'object') {
      return JSON.stringify(obj);
    }

    if (Array.isArray(obj)) {
      return '[' + obj.map(o => this.canonicalize(o)).join(',') + ']';
    }

    const keys = Object.keys(obj).sort();
    return '{' + keys.map(k => {
      return JSON.stringify(k) + ':' + this.canonicalize(obj[k]);
    }).join(',') + '}';
  }

  /**
   * Generates a deterministic hash for a set of mounts.
   */
  static hashMounts(mounts: ReadonlyArray<any>): string {
    const normalizedMounts = mounts.map(m => ({
      target: m.target,
      mode: m.mode,
      // Exclude host-specific volume IDs, only keep semantic intent
    }));
    return crypto.createHash('sha256')
      .update(this.canonicalize(normalizedMounts))
      .digest('hex');
  }

  /**
   * Generates a deterministic hash for a workload.
   */
  static hashWorkload(workload: any): string {
    const normalizedWorkload = {
      command: workload.command,
      args: workload.args || [],
      env: Object.entries(workload.env || {}).sort(([a], [b]) => a.localeCompare(b))
    };
    return crypto.createHash('sha256')
      .update(this.canonicalize(normalizedWorkload))
      .digest('hex');
  }

  /**
   * Normalizes execution results across providers to ensure semantic equivalence.
   * Strips provider-specific noise (Pod IDs, VM IDs, specific timestamps).
   */
  static normalizeResult(result: any): any {
    return {
      exitCode: result.exitCode,
      securityEvent: result.metadata?.securityEvent || null,
      // We don't hash stdout/stderr here as they can be non-deterministic (e.g. build timings)
      // but we do hash the "truth" of the execution outcome.
    };
  }
}
