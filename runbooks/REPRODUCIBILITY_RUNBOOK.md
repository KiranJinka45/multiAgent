# ZTAN Reproducibility & Verification Runbook (OPS-BUNDLE)

This runbook guides independent third-party auditors to verify ZTAN evidence bundles (v1.8, v1.9, and v1.10) out-of-band, without relying on the active ZTAN network infrastructure.

---

## 🛠️ Prerequisites & Setup

To perform the verification, you only need Python and two standard cryptographic libraries. No repository access or Node.js runtime is required.

1. **Python Installation**: Ensure Python 3.9+ is installed:
   ```bash
   python --version
   ```

2. **Install Cryptographic Libraries**:
   - `py_ecc`: For BLS12-381 pairing operations and signature verification.
   - `cryptography`: For Ed25519 offline attestation signatures.
   
   Run the following command to install them:
   ```bash
   pip install py_ecc cryptography
   ```

---

## 📦 Bundle Structure

The reproducibility package is self-contained and consists of the following components:
- `verify-kit/auditor.py`: Portable Python verification script.
- `evidence/evidence_v1.8.json`: Serialized v1.8 offline attestation proof.
- `evidence/evidence_v1.9.json`: Serialized v1.9 Rekor-notarized proof.
- `evidence/evidence_v1.10.json`: Serialized v1.10 threshold-certified and ZK-bound proof.

---

## 🚀 Execution & Verification

Execute the portable auditor against each of the versioned evidence JSON files:

### 1. Verify v1.8 Offline Attestation
Checks that the containment, recovery, and sandbox attestation records were generated and signed by the authorized SRE key:
```bash
python verify-kit/auditor.py evidence/evidence_v1.8.json
```

### 2. Verify v1.9 Notarized Attestation
Validates the three offline signatures as well as the Rekor notary ledger sequence boundaries:
```bash
python verify-kit/auditor.py evidence/evidence_v1.9.json
```

### 3. Verify v1.10 Threshold & ZK Attestation
Performs standard BLS12-381 G2Basic pairing operations to verify that at least 2-of-3 authorized multi-agent nodes signed the context-bound state change, and validates that a Poseidon ZK stability proof is attached:
```bash
python verify-kit/auditor.py evidence/evidence_v1.10.json
```

---

## 🛡️ Cryptographic Guarantees

When a verification returns `[SUCCESS]`, the auditor confirms the following properties:
1. **Quorum Integrity (BLS)**: At least `threshold` nodes generated partial signatures that were combined to form the aggregated signature.
2. **Key Authorization**: Every participating node signature is verified against the authorized public keys list.
3. **Session Binding**: The BLS signature is bound to the specific `ceremonyId` and `messageHash` to prevent replay attacks.
4. **Offline Authenticity (Ed25519)**: The containment, recovery, and provider attestations are verified against the authorized SRE public key, ensuring zero-tampering since execution.
