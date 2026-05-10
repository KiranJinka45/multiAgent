import crypto from 'crypto';

export type MerkleProof = {
    position: 'left' | 'right';
    hash: string;
}[];

/**
 * RFC 6962 compliant Merkle Tree implementation.
 * Used for both operational evidence (witness.log) and institutional governance (governance.log).
 */
export class MerkleTree {
    private leaves: string[] = [];

    constructor(initialHashes: string[] = []) {
        this.leaves = [...initialHashes];
    }

    public append(hash: string): void {
        this.leaves.push(hash);
    }

    public static hashLeaf(leaf: string): string {
        return crypto.createHash('sha256')
            .update(Buffer.from([0x00]))
            .update(Buffer.from(leaf, 'hex'))
            .digest('hex');
    }

    public static hashNode(left: string, right: string): string {
        return crypto.createHash('sha256')
            .update(Buffer.from([0x01]))
            .update(Buffer.from(left, 'hex'))
            .update(Buffer.from(right, 'hex'))
            .digest('hex');
    }

    private static getK(n: number): number {
        if (n < 1) return 0;
        let k = 1;
        while (k < n) {
            k <<= 1;
        }
        return k >> 1;
    }

    private static calculateRoot(leaves: string[]): string {
        const n = leaves.length;
        if (n === 0) {
            return crypto.createHash('sha256').digest('hex');
        }
        if (n === 1) {
            return this.hashLeaf(leaves[0]);
        }
        const k = this.getK(n);
        return this.hashNode(
            this.calculateRoot(leaves.slice(0, k)),
            this.calculateRoot(leaves.slice(k))
        );
    }

    public getRoot(): string {
        return MerkleTree.calculateRoot(this.leaves);
    }

    public getProof(index: number): MerkleProof {
        return this.calculateProof(index, this.leaves);
    }

    private calculateProof(index: number, leaves: string[]): MerkleProof {
        const n = leaves.length;
        if (n <= 1) return [];

        const k = MerkleTree.getK(n);
        if (index < k) {
            const proof = this.calculateProof(index, leaves.slice(0, k));
            proof.push({
                position: 'right',
                hash: MerkleTree.calculateRoot(leaves.slice(k))
            });
            return proof;
        } else {
            const proof = this.calculateProof(index - k, leaves.slice(k));
            proof.push({
                position: 'left',
                hash: MerkleTree.calculateRoot(leaves.slice(0, k))
            });
            return proof;
        }
    }

    public static verifyProof(leafHash: string, index: number, treeSize: number, root: string, proof: MerkleProof): boolean {
        let currentHash = this.hashLeaf(leafHash);
        
        for (const element of proof) {
            const left = element.position === 'left' ? element.hash : currentHash;
            const right = element.position === 'right' ? element.hash : currentHash;
            currentHash = this.hashNode(left, right);
        }

        return currentHash === root;
    }

    public getConsistencyProof(m: number): string[] {
        if (m <= 0 || m > this.leaves.length) return [];
        return this.calculateConsistency(m, this.leaves, true);
    }

    private calculateConsistency(m: number, leaves: string[], complete: boolean): string[] {
        const n = leaves.length;
        if (m === n) {
            return complete ? [] : [MerkleTree.calculateRoot(leaves)];
        }
        const k = MerkleTree.getK(n);
        if (m <= k) {
            const proof = this.calculateConsistency(m, leaves.slice(0, k), complete);
            proof.push(MerkleTree.calculateRoot(leaves.slice(k)));
            return proof;
        } else {
            const proof = this.calculateConsistency(m - k, leaves.slice(k), false);
            proof.push(MerkleTree.calculateRoot(leaves.slice(0, k)));
            return proof;
        }
    }

    public static verifyConsistency(m: number, n: number, oldRoot: string, newRoot: string, proof: string[]): boolean {
        if (m === n) return oldRoot === newRoot && proof.length === 0;
        if (m === 0 || m > n) return false;

        let p = [...proof];
        let fr: string;
        let sr: string;

        if ((m & (m - 1)) === 0) { // m is a power of 2
            fr = oldRoot;
            sr = oldRoot;
        } else {
            if (p.length === 0) return false;
            fr = p.shift()!;
            sr = fr;
        }

        let fn = m;
        let sn = n;

        for (const element of p) {
            let k = this.getK(sn);
            if (fn <= k) {
                sr = this.hashNode(sr, element);
                sn = k;
            } else {
                fr = this.hashNode(element, fr);
                sr = this.hashNode(element, sr);
                fn -= k;
                sn -= k;
            }
        }

        return fr === oldRoot && sr === newRoot;
    }

    public getLeafCount(): number {
        return this.leaves.length;
    }
}
