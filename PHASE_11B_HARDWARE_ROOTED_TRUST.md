# 🛡️ ZTAN Phase 11B — Hardware-Rooted Trust & True Isolation Domains
**The Concrete Architectural Blueprint for Hardened Hypervisor and Physical Substrate Gating**

> [!IMPORTANT]
> **Active Implementation Freeze Alignment**
> This manifest outlines the exact execution order for **Phase 11B — Hardware-Rooted Trust & True Isolation Domains**. 
> ZTAN’s design, governance, and structural abstractions remain frozen under the **Unified Strategic Charter**.
> The mission of Phase 11B is **physical and hypervisor layer enforcement**: shifting trust from cooperative process-level restrictions to true hypervisor/kernel containment and TPM-backed hardware attestation.

---

## 📅 The Execution Hierarchy: Tiered Hardware & Sandbox Build Order

```
  [ TIER H0: True Isolation ] ──► [ TIER H1: Hardware Attestation ] ──► [ TIER H2: Detached Witness ] ──► [ TIER H3: Provenance ] ──► [ TIER H4: Time Anchoring ]
  * Firecracker/gVisor microVMs    * TPM 2.0 PCR State Sealing        * Off-Host Witness Nodes          * Sigstore Release Signing  * Trusted RFC 3161 clocks
  * Seccomp-BPF Syscall Filters    * Secure Boot Path Validation      * Cross-Kernel Signatures         * Immutable OCI Digests     * Rekor Transparency Log
  * Read-Only rootfs               * Remote Quote Verification        * Out-of-Band Handshake           * SLSA Level 3 Builds       * Hard Clock Quarantine
```

---

## 🏛️ Tier H0 — True Isolation Domains (Build First)

These components decouple ZTAN's safety constraints from Node.js process state. Without Tier H0, V8 runtime vulnerabilities or compromised npm libraries can corrupt system processes and escape memory restrictions.

### 1. Firecracker/gVisor MicroVM Runtime
*   **Objective:** Eliminate same-kernel and same-runtime trust by executing all untrusted, multi-agent advisory processes (Tier A) in isolated, ephemeral sandboxes.
*   **Build Deliverables:**
    *   **Ephemeral MicroVM Spawning:** Implement lightweight Firecracker microVM provisioning with startup latency under 100ms.
    *   **gVisor Sandbox Integration:** Fallback runtime utilizing `runsc` to intercept syscalls at the user space level for legacy runtime tasks.
    *   **Zero-Persistence Storage:** Mount execution workspaces as RAM-backed filesystems (`tmpfs`) that are completely destroyed upon container teardown.

### 2. Seccomp-BPF Filters & Namespace Restriction
*   **Objective:** Force strict system-call restrictions on V8 engines to prevent privilege escalation.
*   **Build Deliverables:**
    *   **Custom Seccomp Profiles:** Compile strict system-call filters limiting network access to local loopbacks and blocking raw execution calls (`execve`, `fork`).
    *   **User Namespace Remapping:** Enforce mapping to unprivileged UID/GID ranges inside containers, rendering root inside a container powerless on the host.

### 3. Read-Only Rootfs
*   **Objective:** Prevent runtime modifications to application code or system configurations.
*   **Build Deliverables:**
    *   **Immutable Image Generation:** Bake V8 dependencies and Node scripts into a signed, read-only squashfs image.
    *   **Write-Blocked Overlays:** Enforce that any operational mutations are restricted to transaction outboxes in isolated database blocks, rejecting local filesystem writes entirely.

---

## 🏛️ Tier H1 — Hardware-Backed Attestation

No runtime measurements are secure if the host operating system can forge them. Tier H1 anchors coordination identity in physical silicon.

### 4. TPM 2.0 PCR State Sealing
*   **Objective:** Guard critical cryptographic identity keys (including FROST threshold key shares) from access by compromised hosts or processes.
*   **Build Deliverables:**
    *   **PCR Policy Sealing:** Seal the private keys used for transaction signing to specific Platform Configuration Registers (PCRs) representing valid boot configurations.
    *   **Hardware-Enclave Handshake:** Unseal keys *only* when PCR values confirm that no boot files, kernel configs, or kernel command lines have been tampered with.

### 5. Secure Boot & Measured Launch
*   **Objective:** Ensure the operating system executing ZTAN was not tampered with prior to node startup.
*   **Build Deliverables:**
    *   **UEFI Secure Boot Validation:** Enforce custom hardware key authorization for all kernel and driver loading.
    *   **Intel TXT / AMD SVM Launch:** Execute measured launch protocols to record exact hashes of the hypervisor and orchestration code into TPM PCRs on startup.

### 6. Remote Attestation Protocol
*   **Objective:** Allow external nodes and databases to verify a node's physical integrity before accepting state modifications.
*   **Build Deliverables:**
    *   **Quote Generation Service:** Generate cryptographically signed TPM Quotes containing PCR measurements and custom challenge nonces.
    *   **Attestation Verifier:** A sidecar parsing TPM quotes and validating the signature chain up to the hardware manufacturer's root certificate.

---

## 🏛️ Tier H2 — Truly Detached Witness Authority

Even with hardware measurements, a witness running in the same operational domain is vulnerable to correlated platform-level compromise.

### 7. Off-Host Witness Nodes
*   **Objective:** Break dual-process correlation by relocating the detached witness to separate infrastructure substrates.
*   **Build Deliverables:**
    *   **Multi-Cloud / Hybrid Deployment:** Deploy witness nodes on independent networks, kernels, and control planes (e.g., distinct hypervisors or bare-metal machines).
    *   **Uncorrelated Ingress Gates:** Route witness co-signing traffic through separate virtual private clouds (VPCs) with zero shared credential storage.

### 8. Cross-Kernel Signature Aggregation
*   **Objective:** Guarantee that no transaction commits without verification across distinct kernels.
*   **Build Deliverables:**
    *   **Threshold Multi-Sig Verification:** Enforce that the transactional state outbox requires co-signing from both the primary runtime enclave and the off-host witness.
    *   **Independent State Verification:** The witness node evaluates transaction safety rules independently inside its own kernel boundary prior to signing.

### 9. Out-of-Band Integrity Handshake
*   **Objective:** The witness challenges the host's physical state before signing any transaction sequence.
*   **Build Deliverables:**
    *   **Attestation Challenge:** Enforce that the witness issues a random nonce challenge requiring a fresh TPM PCR quote from the primary host.
    *   **Signature Lock:** The witness blocks co-signing if the host's attestation quote reveals any unchecksummed runtime files or kernel modifications.

---

## 🏛️ Tier H3 — Immutable Deployment Provenance

The software supply-chain must be secured from source repository to physical enclave, eliminating raw, unsigned package drift.

### 10. Sigstore / Cosign Release Signing
*   **Objective:** Guarantee the cryptographically verifiable origin of all container images.
*   **Build Deliverables:**
    *   **Keyless Cosign Workflows:** Integrate GitHub OIDC and Sigstore to cryptographically sign all OCI images during release pipelines.
    *   **Deployment Gatekeeper:** Enforce admission controllers that reject container spawning unless valid, non-expired container signatures are verified.

### 11. Immutable OCI Digests
*   **Objective:** Terminate tag-spoofing attacks (e.g., swapping a production image under a mutable tag).
*   **Build Deliverables:**
    *   **Digest Gating:** Enforce that all image references are pinned to sha256 digests rather than tag strings (e.g., `image@sha256:...`).
    *   **Deterministic Registry Mirroring:** Configure a local pull-through registry that caches digests locally and verifies their bit-perfect match.

### 12. SLSA Level 3 Builds
*   **Objective:** Prevent unauthorized build-time file injection or tampering.
*   **Build Deliverables:**
    *   **Isolated Build Workflows:** Execute builds in ephemeral, isolated environments with non-falsifiable build provenance.
    *   **Provenance Verification Engine:** Automatically inspect and verify build provenance logs on the staging clusters before deploying node updates.

---

## 🏛️ Tier H4 — Cryptographic Time Anchoring

If local system clocks can be manipulated by malicious admins or NTP spoofing, replay attacks and epoch bypasses remain possible.

### 13. Trusted RFC 3161 Timestamping
*   **Objective:** Bind coordination transactions to external, cryptographically signed hardware clocks.
*   **Build Deliverables:**
    *   **TSA Client Loop:** Modify transaction serialization to fetch cryptographically signed Time-Stamp Tokens (TST) from external Trusted Time Authorities (TSA).
    *   **Envelope Embedding:** Embed the TST directly into the transactional outbox payload, securing the sequence block against local clock manipulation.

### 14. Rekor Transparency Log
*   **Objective:** Publish immutable state hashes to a public or consortium ledger to prevent retroactive history rewriting.
*   **Build Deliverables:**
    *   **Rekor Ledger Anchoring:** Periodically (or per-transaction epoch) write state hashes, witness signatures, and attestation digests to an append-only Rekor transparency log.
    *   **Public Verification Verification:** Validate that local WAL sequences can be verified against the transparent log ledger.

### 15. Clock-Drift Hard Quarantine
*   **Objective:** Instantly lock down the node if local hardware timers diverge from trusted cryptographic time sources.
*   **Build Deliverables:**
    *   **Continuous Clock Verification:** Monitor NTP drift, physical CPU timers, and TSA timestamp deltas.
    *   **State Lockdown Transition:** Instantly quarantine the node and transition to `READ_ONLY` if discrepancy exceeds 10 milliseconds, shutting down PostgreSQL single-writer leases.

---

## 🚫 Prohibited Operations & Non-Goals in Phase 11B
*   ❌ **Dynamic Virtualization Hypervisors:** Host microVM managers must remain static and configured out-of-band.
*   ❌ **In-VM Dynamic Kernel Module Compilation:** VM guest kernels must remain read-only and static; raw drivers or modules cannot be loaded at runtime.
*   ❌ **Interactive Virtual Shells inside MicroVMs:** All operator interactions must go through the observatory and signed release protocols; direct SSH or console entry is strictly prohibited.
*   ❌ **Decentralized Time Consensus Protocols:** Avoid peer-to-peer clock voting schemas; rely strictly on authoritative RFC 3161 hardware time stamp providers and signed network timers.

---

## ⚠️ Operational Reality Constraints & Trust Limits

### 1. Root-of-Trust Recursion (The Bootstrap Boundary)
TPM attestation, remote quotes, and signed OCI images do not fully eliminate trust dependence; they merely displace it. We explicitly acknowledge that ZTAN's security depends on a recursive trust bootstrap authority:
*   **The Verifier Verification Problem:** The entities verifying the TPM quotes, the OPA Rego sidecars, and the Rekor transparency ledger must themselves be trusted.
*   **Anchor Separation:** To mitigate this recursion, trust anchors (such as the Root Certificate Authority for TPM manufacturer keys and SLSA provenance verifiers) must be stored in hardware write-once-read-many (WORM) configurations on dedicated, read-only hardware.

### 2. Calibrating Sandbox Boundaries: Firecracker vs. gVisor vs. Seccomp
We explicitly reject the conceptual collapse of virtualization into a singular "secure sandbox." These technologies occupy distinct layers of the containment matrix:
*   **Firecracker:** Provides hardware/VM-level multi-tenant host security. It represents a strict boundary against guest-to-host kernel privilege escalation.
*   **gVisor:** Solves V8 syscall interception at the user-space boundary, shielding the host kernel from dynamic guest actions.
*   **Seccomp-BPF:** An attack surface reduction utility to restrict the V8 system-call interface, not an isolation boundary.
*   **Read-Only Rootfs:** Minimizes post-compromise persistence but does not prevent runtime memory modification.

### 3. The Latency vs. Verification Trade-off
We deprioritize the `<100ms MicroVM Startup` target as a primary engineering objective when it conflicts with verification depth.
*   **Rigorous Integrity First:** Startup sequences must prioritize full TPM measurement, secure launch checks, and remote attestation handshakes over raw speed. If attestation or OCI digest verification adds 2–3 seconds of latency, it must be fully absorbed without bypassing safety checks.

### 4. Trusted Computing Base (TCB) Minimization (Future Stratum)
The current ZTAN runtime includes an excessively large TCB (Node.js engine, V8, PostgreSQL runtime, etcd client, npm dependency trees). While Phase 11B isolates these boundaries, it does not minimize the TCB.
*   **Long-Term TCB Goal:** Future phases must target the compilation of critical coordination components into statically linked, dependency-free binaries (e.g., in Rust or Go) running directly on minimal microkernels with zero host operating system abstraction.

### 5. Operational Survivability & Attestation Failure Modes (Graceful Degradation)
To prevent extreme high-assurance brittleness (where transient network partitions, TSA authority timeouts, or legitimate firmware updates trigger immediate node paralysis), ZTAN establishes strict degraded operation limits:
*   **Decoupled Local Outbox Logging:** If external Trusted Time Services (TSA) or Rekor logs are partitioned, the local single-writer node will temporarily cache state transitions locally. It issues high-priority SRE alert events and markers, operating in a "Degraded Integrity State" for a maximum of 60 minutes before transitioning to self-quarantine.
*   **Offline Operator Re-Admission Ceremonies:** When host upgrades legitimately drift TPM PCR values, the system enters `READ_ONLY` mode. Re-admitting the node requires a physical multi-signature ceremony utilizing offline Tier D hardware security keys, bypassing attestation-mismatch locks via highly audited human consensus.
*   **Partition-Tolerant Local Witnessing:** During detached witness networking drops, a primary node may continue execution of local low-blast-radius advisory workflows while dropping all database write capabilities until communication is securely restored.

### 6. Trust-Anchor Compromise & Key Revocation Governance (Supply Chain Breaches)
Silicon and infrastructure supply chains are inherently vulnerable to out-of-band compromise. ZTAN explicitly models and prepares for compromise of its highest-level trust anchors:
*   **Manufacturer & Silicon Key Revocation:** If physical TPM vendor certificates or Intel/AMD attestation service signing keys are compromised, the runtime rejects automated attestation validation. The system immediately shifts to a degraded verification state that relies on external cross-kernel witness consensus and emergency operator key validations until manufacturer roots can be rotated.
*   **OIDC & CI Provenance Rollback:** In the event that a CI/CD build provenance emitter (e.g., GitHub Actions token issuer) or OIDC signing authority is poisoned, ZTAN's deployment gatekeeper halts automatic container updates. Operators can perform emergency deployments strictly via off-line, key-signed manual OCI digests validated at the CLI.
*   **Transparency Log Equivocation Safeguards:** The primary coordinator and off-host witness independently sign and verify all Rekor log submissions. If the transparency log is compromised or equivocated (e.g., presenting a split-view of transaction history to different nodes), the mismatch triggers immediate self-fencing across the coordination cluster.
*   **Emergency Trust-Anchor Rollover Protocol:** Emergency rotation of trusted certificate authorities, root public keys, and Rekor ledger endpoints must go through highly restricted Tier D human quorum overrides. This ceremony requires physical WebAuthn security keys and offline multi-sig validations, preventing compromised automated tools from rewriting system roots.

---

## 📊 Objective Maturity Targets

> [!NOTE]
> **Heuristic Metric Interpretation**
> The percentages represented in this table serve as **relative assurance progression heuristics** comparing planned design coverage against baseline states. They do *not* represent absolute, mathematically derived probability metrics of security or perfect, zero-compromise sovereignty.

| Dimension | Baseline (Phase 11A) | Phase 11B Target |
| :--- | :---: | :---: |
| **Substrate Integrity Verification** | **Weak (15%)** | **Strong (90%)** |
| **Execution Isolation Boundary** | **Moderate (45%)** | **Strong (95%)** |
| **Witness Separation Cohesion** | **Moderate (35%)** | **Strong (85%)** |
| **Chronological Non-Repudiation** | **Weak (10%)** | **Strong (80%)** |
| **Build Provenance Reliability** | **Moderate (50%)** | **Strong (90%)** |


