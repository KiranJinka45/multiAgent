# ZTAN External Verification Kit (v1.5)

This kit allows any third party to independently verify ZTAN audit proofs (RFC-001 v1.5) without relying on the ZTAN infrastructure.

## 📦 Structure
- `ZTAN-RFC-001-v1.5.md`: The formal protocol specification.
- `vectors.json`: Formal test vectors for cross-runtime validation.
- `sample_bundle.json`: A self-contained sample proof.
- `v1.5/verify.py`: Reference Python verification implementation.

## 🛠️ Requirements
- Python 3.9+
- `python -m pip install py_ecc` (for BLS12-381 curve operations)

## 🚀 Usage (Frictionless Verification)

### 1. Run Test Vectors
Ensure your environment matches the canonical specification:
```bash
python v1.5/verify.py --test vectors.json
```

### 2. Verify a Proof Bundle
Verify a specific audit proof (e.g., the sample provided):
```bash
python v1.5/verify.py --bundle sample_bundle.json
```

## 🛡️ Security Guarantees
When `verify.py` returns `[SUCCESS]`, it mathematically proves:
1. **Quorum Integrity**: At least `threshold` nodes signed this specific message.
2. **Signer Authorization**: Every signer is a member of the authorized `eligiblePublicKeys` set.
3. **Session Isolation**: The signature is bound to the unique `ceremonyId` (prevents replay).
4. **Semantic Determinism**: The encoding follows the **CER v1.5** standard exactly.

---
**Status**: ZTAN-RFC-001 v1.5 LOCKED
