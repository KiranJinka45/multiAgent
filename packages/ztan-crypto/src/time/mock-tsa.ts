import * as crypto from 'crypto';

export interface TimeStampToken {
  payloadHash: string;
  authoritativeTime: number;
  signature: string;
}

/**
 * MockTSA (Time-Stamping Authority)
 * 
 * Query a real RFC 3161 Time-Stamp Authority (TSA) or fall back to simulation.
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
  public async generateTimeStampToken(payloadHash: string): Promise<TimeStampToken> {
    if (process.env.NODE_ENV === 'test') {
      const authoritativeTime = this.getAuthoritativeTime();
      const preimage = `${payloadHash}::${authoritativeTime}::TSA_SECRET`;
      const signature = crypto.createHash('sha256').update(preimage).digest('hex');
      return {
        payloadHash,
        authoritativeTime,
        signature
      };
    }

    try {
      const hashBuffer = Buffer.from(payloadHash, 'hex');

      // DER-encoded TimeStampReq template (size 56 bytes)
      const prefix = Buffer.from("30360201013031300d060960864801650304020105000420", "hex");
      const req = Buffer.concat([prefix, hashBuffer]);

      const response = await fetch('http://timestamp.digicert.com', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/timestamp-query',
        },
        body: req,
        // Short timeout to prevent blocking
        signal: AbortSignal.timeout(3000)
      });

      if (!response.ok) {
        throw new Error(`HTTP error ${response.status}: ${response.statusText}`);
      }

      const responseBuffer = Buffer.from(await response.arrayBuffer());

      let generalizedTimeStr = '';
      for (let i = 0; i < responseBuffer.length - 15; i++) {
        if (responseBuffer[i] === 0x18) {
          const len = responseBuffer[i + 1];
          if (len >= 13 && len <= 20) {
            const timeStr = responseBuffer.toString('ascii', i + 2, i + 2 + len);
            if (/^\d{14,19}Z$/.test(timeStr) || /^\d{14}\.\d+Z$/.test(timeStr)) {
              generalizedTimeStr = timeStr;
              break;
            }
          }
        }
      }

      if (!generalizedTimeStr) {
        throw new Error("Could not find GeneralizedTime tag in DER response");
      }

      const year = parseInt(generalizedTimeStr.substring(0, 4), 10);
      const month = parseInt(generalizedTimeStr.substring(4, 6), 10) - 1;
      const day = parseInt(generalizedTimeStr.substring(6, 8), 10);
      const hour = parseInt(generalizedTimeStr.substring(8, 10), 10);
      const minute = parseInt(generalizedTimeStr.substring(10, 12), 10);
      const second = parseInt(generalizedTimeStr.substring(12, 14), 10);

      let ms = 0;
      const dotIndex = generalizedTimeStr.indexOf('.');
      if (dotIndex !== -1) {
        const msStr = generalizedTimeStr.substring(dotIndex + 1, generalizedTimeStr.length - 1);
        ms = parseInt(msStr.padEnd(3, '0').substring(0, 3), 10);
      }

      const authoritativeTime = Date.UTC(year, month, day, hour, minute, second, ms);
      
      // Update offsetMs to sync local node clock offset relative to authoritative TSA clock
      this.offsetMs = authoritativeTime - Date.now();

      return {
        payloadHash,
        authoritativeTime,
        signature: responseBuffer.toString('hex')
      };
    } catch (err: any) {
      console.error(`[TSA] Remote TSA query failed: ${err.message}`);
      throw new Error(`TSAConnectionError: Remote TSA query failed: ${err.message}`);
    }
  }
}

export const tsa = new MockTSA();
