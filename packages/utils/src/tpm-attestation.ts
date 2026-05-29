import * as crypto from 'node:crypto';
import * as fs from 'node:fs';
import { logger } from '@packages/observability';

// Secure Measured Boot "Gold" PCR measurements
export const GOLDEN_PCRS = {
  0: 'f2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3', // Firmware
  4: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890', // OS Kernel
  8: '11223344556677889900aabbccddeeff11223344556677889900aabbccddeeff', // Seccomp / Isolation State
};

// Compromised PCR measurements for error scenario simulation
export const COMPROMISED_PCRS = {
  0: 'f2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2g3',
  4: 'a1b2c3d4e5f67890abcdef1234567890abcdef1234567890abcdef1234567890',
  8: '0000000000000000000000000000000000000000000000000000000000000000', // Uninitialized / Disabled isolation
};

interface TpmQuotePayload {
  pcr0: string;
  pcr4: string;
  pcr8: string;
  nonce: string;
  status: 'SECURE' | 'COMPROMISED';
  timestamp: number;
}

export class TpmAttestationService {
  private static akKeyPair: { publicKey: string; privateKey: string } | null = null;
  private static simulatedPcrs = { ...GOLDEN_PCRS };
  private static forceStatus: 'SECURE' | 'COMPROMISED' = 'SECURE';

  /**
   * Initializes the TPM Attestation Key (AK).
   */
  public static getOrCreateAK(): { publicKey: string; privateKey: string } {
    if (this.akKeyPair) {
      return this.akKeyPair;
    }

    // Generate a secure NIST P-256 key pair to simulate the TPM AK
    const { publicKey, privateKey } = crypto.generateKeyPairSync('ec', {
      namedCurve: 'prime256v1',
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });

    this.akKeyPair = { publicKey, privateKey };
    return this.akKeyPair;
  }

  /**
   * Overrides current PCR values for testing/simulation.
   */
  public static setSimulatedPcrs(pcrs: { 0: string; 4: string; 8: string }, status: 'SECURE' | 'COMPROMISED' = 'SECURE') {
    this.simulatedPcrs = { ...pcrs };
    this.forceStatus = status;
    logger.info({ status, pcrs }, '[TPM] TPM simulated PCR values modified.');
  }

  /**
   * Resets simulated PCRs back to the golden boot measurements.
   */
  public static resetToGoldenState() {
    this.simulatedPcrs = { ...GOLDEN_PCRS };
    this.forceStatus = 'SECURE';
    logger.info('[TPM] TPM simulated PCR values reset to golden state.');
  }

  /**
   * Fetches the active PCR registers.
   */
  public static getPCRs(): { 0: string; 4: string; 8: string } {
    // If running on a hardened Linux node, we would ideally read from /sys/class/tpm/tpm0/...
    // Since we are in Hardware Simulation Mode, we fetch from our virtual registers.
    return { ...this.simulatedPcrs };
  }

  /**
   * Generates a signed quote over specific PCR registers.
   * @param nonce Cryptographic nonce provided by the challenger
   * @returns Base64 encoded JSON string representing the TPM quote envelope
   */
  public static generateQuote(nonce: string): string {
    const pcrs = this.getPCRs();
    const { privateKey } = this.getOrCreateAK();

    const payload: TpmQuotePayload = {
      pcr0: pcrs[0],
      pcr4: pcrs[4],
      pcr8: pcrs[8],
      nonce,
      status: this.forceStatus,
      timestamp: Date.now(),
    };

    // Serialize payload canonically (JCS-like ordering)
    const serializedPayload = JSON.stringify(payload);

    // Sign the payload using the TPM AK private key
    const signer = crypto.createSign('sha256');
    signer.update(serializedPayload);
    signer.end();
    const signature = signer.sign(privateKey, 'base64');

    // Package the full quote envelope
    const envelope = {
      payload: serializedPayload,
      signature,
      akPublicKey: this.akKeyPair?.publicKey,
    };

    return Buffer.from(JSON.stringify(envelope)).toString('base64');
  }

  /**
   * Verifies a TPM quote envelope.
   * @param quoteBase64 Base64 encoded TPM quote envelope
   * @param expectedNonce Expected nonce to prevent replay attacks
   * @returns boolean indicating whether the quote signature is valid and boot PCRs match golden measurements
   */
  public static verifyQuote(quoteBase64: string, expectedNonce?: string): boolean {
    try {
      if (!quoteBase64) {
        logger.error('[TPM] Quote verification failed: quote is missing.');
        return false;
      }

      const rawJson = Buffer.from(quoteBase64, 'base64').toString('utf8');
      const envelope = JSON.parse(rawJson);

      if (!envelope.payload || !envelope.signature || !envelope.akPublicKey) {
        logger.error('[TPM] Quote verification failed: invalid envelope format.');
        return false;
      }

      // Verify AK signature
      const verifier = crypto.createVerify('sha256');
      verifier.update(envelope.payload);
      verifier.end();

      const isSignatureValid = verifier.verify(envelope.akPublicKey, envelope.signature, 'base64');
      if (!isSignatureValid) {
        logger.error('[TPM] Quote verification failed: cryptographic signature mismatch.');
        return false;
      }

      const payload: TpmQuotePayload = JSON.parse(envelope.payload);

      // Verify Nonce if requested
      if (expectedNonce && payload.nonce !== expectedNonce) {
        logger.error({ expected: expectedNonce, got: payload.nonce }, '[TPM] Quote verification failed: nonce mismatch.');
        return false;
      }

      if (payload.status === 'COMPROMISED') {
        logger.error('[TPM] Quote verification failed: status flag is COMPROMISED.');
        return false;
      }

      // Verify PCR values against Golden measurements
      if (payload.pcr0 !== GOLDEN_PCRS[0]) {
        logger.error({ expected: GOLDEN_PCRS[0], got: payload.pcr0 }, '[TPM] PCR 0 validation failed: unauthorized firmware state.');
        return false;
      }
      if (payload.pcr4 !== GOLDEN_PCRS[4]) {
        logger.error({ expected: GOLDEN_PCRS[4], got: payload.pcr4 }, '[TPM] PCR 4 validation failed: unauthorized kernel or bootloader state.');
        return false;
      }
      if (payload.pcr8 !== GOLDEN_PCRS[8]) {
        logger.error({ expected: GOLDEN_PCRS[8], got: payload.pcr8 }, '[TPM] PCR 8 validation failed: unauthorized isolation or seccomp profile state.');
        return false;
      }

      return true;
    } catch (error: any) {
      logger.error(`[TPM] Quote verification failed with exception: ${error.message}`);
      return false;
    }
  }
}
