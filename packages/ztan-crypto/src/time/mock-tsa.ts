import * as crypto from 'crypto';

export interface TimeStampToken {
  payloadHash: string;
  authoritativeTime: number;
  signature: string;
}

/**
 * MockTSA (Time-Stamping Authority)
 * 
 * Simulates an RFC 3161 compliant hardware clock service.
 */
export class MockTSA {
  private offsetMs = 0;

  /**
   * For testing: forces the TSA to simulate a time offset (drift)
   */
  public simulateDrift(offsetMs: number) {
    this.offsetMs = offsetMs;
  }

  /**
   * Returns the exact, authoritative cryptographic time.
   */
  public getAuthoritativeTime(): number {
    return Date.now() + this.offsetMs;
  }

  /**
   * Generates a cryptographic Time-Stamp Token (TST) over a payload hash.
   */
  public generateTimeStampToken(payloadHash: string): TimeStampToken {
    const authoritativeTime = this.getAuthoritativeTime();
    
    // Simulate TSA cryptographic signature binding the hash to the time
    const preimage = `${payloadHash}::${authoritativeTime}::TSA_SECRET`;
    const signature = crypto.createHash('sha256').update(preimage).digest('hex');

    return {
      payloadHash,
      authoritativeTime,
      signature
    };
  }
}

export const tsa = new MockTSA();
