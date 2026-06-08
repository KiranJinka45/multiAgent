import { SemanticObjectProjector } from './SemanticObjectProjector.js';

export class RoundtripSemanticStabilizer {
  /**
   * Normalizes and stabilizes JSON strings to enforce roundtrip invariants.
   */
  public static stabilizeRoundtrip(rawJson: string): string {
    if (!rawJson || !rawJson.trim()) return '';

    // 1. Normalize escaped slashes: \/ to /
    const normalized = rawJson.replace(/\\\//g, '/');

    // 2. Normalize JSON trailing zeros, scientific notations, sparse arrays, and dates via parsing
    try {
      const parsed = JSON.parse(normalized);
      const stabilizedObj = this.normalizeValue(parsed);
      return JSON.stringify(stabilizedObj);
    } catch (_err) {
      // If parsing fails (e.g. truncated or malformed JSON), return the partially normalized string
      return normalized;
    }
  }

  private static normalizeValue(val: any): any {
    if (val === null) return null;
    if (val === undefined) return null;

    if (Array.isArray(val)) {
      // Sparse arrays: convert empty/missing slots to null
      const arr: any[] = [];
      for (let i = 0; i < val.length; i++) {
        arr.push(this.normalizeValue(val[i]));
      }
      return arr;
    }

    if (typeof val === 'object') {
      // Handle Date object if it has a custom serialization
      if (val instanceof Date) {
        return val.toISOString();
      }
      // Sort object keys to preserve canonical order
      const keys = Object.keys(val).sort();
      const obj: Record<string, any> = {};
      for (const key of keys) {
        obj[key] = this.normalizeValue(val[key]);
      }
      return obj;
    }

    if (typeof val === 'number') {
      if (Number.isNaN(val)) return 'NaN';
      if (!Number.isFinite(val)) return val > 0 ? 'Infinity' : '-Infinity';
      // Canonicalize negative zero
      if (Object.is(val, -0)) return 0;
      return val; // JS converts e.g. 4.0 -> 4, and 1.0e+2 -> 100
    }

    if (typeof val === 'string') {
      // Unpaired surrogate repair
      const repaired = this.repairUnpairedSurrogates(val);
      // Date canonicalization: check if it matches date pattern and normalize to strict ISO
      if (/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/.test(repaired)) {
        const time = Date.parse(repaired);
        if (!isNaN(time)) {
          return new Date(time).toISOString();
        }
      }
      // Normalize Unicode to NFC
      return repaired.normalize('NFC');
    }

    return val;
  }

  private static repairUnpairedSurrogates(str: string): string {
    return str.replace(/[\uD800-\uDBFF](?![\uDC00-\uDFFF])|([^\uD800-\uDBFF]|^)[\uDC00-\uDFFF]/g, (match, p1) => {
      return p1 ? p1 + '\uFFFD' : '\uFFFD';
    });
  }
}
