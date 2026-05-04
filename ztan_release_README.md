# ZTAN: Verifiable Audit Proofs

ZTAN allows you to verify a multi-party approval (audit proof) independently, without trusting the system that produced it.

## 🚀 Verify a Proof in 2 Steps

1. **Install dependencies** (Standard Python 3, no external libs required):
   ```bash
   # No pip install needed. Uses standard hashlib/json.
   ```

2. **Run Verification**:
   ```bash
   python auditor_cli.py sample_bundle.json
   ```

## ✅ What does Success mean?
If you see **`[RESULT] VERIFICATION SUCCESS`**, it means:
1. The proof adheres to the **ZTAN-RFC-001** canonical standard.
2. The threshold of authorized signers (e.g., 2-of-3) has been cryptographically met.
3. The audit event (e.g., a wire transfer) is authentic and tamper-proof.

---
**RFCs:** [RFC-001](packages/ztan-crypto/RFC-001-v1.5.md) | [Security Advisory](ZTAN-SECURITY-ADVISORY.md)
