import * as crypto from 'crypto';

export class PCRPolicy {
  private expectedPcrValues: Record<number, string>;

  constructor(expectedPcrValues: Record<number, string>) {
    this.expectedPcrValues = expectedPcrValues;
  }

  /**
   * Simulates sealing a payload (e.g. a private key) against specific PCR states.
   * In a physical TPM, the TPM stores the sealed blob. Here we encrypt it symmetrically
   * using the expected PCR state as part of the key derivation.
   */
  public seal(payload: Buffer): string {
    const policyDigest = this.computePolicyDigest();
    
    // We derive a sealing key from the expected policy digest
    // Note: In physical TPM, the SRK (Storage Root Key) performs this sealing internally.
    const sealingKey = crypto.scryptSync(policyDigest, 'ztan-salt', 32);
    const iv = crypto.randomBytes(16);
    
    const cipher = crypto.createCipheriv('aes-256-gcm', sealingKey, iv);
    let encrypted = cipher.update(payload);
    encrypted = Buffer.concat([encrypted, cipher.final()]);
    const authTag = cipher.getAuthTag();
    
    // Format: iv:authTag:encryptedPayload
    return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
  }

  /**
   * Unseals a payload if the provided actual PCR values match the expected policy.
   */
  public unseal(sealedBlob: string, actualPcrValues: Record<number, string>): Buffer {
    // 1. Verify PCR state matches expectations before even attempting unseal
    for (const [index, expectedVal] of Object.entries(this.expectedPcrValues)) {
      if (actualPcrValues[Number(index)] !== expectedVal) {
        throw new Error(`[PCRPolicy] Hardware Measurement Failure: PCR ${index} tampered. Expected ${expectedVal}, got ${actualPcrValues[Number(index)]}`);
      }
    }

    const policyDigest = this.computePolicyDigest();
    const unsealingKey = crypto.scryptSync(policyDigest, 'ztan-salt', 32);
    
    const parts = sealedBlob.split(':');
    if (parts.length !== 3) {
      throw new Error('[PCRPolicy] Malformed sealed blob.');
    }
    
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = Buffer.from(parts[2], 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', unsealingKey, iv);
    decipher.setAuthTag(authTag);
    
    let decrypted = decipher.update(encrypted);
    decrypted = Buffer.concat([decrypted, decipher.final()]);
    
    return decrypted;
  }

  private computePolicyDigest(): string {
    const hash = crypto.createHash('sha256');
    const sortedIndices = Object.keys(this.expectedPcrValues).map(Number).sort((a, b) => a - b);
    for (const index of sortedIndices) {
      hash.update(Buffer.from(this.expectedPcrValues[index], 'hex'));
    }
    return hash.digest('hex');
  }
}
