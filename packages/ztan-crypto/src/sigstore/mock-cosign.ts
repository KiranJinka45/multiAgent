import * as crypto from 'crypto';

interface CosignSignature {
  imageName: string;
  digest: string;
  identity: string;
  signature: string;
  timestamp: number;
}

/**
 * MockSigstoreRegistry
 * 
 * Simulates a keyless Cosign registry (e.g., Sigstore Rekor).
 * In production, this verifies OIDC tokens bound to GitHub Actions / CI
 * and checks the transparency log for non-repudiation.
 */
export class MockCosignRegistry {
  private signatures: Map<string, CosignSignature> = new Map();

  /**
   * Simulates the CI pipeline (GitHub Actions) pushing a keyless signature
   * after building an OCI image.
   */
  public signImage(imageName: string, digest: string, oidcIdentity: string): void {
    if (!digest.startsWith('sha256:')) {
      throw new Error('Invalid digest format. Must start with sha256:');
    }

    const payload = `${imageName}@${digest}::${oidcIdentity}`;
    // Simulate ECDSA signing
    const signature = crypto.createHash('sha256').update(payload).digest('hex');

    this.signatures.set(digest, {
      imageName,
      digest,
      identity: oidcIdentity,
      signature,
      timestamp: Date.now()
    });
  }

  /**
   * Verifies that the requested image digest was signed by the strictly expected CI identity.
   */
  public verifyImage(imageName: string, digest: string, expectedIdentity: string): boolean {
    if (!digest.startsWith('sha256:')) {
      return false;
    }

    const sigRecord = this.signatures.get(digest);
    if (!sigRecord) {
      console.error(`[Cosign] No signature found for digest ${digest}`);
      return false;
    }

    if (sigRecord.imageName !== imageName) {
      console.error(`[Cosign] Image name mismatch. Expected ${imageName}, got ${sigRecord.imageName}`);
      return false;
    }

    if (sigRecord.identity !== expectedIdentity) {
      console.error(`[Cosign] Identity mismatch. Expected ${expectedIdentity}, got ${sigRecord.identity}`);
      return false;
    }

    // Verify mathematical signature binding (simulated)
    const payload = `${imageName}@${digest}::${sigRecord.identity}`;
    const expectedSignature = crypto.createHash('sha256').update(payload).digest('hex');
    
    if (sigRecord.signature !== expectedSignature) {
      console.error(`[Cosign] Signature verification failed mathematically.`);
      return false;
    }

    console.log(`[Cosign] ✅ Successfully verified ${imageName}@${digest} signed by ${expectedIdentity}`);
    return true;
  }
}

// Global singleton for the mock simulation
export const sigstore = new MockCosignRegistry();
