# 🛠️ ZTAN Phase 11B — Wave 2: Tier H1 Measurement Specification
**The Concrete Execution Guide for TPM 2.0 PCR Sealing & Quote Attestation**

> [!IMPORTANT]
> **Wave 2 Engineering Boundary: Root of Trust Binding**
> Wave 2 binds our logical execution constraints (from Wave 1) to the physical hardware.
> We explicitly define:
> `Host OS Boot ──► TPM Measurement (PCR 0-7, 10) ──► Quote Generation ──► Verifier Challenge`

---

## 🏛️ 1. Platform Configuration Register (PCR) Policy

ZTAN relies on standard TCG (Trusted Computing Group) PCR indices to verify that the host operating system has not been compromised.

### 1.1 Critical PCR Targets
| PCR Index | Measurement Target | Action on Mismatch |
| :--- | :--- | :--- |
| **PCR 0-3** | BIOS / UEFI firmware, Option ROMs | `HARD QUARANTINE` (Suspected low-level rootkit or physical tampering) |
| **PCR 4-5** | Master Boot Record (MBR) / Boot Loader | `HARD QUARANTINE` (Evil Maid attack or unauthorized bootloader change) |
| **PCR 7** | Secure Boot Policy & Keys | `HARD QUARANTINE` (Secure Boot disabled or unauthorized keys injected) |
| **PCR 10** | IMA (Integrity Measurement Architecture) | `DEGRADED MODE` (Unverified binary executed; lock database writes until audited) |

### 1.2 Policy Sealing Contract
* ZTAN coordination signing keys (used to sign the Autonomous Action Envelopes) will be generated and sealed to the TPM.
* The TPM will only unseal these keys if the current PCRs strictly match the known-good baseline state.

---

## 🏛️ 2. Remote Attestation & Quote Handshake

To prove integrity to an Off-Host Witness (Tier H2), the node must generate cryptographic quotes.

### 2.1 Attestation Key (AK) Provisioning
* An Attestation Key (AK) is generated within the TPM Endorsement Hierarchy.
* The AK public certificate is distributed out-of-band to the Verifier (Witness Node).

### 2.2 The Quote Protocol
1. **Challenge:** The Verifier sends a random 32-byte `nonce`.
2. **Measurement:** The `HostDaemon` invokes `tpm2_quote` on the local TPM, requesting a signature over the target PCRs (e.g., PCR 0,7) and the provided `nonce`.
3. **Transmission:** The daemon returns the `TPM2B_ATTEST` structure (containing the PCR hashes and nonce) and the cryptographic signature.
4. **Verification:** The Verifier confirms:
    * The signature was produced by the known AK.
    * The `nonce` matches the challenge (preventing replay attacks).
    * The PCR hashes match the expected whitelist.

---

## 🚫 3. Explicit Non-Goals & Blockers for Wave 2
* ❌ **No Detached Network Topologies:** Do not build the VPC or separate cloud deployment for the Witness node yet. We are only building the quote generation and verification logic locally.
* ❌ **No OCI Signature Admission Controllers:** Do not configure Cosign or Sigstore yet (Tier H3).

---

## 📊 4. Objective Wave 2 Verification Metrics
* **Quote Integrity:** The Quote Generator must produce valid `TPM2B_ATTEST` structures signed by an AK.
* **Tamper Detection:** The Verifier must correctly throw an error if the `nonce` is altered or if the PCR hashes deviate from the expected baseline.
