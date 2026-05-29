# 🛠️ ZTAN Phase 11B — Wave 4: Tier H3 Provenance Binding Specification
**The Concrete Execution Guide for Immutable Supply Chain Integrity**

> [!IMPORTANT]
> **Wave 4 Engineering Boundary: Software Origin Validation**
> Hardware measurements (Tier H1) are meaningless if we measure a perfectly booted malicious image. 
> We explicitly define:
> `CI Pipeline (GitHub Actions) ──[Cosign Sign]──► Container Registry ──[Signature Verification]──► Host Daemon Spawner`

---

## 🏛️ 1. The Deployment Gatekeeper

The ZTAN Host Daemon functions as a strict admission controller. It refuses to instantiate microVMs or process enclaves unless the execution image cryptographically proves its origin.

### 1.1 Strict OCI Digest Pinning
* **Tag Spooofing Prevention:** The daemon rejects execution instructions referencing mutable tags (e.g., `ztan-worker:latest`).
* **Digest Enforcement:** Execution instructions must specify the exact SHA-256 digest (e.g., `ztan-worker@sha256:abcd...`).

### 1.2 Cryptographic Verification
* Before spawning the image, the Host Daemon queries the Sigstore/Cosign registry.
* It verifies that a valid cryptographic signature exists for the requested digest.
* It verifies that the signature was generated specifically by the designated CI identity (`build-bot@ztan.io`), rejecting developer or third-party signatures in production.

---

## 🏛️ 2. Hardware Substrate Binding (PCR 10 IMA)

Once the Host Daemon verifies the image provenance, it mathematically links this verification to the hardware attestation.

### 2.1 The IMA Measurement List
* The Integrity Measurement Architecture (IMA) is represented in TPM PCR 10.
* Instead of a static placeholder, PCR 10 is dynamically updated to reflect the SHA-256 digest of the Cosign-verified OCI image.
* **Why?** When the Detached Witness (from Tier H2) receives the TPM quote, it not only verifies that Secure Boot was intact (PCR 7), but also verifies that the exact software running inside the enclave matches the known-good CI build (PCR 10).

---

## 🚫 3. Explicit Non-Goals & Blockers for Wave 4
* ❌ **No Live Rekor Integration:** For testing predictability, we use a local `MockCosign` registry. Live public transparency log (Rekor) lookup is omitted.
* ❌ **No Automated Rollbacks:** If an image lacks provenance, the daemon simply throws a `SupplyChainError`. It does not attempt to automatically fetch previous good versions.

---

## 📊 4. Objective Wave 4 Verification Metrics
* **Supply Chain Halt:** CI tests must prove that the daemon actively blocks the execution of un-signed or improperly-signed (wrong identity) digests.
* **Hardware Propagation:** The final verified image digest must be mathematically present in the generated `TPM2B_ATTEST` quote.
