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

    // 2. Parse the TPM2B_ATTEST structure
    interface ParsedQuote {
      nonce: string;
      pcrDigest: string;
    }
    let parsedQuote: ParsedQuote;

    try {
      parsedQuote = this.decodeTPM2BAttest(quoteBytes);
    } catch (err: any) {
      console.error(`[AttestationVerifier] Failed to parse binary quote buffer: ${err.message}`);
      return false;
    }

    // 3. Verify the nonce
    if (parsedQuote.nonce !== expectedNonce) {
      console.error(`[AttestationVerifier] Nonce mismatch. Expected ${expectedNonce}, got ${parsedQuote.nonce}`);
      return false;
    }

    // 4. Verify PCR digest
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

  private decodeTPM2BAttest(buffer: Buffer): { nonce: string; pcrDigest: string } {
    let offset = 0;
    if (buffer.length < 2) {
      throw new Error('Buffer too small for TPM2B_ATTEST size');
    }
    const size = buffer.readUInt16BE(offset);
    offset += 2;

    if (buffer.length < 2 + size) {
      throw new Error(`Buffer size mismatch. Expected at least ${2 + size} bytes, got ${buffer.length}`);
    }

    // Read magic (4 bytes): TPM_GENERATED_VALUE = 0xFF544D00
    const magic = buffer.readUInt32BE(offset);
    offset += 4;
    if (magic !== 0xFF544D00) {
      throw new Error(`Invalid TPM magic: ${magic.toString(16)}`);
    }

    // Read type (2 bytes): TPM_ST_ATTEST_QUOTE = 0x8018
    const type = buffer.readUInt16BE(offset);
    offset += 2;
    if (type !== 0x8018) {
      throw new Error(`Invalid TPM attest type: ${type.toString(16)}`);
    }

    // Read qualifiedSigner (TPM2B_NAME)
    const signerSize = buffer.readUInt16BE(offset);
    offset += 2 + signerSize;

    // Read extraData / nonce (TPM2B_DATA)
    const nonceSize = buffer.readUInt16BE(offset);
    offset += 2;
    const nonce = buffer.toString('utf8', offset, offset + nonceSize);
    offset += nonceSize;

    // Read clockInfo (17 bytes)
    offset += 17;

    // Read firmwareVersion (8 bytes)
    offset += 8;

    // Read TPMS_QUOTE_INFO:
    // pcrSelect (TPML_PCR_SELECTION): count (4 bytes)
    const count = buffer.readUInt32BE(offset);
    offset += 4;

    for (let i = 0; i < count; i++) {
      const hashAlg = buffer.readUInt16BE(offset);
      const sizeOfSelect = buffer.readUInt8(offset + 2);
      offset += 3 + sizeOfSelect;
    }

    // Read pcrDigest (TPM2B_DIGEST)
    const digestSize = buffer.readUInt16BE(offset);
    offset += 2;
    const pcrDigest = buffer.toString('hex', offset, offset + digestSize);
    offset += digestSize;

    return { nonce, pcrDigest };
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
