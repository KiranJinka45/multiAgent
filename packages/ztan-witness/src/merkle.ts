import * as crypto from 'crypto';

/**
 * 🛡️ RFC 6962 Compliant Merkle Tree
 * Used for anchoring institutional execution truth.
 * Ensures tamper-evidence and efficient inclusion proofs.
 */
export class MerkleTree {
  private leaves: Buffer[] = [];
  private tree: Buffer[][] = [];

  constructor(leaves: Buffer[] = []) {
    this.leaves = leaves.map(leaf => this.hashLeaf(leaf));
    this.buildTree();
  }

  /** RFC 6962: Leaf Hash = SHA256(0x00 || data) */
  private hashLeaf(data: Buffer): Buffer {
    return crypto.createHash('sha256')
      .update(Buffer.from([0x00]))
      .update(data)
      .digest();
  }

  /** RFC 6962: Internal Node Hash = SHA256(0x01 || left || right) */
  private hashInternal(left: Buffer, right: Buffer): Buffer {
    return crypto.createHash('sha256')
      .update(Buffer.from([0x01]))
      .update(left)
      .update(right)
      .digest();
  }

  private buildTree() {
    this.tree = [this.leaves];
    let currentLevel = this.leaves;

    while (currentLevel.length > 1) {
      const nextLevel: Buffer[] = [];
      for (let i = 0; i < currentLevel.length; i += 2) {
        if (i + 1 < currentLevel.length) {
          nextLevel.push(this.hashInternal(currentLevel[i], currentLevel[i + 1]));
        } else {
          // RFC 6962: For unbalanced trees, promote the odd node without re-hashing
          nextLevel.push(currentLevel[i]);
        }
      }
      this.tree.push(nextLevel);
      currentLevel = nextLevel;
    }
  }

  public getRoot(): Buffer | null {
    if (this.tree.length === 0 || this.tree[this.tree.length - 1].length === 0) {
      return null;
    }
    return this.tree[this.tree.length - 1][0];
  }

  /**
   * Generates an inclusion proof for the leaf at the specified index.
   */
  public getProof(index: number): Buffer[] {
    const proof: Buffer[] = [];
    let currentIndex = index;

    for (let i = 0; i < this.tree.length - 1; i++) {
      const level = this.tree[i];
      const isRightChild = currentIndex % 2 === 1;
      const siblingIndex = isRightChild ? currentIndex - 1 : currentIndex + 1;

      if (siblingIndex < level.length) {
        proof.push(level[siblingIndex]);
      }
      currentIndex = Math.floor(currentIndex / 2);
    }

    return proof;
  }

  /**
   * Verifies an inclusion proof.
   */
  public static verify(leaf: Buffer, index: number, root: Buffer, proof: Buffer[]): boolean {
    let currentHash = crypto.createHash('sha256')
      .update(Buffer.from([0x00]))
      .update(leaf)
      .digest();

    let currentIndex = index;
    for (const siblingHash of proof) {
      const isRightChild = currentIndex % 2 === 1;
      if (isRightChild) {
        currentHash = crypto.createHash('sha256')
          .update(Buffer.from([0x01]))
          .update(siblingHash)
          .update(currentHash)
          .digest();
      } else {
        currentHash = crypto.createHash('sha256')
          .update(Buffer.from([0x01]))
          .update(currentHash)
          .update(siblingHash)
          .digest();
      }
      currentIndex = Math.floor(currentIndex / 2);
    }

    return currentHash.equals(root);
  }
}
