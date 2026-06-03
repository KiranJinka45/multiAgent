# Phase 5: Rekor PEM Resolution - Discussion Log

**Date:** 2026-06-03
**Status:** Completed

This document provides a full audit trail of the choices made during the GSD discuss-phase step.

### Q1: Public Key Integration
**Question:** How should the PEM public key be supplied to the RekorClient?
- **Options presented:**
  - Pass the PEM public key as a parameter to `publishEntry()` to support multiple keys dynamically (Recommended)
  - Configure the PEM public key when initializing the RekorClient constructor/singleton
  - Resolve the public key automatically from the global ZTAN environment configuration
- **Selected Choice:** Pass the PEM public key as a parameter to `publishEntry()` to support multiple keys dynamically

### Q2: Signature & Key Type Support
**Question:** Which key and signature types should RekorClient support when constructing the hashedrekord payload?
- **Options presented:**
  - Support both Ed25519 and P-256/ECDSA keys to align with the rest of ZTAN's architecture (Recommended)
  - Support Ed25519 only (matching the Phase 08.6 trust finality standard)
  - Support P-256/ECDSA only (matching legacy Sigstore standards)
- **Selected Choice:** Support both Ed25519 and P-256/ECDSA keys to align with the rest of ZTAN's architecture

### Q3: Fallback Policy Enforcement
**Question:** How should the system behave when a Rekor API call fails (network timeout, rate limits, or invalid key/signature reject)?
- **Options presented:**
  - Keep the degraded local fallback (log warning, append locally, and continue) to avoid blocking ZTAN nodes under network partition (Recommended)
  - Strict Mode: Any Rekor rejection or timeout must be treated as a fatal failure, fencing the operator immediately
  - Make the fallback policy configurable (strict vs degraded) based on the ZTAN environment configuration
- **Selected Choice:** Keep the degraded local fallback (log warning, append locally, and continue) to avoid blocking ZTAN nodes under network partition

---
*Generated: 2026-06-03*
