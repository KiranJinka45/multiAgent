export class SupplyChainError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'SupplyChainError';
    }
}

export class ProvenanceVerifier {
    // Simulated database of signatures for OCI digests
    private static signedDigests: Record<string, { signed: boolean; identity: string }> = {
        'sha256:1111111111111111111111111111111111111111111111111111111111111111': {
            signed: true,
            identity: 'build-bot@ztan.io'
        },
        'sha256:2222222222222222222222222222222222222222222222222222222222222222': {
            signed: true,
            identity: 'malicious-hacker@evil.com'
        }
    };

    /**
     * Verifies that the OCI image uses digest pinning and is signed by the correct CI identity.
     * @param imageRef The OCI image reference (e.g. "ztan-worker@sha256:...")
     * @param expectedIdentity The expected signing identity (default "build-bot@ztan.io")
     * @returns The verified sha256 digest hash
     */
    static verifyOciImage(imageRef: string, expectedIdentity: string = 'build-bot@ztan.io'): string {
        // Enforce digest pinning
        if (!imageRef.includes('@sha256:')) {
            throw new SupplyChainError(`Digest pinning required. Mutable tags are prohibited: "${imageRef}"`);
        }

        const parts = imageRef.split('@');
        const digest = parts[1];

        // Match digest format
        const shaRegex = /^sha256:[a-f0-9]{64}$/;
        if (!shaRegex.test(digest)) {
            throw new SupplyChainError(`Invalid digest format: "${digest}"`);
        }

        const signatureInfo = this.signedDigests[digest];

        // Check if signature exists
        if (!signatureInfo || !signatureInfo.signed) {
            throw new SupplyChainError(`No valid signature found for OCI digest: "${digest}"`);
        }

        // Check signing identity
        if (signatureInfo.identity !== expectedIdentity) {
            throw new SupplyChainError(
                `Signature identity mismatch. Found: "${signatureInfo.identity}", Expected: "${expectedIdentity}"`
            );
        }

        return digest;
    }

    /**
     * Registers a mock OCI signature for test cases.
     */
    static registerMockSignature(digest: string, identity: string, signed: boolean = true): void {
        this.signedDigests[digest] = { signed, identity };
    }
}
