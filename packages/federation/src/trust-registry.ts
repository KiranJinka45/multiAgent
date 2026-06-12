export interface EpochAnchor {
    rootHash: string;
    operatorPublicKeys: string[];
}

export class TrustRegistry {
    private epochRoots: Map<string, EpochAnchor> = new Map();
    private revokedPublicKeys: Set<string> = new Set();

    /**
     * Anchor a specific governance epoch to a Merkle root and operator public keys.
     */
    public anchorEpoch(epochId: string, rootHash: string, operatorPublicKeys: string[] = []): void {
        this.epochRoots.set(epochId, { rootHash, operatorPublicKeys });
    }

    /**
     * Check if a root hash is valid for a given epoch.
     */
    public isValidRootForEpoch(epochId: string, rootHash: string): boolean {
        const anchor = this.epochRoots.get(epochId);
        return anchor?.rootHash === rootHash;
    }

    /**
     * Retrieves trusted operator public keys for a specific epoch.
     */
    public getOperatorKeysForEpoch(epochId: string): string[] {
        return this.epochRoots.get(epochId)?.operatorPublicKeys || [];
    }

    /**
     * Revoke an operator's public key (PEM format).
     */
    public revokePublicKey(publicKeyPem: string): void {
        this.revokedPublicKeys.add(publicKeyPem);
    }

    /**
     * Check if a public key is revoked.
     */
    public isRevoked(publicKeyPem: string): boolean {
        return this.revokedPublicKeys.has(publicKeyPem);
    }

    /**
     * Check if a list of public keys contains any revoked keys.
     */
    public hasRevokedKeys(publicKeys: string[]): boolean {
        for (const pk of publicKeys) {
            if (this.revokedPublicKeys.has(pk)) {
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
            revokedPublicKeys: Array.from(this.revokedPublicKeys)
        });
    }

    /**
     * Deserialize from offline auditor.
     */
    public static deserialize(data: string): TrustRegistry {
        const parsed = JSON.parse(data);
        const registry = new TrustRegistry();
        
        if (parsed.epochRoots) {
            parsed.epochRoots.forEach(([epoch, anchor]: [string, EpochAnchor]) => {
                registry.anchorEpoch(epoch, anchor.rootHash, anchor.operatorPublicKeys);
            });
        }
        if (parsed.revokedPublicKeys) {
            parsed.revokedPublicKeys.forEach((pk: string) => {
                registry.revokePublicKey(pk);
            });
        }
        return registry;
    }
}
