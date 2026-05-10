import * as crypto from 'crypto';
import { FinalizedEnvelope } from '../../sandbox/src/types';
import { MerkleTree } from './merkle';
import { RootLedger, RootEpoch } from './ledger';
import { logger } from '../../observability/src';

export interface WitnessReceipt {
  envelope: FinalizedEnvelope;
  signature: string;
  merkleRoot: string;
  inclusionProof: string[];
}

/**
 * 🛡️ WitnessEngine
 * Responsibilities: Verify finalized envelopes, generate signatures, emit inclusion proofs.
 * Truth must be immutable BEFORE it is signed.
 */
export class WitnessEngine {
  private merkleTree: MerkleTree = new MerkleTree();
  private processedEnvelopes: FinalizedEnvelope[] = [];
  private ledger: RootLedger;
  private lastCheckpointIndex: number = -1;
  
  // Mock Key for Local Institutional Truth (In production, this would be a secure HSM/KMS)
  private privateKey: crypto.KeyObject;
  public publicKey: string;

  constructor() {
    const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
      modulusLength: 2048,
      publicKeyEncoding: { type: 'spki', format: 'pem' },
      privateKeyEncoding: { type: 'pkcs8', format: 'pem' },
    });
    this.privateKey = crypto.createPrivateKey(privateKey);
    this.publicKey = publicKey;
    this.ledger = new RootLedger(this.privateKey);
  }

  /**
   * Signs a finalized envelope and anchors it to the local Merkle root.
   */
  public async sign(envelope: FinalizedEnvelope): Promise<WitnessReceipt> {
    logger.info({ executionId: envelope.executionId }, '[WitnessEngine] Initiating witness signature sequence');

    // 1. Validation: Ensure it's a valid FinalizedEnvelope (constitutionally compliant)
    this.validateConstitutionalCompliance(envelope);

    // 2. Signature: Generate non-repudiable institutional proof
    const dataToSign = JSON.stringify(envelope);
    const signature = crypto.sign("sha256", Buffer.from(dataToSign), {
      key: this.privateKey,
      padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
    }).toString('base64');

    // 3. Anchoring: Add to Merkle Tree
    this.processedEnvelopes.push(envelope);
    this.merkleTree = new MerkleTree(this.processedEnvelopes.map(e => Buffer.from(JSON.stringify(e))));
    
    const index = this.processedEnvelopes.length - 1;
    const merkleRoot = this.merkleTree.getRoot()?.toString('hex') || '';
    const inclusionProof = this.merkleTree.getProof(index).map(p => p.toString('hex'));

    logger.info({ 
      executionId: envelope.executionId, 
      merkleRoot 
    }, '[WitnessEngine] Witness Receipt generated and anchored');

    return {
      envelope,
      signature,
      merkleRoot,
      inclusionProof
    };
  }

  /**
   * Verifies a witness receipt.
   */
  public verify(receipt: WitnessReceipt): boolean {
    // 1. Signature Check
    const isSignatureValid = crypto.verify(
      "sha256",
      Buffer.from(JSON.stringify(receipt.envelope)),
      {
        key: this.publicKey,
        padding: crypto.constants.RSA_PKCS1_PSS_PADDING,
      },
      Buffer.from(receipt.signature, 'base64')
    );

    if (!isSignatureValid) return false;

    // 2. Merkle Inclusion Check
    return MerkleTree.verify(
      Buffer.from(JSON.stringify(receipt.envelope)),
      this.processedEnvelopes.findIndex(e => e.executionId === receipt.envelope.executionId),
      Buffer.from(receipt.merkleRoot, 'hex'),
      receipt.inclusionProof.map(p => Buffer.from(p, 'hex'))
    );
  }

  /**
   * 🛡️ Checkpoint Finality
   * Commits the current Merkle root as a frozen institutional epoch.
   * Only checkpoints can be synchronized during federation.
   */
  public async checkpoint(): Promise<RootEpoch> {
    if (this.processedEnvelopes.length === 0) {
      throw new Error('[WitnessEngine] Cannot checkpoint: No execution truth processed');
    }

    const currentRoot = this.merkleTree.getRoot()?.toString('hex') || '';
    const startIndex = this.lastCheckpointIndex + 1;
    const endIndex = this.processedEnvelopes.length - 1;

    const epoch = this.ledger.commit(currentRoot, {
      start: startIndex,
      end: endIndex
    });

    this.lastCheckpointIndex = endIndex;
    
    logger.info({ 
      epochId: epoch.epochId, 
      range: `${startIndex}-${endIndex}` 
    }, '[WitnessEngine] Institutional checkpoint established');

    return epoch;
  }

  public getLedgerHistory(): ReadonlyArray<RootEpoch> {
    return this.ledger.getHistory();
  }

  private validateConstitutionalCompliance(envelope: FinalizedEnvelope) {
    if (!envelope.lineage.mountHash || !envelope.lineage.executionHash) {
      throw new Error('[WitnessEngine] Protocol Violation: Missing mandatory lineage hashes');
    }
    if (envelope.version !== "1.0.0") {
      throw new Error(`[WitnessEngine] Protocol Violation: Unsupported truth model version ${envelope.version}`);
    }
  }
}
