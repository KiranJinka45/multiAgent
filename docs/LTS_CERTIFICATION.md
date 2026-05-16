# ZTAN Long-Term Support (LTS) Certification

This document certifies the commitment to the stability and decadal survivability of the ZTAN platform.

## 1. Support Horizon (2026 - 2036)
ZTAN Version 2.5 "Final" is certified for a **10-year support window**.

## 2. Maintenance Guarantees

| Category | Commitment |
| :--- | :--- |
| **Security Patches** | Critical security vulnerabilities patched within 24 hours of disclosure. |
| **PQC Readiness** | Maintenance of Dilithium/Kyber implementations against cryptanalytic advances. |
| **API Stability** | Zero breaking changes to core governance or identity APIs for 10 years. |
| **Hardware Trust** | Compatibility with future TPM 2.0+ and Nitro Enclave iterations. |

## 3. Certification Workflow
A release is certified as LTS only if:
1. `ComplexityGatekeeper` score is below 0.3.
2. 100% pass rate on adversarial replay simulations.
3. Signed attestation from the Institutional Governance Board.

## 4. LTS Artifacts
- **Signed Release Bundle**: `ztan-lts-2026.tar.gz.sig`
- **Audit Receipt**: `ztan-audit-final.json`

---
**ZTAN Institutional Stewardship Council** 🏛️
