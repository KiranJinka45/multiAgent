export interface ProjectionResult {
  tsRle: string;
  rustRle: string;
  isEqual: boolean;
  mismatchOffset: number | null;
  mismatchDetails?: string;
}

export class SemanticProjector {
  /**
   * Run-Length Encodes a state array of 'N' (Normal), 'S' (String), and 'E' (Escape).
   */
  public static compressRLE(states: string[]): string {
    if (states.length === 0) return '';
    let result = '';
    let current = states[0];
    let count = 1;
    for (let i = 1; i < states.length; i++) {
      if (states[i] === current) {
        count++;
      } else {
        result += `${current}${count}`;
        current = states[i];
        count = 1;
      }
    }
    result += `${current}${count}`;
    return result;
  }

  /**
   * Projects TypeScript token boundary snapshots to character-level state arrays.
   */
  public static projectTS(snapshots: any[], payload: string): string {
    const states = new Array(payload.length).fill('N');
    for (const snap of snapshots) {
      if (snap.metadata && snap.metadata.token_type === 'STRING') {
        const { start, end } = snap.metadata;
        for (let j = start; j < end; j++) {
          if (j < states.length) {
            states[j] = 'S';
          }
        }
        // Mark escapes inside the string range
        for (let j = start + 1; j < end - 1; j++) {
          if (payload[j] === '\\') {
            if (j < states.length) states[j] = 'E';
            if (j + 1 < states.length) states[j + 1] = 'E';
            j++; // skip next char as it is escaped
          }
        }
      }
    }
    return this.compressRLE(states);
  }

  /**
   * Projects Rust FSM escape and chunk boundary snapshots to character-level state arrays.
   */
  public static projectRust(snapshots: any[], payload: string): string {
    const escapeOffsets = new Set<number>();
    for (const snap of snapshots) {
      if (snap.metadata && (snap.metadata.escape_active === true || snap.metadata.escape_active === 'true')) {
        const offset = snap.metadata.bytes_processed - 1;
        escapeOffsets.add(offset);
      }
      if (snap.transition_reason === 'EscapeEnter' || snap.transition_reason === 'EscapeExit') {
        if (snap.metadata && typeof snap.metadata.bytes_processed === 'number') {
          const offset = snap.metadata.bytes_processed - 1;
          escapeOffsets.add(offset);
        }
      }
    }

    const states = new Array(payload.length).fill('N');
    let inString = false;
    let i = 0;
    const n = payload.length;

    while (i < n) {
      const char = payload[i];
      if (escapeOffsets.has(i)) {
        states[i] = 'E';
        i++;
        continue;
      }
      if (char === '"') {
        inString = !inString;
        states[i] = 'S';
      } else if (inString) {
        states[i] = 'S';
      }
      i++;
    }

    return this.compressRLE(states);
  }

  /**
   * Compares the RLE state vectors of TS and Rust.
   */
  public static compare(
    tsSnapshots: any[],
    rustSnapshots: any[],
    payload: string
  ): ProjectionResult {
    const tsRle = this.projectTS(tsSnapshots, payload);
    const rustRle = this.projectRust(rustSnapshots, payload);

    if (tsRle === rustRle) {
      return { tsRle, rustRle, isEqual: true, mismatchOffset: null };
    }

    // Identify first mismatch index
    const tsStates = this.decompressRLE(tsRle);
    const rustStates = this.decompressRLE(rustRle);
    const len = Math.max(tsStates.length, rustStates.length);
    let mismatchOffset = -1;

    for (let i = 0; i < len; i++) {
      if (tsStates[i] !== rustStates[i]) {
        mismatchOffset = i;
        break;
      }
    }

    const mismatchDetails = mismatchOffset !== -1 
      ? `State mismatch at index ${mismatchOffset} (char '${payload[mismatchOffset] ?? ''}'): TS='${tsStates[mismatchOffset]}', Rust='${rustStates[mismatchOffset]}'`
      : `Length mismatch: TS length ${tsStates.length}, Rust length ${rustStates.length}`;

    return {
      tsRle,
      rustRle,
      isEqual: false,
      mismatchOffset: mismatchOffset !== -1 ? mismatchOffset : null,
      mismatchDetails
    };
  }

  private static decompressRLE(rle: string): string[] {
    const states: string[] = [];
    const regex = /([NSE])(\d+)/g;
    let match;
    while ((match = regex.exec(rle)) !== null) {
      const char = match[1];
      const count = parseInt(match[2], 10);
      for (let i = 0; i < count; i++) {
        states.push(char);
      }
    }
    return states;
  }
}
