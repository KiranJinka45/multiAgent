import * as crypto from 'crypto';

export class TPMQuoteGenerator {
  private mockPcrState: Record<number, string>;
  private akPrivateKeyPem: string;
  private akPublicKeyPem: string;

  constructor() {
    // Generate an ephemeral Attestation Key pair for simulation
    const { publicKey, privateKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' }
    });

    this.akPrivateKeyPem = privateKey;
    this.akPublicKeyPem = publicKey;

    // Simulate standard PCR values (e.g., all zeros or baseline hashes)
    this.mockPcrState = {
      // Hardware baseline (UEFI/Secure Boot)
      0: crypto.createHash('sha256').update('fw-baseline').digest('hex'),
      7: crypto.createHash('sha256').update('secure-boot-keys').digest('hex'),
      // Initially, IMA measurement list might be empty or a default state
      10: crypto.createHash('sha256').update('ima-measurement-list').digest('hex')
    };
  }

  /**
   * Binds an execution image digest into the hardware PCR 10.
   */
  public setIMA_PCR10(digest: string) {
    this.mockPcrState[10] = crypto.createHash('sha256').update(digest).digest('hex');
  }

  public getPublicKey(): string {
    return this.akPublicKeyPem;
  }

  /**
   * Generates a TPM Quote over the current PCR state and provided nonce.
   */
  public generateQuote(nonce: string, pcrIndices: number[] = [0, 7, 10]) {
    // Collect the requested PCR values
    const pcrValues: Record<number, string> = {};
    for (const index of pcrIndices) {
      if (!this.mockPcrState[index]) {
        throw new Error(`[QuoteGenerator] PCR ${index} not available`);
      }
      pcrValues[index] = this.mockPcrState[index];
    }

    // Compute the digest of the collected PCRs
    const pcrDigest = this.computePcrDigest(pcrValues);

    // Mock TPM2B_ATTEST structure as a JSON object
    const tpm2bAttest = {
      magic: 'FF544347', // TPM_GENERATED_VALUE
      type: 'TPM_ST_ATTEST_QUOTE',
      nonce: nonce,
      pcrDigest: pcrDigest
    };

    const quoteBuffer = Buffer.from(JSON.stringify(tpm2bAttest), 'utf8');

    // Cryptographically sign the quote with the AK
    const sign = crypto.createSign('sha256');
    sign.update(quoteBuffer);
    sign.end();
    const signature = sign.sign(this.akPrivateKeyPem);

    return {
      quoteBuffer: quoteBuffer.toString('base64'),
      signature: signature.toString('base64'),
      pcrValues
    };
  }

  /**
   * Intentionally corrupts a PCR to test fail states.
   */
  public injectPcrTampering(pcrIndex: number) {
    console.warn(`[QuoteGenerator] WARNING: Tampering with PCR ${pcrIndex}`);
    this.mockPcrState[pcrIndex] = crypto.createHash('sha256').update('evil-rootkit').digest('hex');
  }

  private computePcrDigest(pcrValues: Record<number, string>): string {
    const hash = crypto.createHash('sha256');
    const sortedIndices = Object.keys(pcrValues).map(Number).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      hash.update(Buffer.from(pcrValues[index], 'hex'));
    }
    return hash.digest('hex');
  }
}
