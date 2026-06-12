---
wave: 1
depends_on: []
files_modified:
  - packages/ztan-crypto/src/time/mock-rekor.ts
  - packages/ztan-witness/src/index.ts
autonomous: true
requirements:
  - PEM-01
  - PEM-02
---

# Phase 5 Plan: Rekor PEM Resolution

This plan resolves the Sigstore Rekor integration issue where ZTAN submitted hardcoded placeholder public keys rather than real, standard PEM-encoded keys. We will update the `RekorClient` and `EvidenceLedger` to support real PEM key propagation and validation.

## Objectives

- Update `RekorClient.publishEntry` to accept and propagate the actual PEM-encoded public key.
- Update the co-signing flow in `EvidenceLedger` to pass the correct public key to the Rekor API.
- Validate that the Sigstore payload contains the correct base64-encoded PEM public key and signature for both Ed25519 and P-256/ECDSA.

## Tasks

<task id="PEM-01-CODE">
  <read_first>
    - packages/ztan-crypto/src/time/mock-rekor.ts
    - packages/ztan-witness/src/index.ts
  </read_first>
  <action>
    Update `RekorClient` in `packages/ztan-crypto/src/time/mock-rekor.ts`:
    1. Modify `publishEntry(payloadHash: string, signature: string)` to accept an optional `publicKeyPem?: string` as a third argument.
    2. In the `rekordObj` construction, base64-encode the supplied `publicKeyPem` instead of the hardcoded `"ztan-public-key-placeholder"` if provided:
       ```typescript
       publicKey: {
           content: Buffer.from(publicKeyPem || "ztan-public-key-placeholder").toString('base64')
       }
       ```
    3. Update `packages/ztan-witness/src/index.ts`:
       In both locations where co-signing ledger entries are finalized and published to Rekor (line 436 and line 711), resolve the actual public key associated with the co-signing operator and pass it as the third parameter to `rekor.publishEntry`.
  </action>
  <acceptance_criteria>
    - `packages/ztan-crypto/src/time/mock-rekor.ts` contains the updated `publishEntry` signature with `publicKeyPem?: string`.
    - `packages/ztan-witness/src/index.ts` invokes `rekor.publishEntry` with the co-signer public key.
  </acceptance_criteria>
</task>

<task id="PEM-02-TEST">
  <read_first>
    - packages/ztan-crypto/src/time/mock-rekor.ts
  </read_first>
  <action>
    Create a new Vitest test file `packages/ztan-crypto/src/time/rekor-pem.test.ts`:
    1. Implement tests to generate standard Ed25519 and P-256/ECDSA keys using Node `crypto`.
    2. Verify `rekor.publishEntry` successfully accepts these PEM public keys, correctly base64-encodes them, and processes the response or falls back to local-only appends under network isolation cleanly.
  </action>
  <acceptance_criteria>
    - Test file `packages/ztan-crypto/src/time/rekor-pem.test.ts` exists.
    - Running `npx vitest run packages/ztan-crypto/src/time/rekor-pem.test.ts` executes and passes successfully.
  </acceptance_criteria>
</task>

## Success Criteria

1. **PEM Propagation**: The Rekor client successfully accepts PEM public keys and propagates them in base64 format in the outgoing HTTP payload.
2. **Graceful Fallback**: Under network timeout or Sigstore endpoint errors, the witness ledger logs the warning and falls back to generating a secure local cryptographic hash fallback.
3. **Multi-algorithm compatibility**: Both Ed25519 and P-256/ECDSA keys pass validation checks.
