# ZTAN v2.0 — Handover Manifest

## 📦 Project Identity
- **Name:** Zero-Trust Audit Network (ZTAN)
- **Version:** 2.0 (Audit-Locked)
- **Tagline:** Verifiable audit proof infrastructure with threshold-backed consensus.

---

## 🏗️ Core Architecture
ZTAN is a **Coordinator-Assisted FROST MPC** implementation. It provides cryptographic non-repudiation for audit trails through:
1. **Deterministic Encoding (CER):** Bit-perfect parity between Node.js and Python.
2. **Identity Binding:** Mandatory registration with 48-byte G1 keys.
3. **Resilient Backend:** Idempotent, restart-safe, and Redlock-hardened.
4. **Transparency Transcript:** Hash-linked event log for audit traceability.

---

## 📜 Specifications (RFCs)
- **[RFC-001 v1.5](packages/ztan-crypto/RFC-001-v1.5.md):** Canonical Encoding and Signing Standard.
- **[RFC-002 v1.0](packages/ztan-crypto/RFC-002-v1.0.md):** Identity Binding and Protocol Authenticity.
- **[SECURITY_ADVISORY](ZTAN-SECURITY-ADVISORY.md):** Assumptions, Limitations, and Trust Model.

---

## 🛠️ Verification Toolkit (Independent)
The `verify-kit/` directory contains self-contained tools to validate ZTAN proofs without relying on the core infrastructure:
- **`auditor_cli.py`:** Python implementation of RFC-001 for cross-platform validation.
- **`vectors.json`:** Immutable test vectors for bit-perfect verification.

---

## 📊 Compliance & Audit Status
- **Key Rotation:** Supported via `IdentityService.rotateKey()`.
- **Revocation:** Supported via `IdentityService.revoke()`.
- **Immutability:** Enforced via `ProofArchiveService` (Append-only).
- **Rate Limiting:** Enforced via `middleware.ts` (1MB cap).

---

## 🧪 Test Coverage
- **Unit Tests:** `packages/ztan-crypto/src/index.test.ts`
- **Security Tests:** `apps/core-api/tests/security_phase1.test.ts`
- **Resilience Tests:** `apps/core-api/tests/resilience_phase2.test.ts`
- **Load Validation:** `apps/core-api/tests/load_validation_phase3.test.ts`

---

## 🚀 Deployment Recommendations
1. **HSM Integration:** Transition `IdentityService` to a real KMS/HSM for production key storage.
2. **Permanent Storage:** Back `ProofArchiveService` with S3 Object Lock (Immutable storage).
3. **Clock Sync:** Ensure all nodes are NTP-synchronized (+/- 30s drift tolerance).

---

**Sign-off:** ZTAN v2.0 is functionally complete, cryptographically verified, and ready for external audit.
