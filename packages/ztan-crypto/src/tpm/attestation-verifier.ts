import * as crypto from 'crypto';

export interface AttestationQuote {
  quoteBuffer: string; // Base64 encoded TPM2B_ATTEST structure
  signature: string; // Base64 encoded signature over the quote
  pcrValues: Record<number, string>; // PCR index to hex value map
}

export class AttestationVerifier {
  private akPublicKeyPem: string;

  constructor(akPublicKeyPem: string) {
    this.akPublicKeyPem = akPublicKeyPem;
  }

  /**
   * Verifies a TPM quote against a known Attestation Key, expected nonce, and expected PCR baseline.
   */
  public verifyQuote(quote: AttestationQuote, expectedNonce: string, expectedPcrValues: Record<number, string>): boolean {
    const quoteBytes = Buffer.from(quote.quoteBuffer, 'base64');
    const signatureBytes = Buffer.from(quote.signature, 'base64');

    // 1. Verify the cryptographic signature of the quote using the AK
    const isVerified = crypto.verify(
      'sha256',
      quoteBytes,
      this.akPublicKeyPem,
      signatureBytes
    );

    if (!isVerified) {
      console.error('[AttestationVerifier] Quote signature verification failed.');
      return false;
    }

    // 2. Parse the TPM2B_ATTEST structure (mocked here, in reality requires a TPM structure parser)
    // For Wave 2 Simulation, we assume the quoteBuffer contains a JSON payload 
    // wrapping the nonce and PCR digest for ease of testing without a full TPM parser library.
    interface ParsedQuote {
      nonce: string;
      pcrDigest: string;
    }
    let parsedQuote: ParsedQuote;
    try {
      parsedQuote = JSON.parse(quoteBytes.toString('utf8')) as ParsedQuote;
    } catch {
      console.error('[AttestationVerifier] Failed to parse quote buffer.');
      return false;
    }

    // 3. Verify the nonce
    if (parsedQuote.nonce !== expectedNonce) {
      console.error(`[AttestationVerifier] Nonce mismatch. Expected ${expectedNonce}, got ${parsedQuote.nonce}`);
      return false;
    }

    // 4. Verify PCR digest (In a real implementation, we hash the provided PCR values and compare)
    const computedDigest = this.computePcrDigest(quote.pcrValues);
    if (parsedQuote.pcrDigest !== computedDigest) {
      console.error('[AttestationVerifier] PCR Digest mismatch. Quote internally inconsistent!');
      return false;
    }

    // 5. Verify the actual PCR values match our expected baseline
    for (const [index, expectedVal] of Object.entries(expectedPcrValues)) {
      if (quote.pcrValues[Number(index)] !== expectedVal) {
        console.error(`[AttestationVerifier] PCR ${index} mismatch. Expected ${expectedVal}, got ${quote.pcrValues[Number(index)]}`);
        return false;
      }
    }

    console.log('[AttestationVerifier] TPM Quote successfully verified.');
    return true;
  }

  private computePcrDigest(pcrValues: Record<number, string>): string {
    const hash = crypto.createHash('sha256');
    // Sort keys to ensure consistent hashing
    const sortedIndices = Object.keys(pcrValues).map(Number).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      hash.update(Buffer.from(pcrValues[index], 'hex'));
    }
    return hash.digest('hex');
  }
}
