// ZTAN Mathematically Rigorous Hybrid Logical Clock (HLC) Implementation (v1.0.0-LTS)
// Refines logical timeline sequence ordering by combining physical time tracking with logical counters.

export interface HlcState {
  l: number; // Highest physical timestamp seen so far (milliseconds)
  c: number; // Logical counter for concurrent events under the same physical tick
}

export class HybridLogicalClock {
  private l: number;
  private c: number;

  constructor(l = 0, c = 0) {
    this.l = l;
    this.c = c;
  }

  public getPhysical(): number {
    return this.l;
  }

  public getLogical(): number {
    return this.c;
  }

  public getState(): HlcState {
    return { l: this.l, c: this.c };
  }

  /**
   * Updates HLC state upon generating a local transaction event.
   */
  public incrementLocal(physicalTime: number): HlcState {
    const lOld = this.l;
    this.l = Math.max(lOld, physicalTime);
    
    if (this.l === lOld) {
      this.c += 1;
    } else {
      this.c = 0;
    }
    
    return this.getState();
  }

  /**
   * Updates HLC state upon receiving a remote frame event.
   */
  public updateReceive(remoteL: number, remoteC: number, physicalTime: number): HlcState {
    const lOld = this.l;
    this.l = Math.max(lOld, remoteL, physicalTime);

    if (this.l === lOld && this.l === remoteL) {
      this.c = Math.max(this.c, remoteC) + 1;
    } else if (this.l === lOld) {
      this.c += 1;
    } else if (this.l === remoteL) {
      this.c = remoteC + 1;
    } else {
      this.c = 0;
    }

    return this.getState();
  }

  public toString(): string {
    return `${this.l}:${this.c}`;
  }

  /**
   * Stably parses HLC state from a standard string format 'l:c'.
   */
  public static parse(hlcString: string): HybridLogicalClock {
    const parts = hlcString.split(':');
    if (parts.length !== 2) {
      return new HybridLogicalClock(0, 0);
    }
    return new HybridLogicalClock(parseInt(parts[0], 10), parseInt(parts[1], 10));
  }

  /**
   * Strictly compares two HLC clocks, returning -1, 0, or 1.
   * Enables strict total causal ordering.
   */
  public static compare(a: HlcState, b: HlcState): number {
    if (a.l !== b.l) {
      return a.l - b.l;
    }
    return a.c - b.c;
  }
}
