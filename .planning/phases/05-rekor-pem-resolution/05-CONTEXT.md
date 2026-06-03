# Phase 5: Rekor PEM Resolution - Context

**Gathered:** 2026-06-03
**Status:** Ready for planning

<domain>
## Phase Boundary

Resolve standard PEM decoding and validation issues of Rekor submission keys. Ensure ZTAN can parse, decode, and match standard PEM public keys (supporting both Ed25519 and P-256/ECDSA) without falling back to local-only appends except during genuine network isolation or validation failures.

</domain>

<decisions>
## Implementation Decisions

### Public Key Integration
- **D-01:** Pass the PEM public key as an optional parameter to `publishEntry()` in `RekorClient`. This enables support for multiple keys dynamically and avoids hardcoding placeholders.

### Signature & Key Type Support
- **D-02:** Support both Ed25519 and P-256/ECDSA public keys/signatures when constructing the `hashedrekord` Sigstore payload.

### Fallback Policy Enforcement
- **D-03:** Retain the degraded local-only fallback policy (log warning, calculate local signature preimage hash, and succeed) to prevent blocking ZTAN nodes under network partition.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Rekor Integration
- `packages/ztan-crypto/src/time/mock-rekor.ts` — The Rekor client implementation and payload schema.
- `packages/ztan-witness/src/index.ts` — The witness subsystem that publishes entries to Rekor.

</canonical_refs>

---
*Last updated: 2026-06-03 — Phase 5 Context Initialized*
