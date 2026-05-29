# 🛠️ ZTAN Phase 11B — Wave 3: Tier H2 Detached Witness Specification
**The Concrete Execution Guide for Out-of-Band Integrity Handshakes**

> [!IMPORTANT]
> **Wave 3 Engineering Boundary: Cross-Kernel Detachment**
> Wave 3 breaks the assumption that the Verifier (from Wave 2) can safely exist on the same physical host as the execution engine.
> We explicitly define:
> `Host Daemon (Target) ◄──[Network Hop]──► Detached Witness Node (Verifier)`

---

## 🏛️ 1. The Pre-Flight Integrity Handshake

A detached Witness Node **must not** co-sign any state transactions until it has independently verified the physical integrity of the requesting host.

### 1.1 Handshake Sequence
1. **Transaction Request:** The primary Host Daemon prepares a state transition and requests a co-signature from the Witness Node.
2. **Challenge Lock:** The Witness places the transaction in a holding queue and issues an `ATTESTATION_CHALLENGE` back to the Host Daemon containing a fresh, random `nonce`.
3. **Hardware Measurement:** The Host Daemon invokes the local TPM to generate a signed `TPM2B_ATTEST` quote over the predefined PCR baseline and the provided nonce.
4. **Validation:** The Witness utilizes the `AttestationVerifier` to check the signature, nonce, and PCR digest against the known-good baseline.
5. **Outcome:**
   - **Pass:** The Witness mathematically co-signs the transaction.
   - **Fail:** The Witness throws a `QuarantineError`, drops the transaction, and locks down coordination.

---

## 🏛️ 2. Network Topology & Isolation Constraints

For the detached witness to hold systemic value, it must not share fate with the primary cluster.

### 2.1 Virtual Private Cloud (VPC) Simulation
* **Network Partition:** The Witness Node operates on a strictly separate Docker bridge network (`ztan-witness-net`) that has zero direct access to the primary database (`ztan-db-net`).
* **Ingress Only:** Communication between the Host Daemon and the Witness is strictly limited to an explicit HTTP/IPC bridge solely for the handshake.

### 2.2 Shared-Nothing Architecture
* The Witness node **does not** mount the primary Node.js file system.
* The Witness node **does not** share environment variables or CI/CD runner environments with the primary Host Daemon.

---

## 🚫 3. Explicit Non-Goals & Blockers for Wave 3
* ❌ **No Provenance Integration:** Do not integrate Sigstore or Cosign release verification yet (Tier H3). The focus remains purely on physical state attestation via TPM.
* ❌ **No Time Anchoring:** Do not implement RFC 3161 timestamps or Rekor transparency logs yet (Tier H4).

---

## 📊 4. Objective Wave 3 Verification Metrics
* **Network Separation:** The Witness must operate in a container topology that explicitly lacks `depends_on` or shared network overlays with the core database.
* **Handshake Enforcement:** CI tests must prove that if the `HostDaemon` fails to produce a valid quote, the Witness completely halts the multi-signature process.
