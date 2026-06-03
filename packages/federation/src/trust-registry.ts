export class TrustRegistry {
    private epochRoots: Map<string, string> = new Map();
    private revokedSignatures: Set<string> = new Set();

    /**
     * Anchor a specific governance epoch to a Merkle root.
     */
    public anchorEpoch(epochId: string, rootHash: string): void {
        this.epochRoots.set(epochId, rootHash);
    }

    /**
     * Check if a root hash is valid for a given epoch.
     */
    public isValidRootForEpoch(epochId: string, rootHash: string): boolean {
        const expectedRoot = this.epochRoots.get(epochId);
        return expectedRoot === rootHash;
    }

    /**
     * Revoke a cell key or specific signature.
     */
    public revokeSignature(signature: string): void {
        this.revokedSignatures.add(signature);
    }

    /**
     * Check if a signature is revoked.
     */
    public isRevoked(signature: string): boolean {
        return this.revokedSignatures.has(signature);
    }

    /**
     * Check if a list of signatures contains any revoked signatures.
     */
    public hasRevokedSignatures(signatures: string[]): boolean {
        for (const sig of signatures) {
            if (this.revokedSignatures.has(sig)) {
                return true;
            }
        }
        return false;
    }

    /**
     * Serialize for offline auditor use.
     */
    public serialize(): string {
        return JSON.stringify({
            epochRoots: Array.from(this.epochRoots.entries()),
            revokedSignatures: Array.from(this.revokedSignatures)
        });
    }

    /**
     * Deserialize from offline auditor.
     */
    public static deserialize(data: string): TrustRegistry {
        const parsed = JSON.parse(data);
        const registry = new TrustRegistry();
        
        if (parsed.epochRoots) {
            parsed.epochRoots.forEach(([epoch, root]: [string, string]) => {
                registry.anchorEpoch(epoch, root);
            });
        }
        if (parsed.revokedSignatures) {
            parsed.revokedSignatures.forEach((sig: string) => {
                registry.revokeSignature(sig);
            });
        }
        return registry;
    }
}
