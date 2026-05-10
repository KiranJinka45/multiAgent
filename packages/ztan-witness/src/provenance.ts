import { createHash, createSign, createVerify } from 'crypto';

export interface ArtifactAttestation {
  artifactId: string;
  version: string;
  sha256: string;
  sbomHash: string;
  timestamp: string;
  signature: string;
}

/**
 * 🛡️ ProvenanceEngine
 * Enforces build reproducibility and artifact integrity.
 * Ensures institutional replay is based on verifiable, non-poisoned code.
 */
export class ProvenanceEngine {
  private readonly privateKey: string; // Institutional Build Key
  private readonly publicKey: string;

  constructor(privateKey: string, publicKey: string) {
    this.privateKey = privateKey;
    this.publicKey = publicKey;
  }

  /**
   * Generates a signed attestation for a build artifact.
   */
  public certifyArtifact(
    artifactId: string, 
    version: string, 
    content: Buffer, 
    sbomContent: string
  ): ArtifactAttestation {
    const sha256 = createHash('sha256').update(content).digest('hex');
    const sbomHash = createHash('sha256').update(sbomContent).digest('hex');
    const timestamp = new Date().toISOString();

    const dataToSign = `${artifactId}:${version}:${sha256}:${sbomHash}:${timestamp}`;
    const signer = createSign('SHA256');
    signer.update(dataToSign);
    const signature = signer.sign(this.privateKey, 'hex');

    return { artifactId, version, sha256, sbomHash, timestamp, signature };
  }

  /**
   * Verifies an artifact against its attestation.
   */
  public verifyProvenance(artifact: Buffer, attestation: ArtifactAttestation): boolean {
    const actualHash = createHash('sha256').update(artifact).digest('hex');
    if (actualHash !== attestation.sha256) return false;

    const dataToVerify = `${attestation.artifactId}:${attestation.version}:${attestation.sha256}:${attestation.sbomHash}:${attestation.timestamp}`;
    const verifier = createVerify('SHA256');
    verifier.update(dataToVerify);
    
    return verifier.verify(this.publicKey, attestation.signature, 'hex');
  }
}
