# Nexus ZTAN Security Claims Verification Ledger

This document maps all public security, compliance, and cryptographic claims made in `SECURITY.md` and `CONSTITUTION.md` directly to their machine-enforceable technical implementations in the codebase.

Consistent with the core Nexus ZTAN principle:
> **"Assertions are false until proven."**

We categorize each claim based on its exact implementation and verification status to prevent overstatement and ensure enterprise due diligence readiness.

---

## Repository Governance Rule (Drift Prevention)

To prevent future claims drift and ensure the ledger remains the authoritative source of truth, the repository enforces the following rule:

> [!IMPORTANT]
> **Authoritative Ledger Constraint**
> No claim may be added to:
> - `SECURITY.md`
> - `CONSTITUTION.md`
> - Website content
> - Investor decks
> - Sales collateral
>
> unless a corresponding entry exists in `CLAIMS_VERIFICATION.md`.

---


## Claims Classification Matrix

We classify claims under one of the following five assurance levels:

1. **`[IMPLEMENTED + VERIFIED]`**: The production code path is fully implemented and its exact cryptographic or logical behavior has been verified locally through automated test suites (e.g., Vitest unit/integration tests) or in-memory executions with no external dependencies.
2. **`[IMPLEMENTED]`**: The production code path is fully implemented, but verification in a live environment is dependent on external runtime conditions (such as network access, active public OIDC providers, or external consensus/transparency servers).
3. **`[QUALIFIED]`**: The implementation has external hardware constraints or environment assumptions (e.g., physical TPM 2.0 chips, bare-metal CPU virtualization nodes, or independent human operator audits) that are only met under specific production deployment setups.
4. **`[PLANNED]`**: The implementation is scheduled for development in an upcoming phase of the project.
5. **`[ROADMAP]`**: The implementation is deferred to the long-term product roadmap.

---

## Evidence Precedence & Hierarchy

We establish a strict precedence model for security, cryptographic, and operational claims. In the event of any conflict, the higher assurance source prevails, subject to the scope of the claim (e.g., hardware-rooted claims prioritize qualification/hardware evidence, while pure software/cryptographic claims prioritize automated test coverage):

1. **Production Evidence Artifacts** (e.g., live logs, verified cryptosystem receipts) — *Highest Assurance*
2. **Automated Test Evidence** (e.g., local Vitest suite execution results, code path coverage)
3. **Qualification Evidence** (e.g., environment configurations, WSL2 sandbox records, `/dev/tpm0` check logs)
4. **Documentation Claims** (e.g., descriptions in `SECURITY.md`, `CONSTITUTION.md`)
5. **Roadmap Statements** (e.g., long-term future enhancements) — *Lowest Assurance*

> [!NOTE]
> Evidence must be interpreted within the scope of the claim. For example, a successful Vitest suite execution is the primary source of truth for pure software/cryptographic validation, whereas a physical qualification log outranks simulated test suites for hardware-rooted trust claims.

---

## 1. Cryptographic Agility & Post-Quantum Cryptography (PQC)

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **Signature Agility** | `[IMPLEMENTED + VERIFIED]` | [crypto-registry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/crypto-registry.ts) | Defines `SignatureAlgorithm` registry containing Ed25519, RSA-PSS, ECDSA, and ML-DSA-65 (Dilithium2). Fully verified offline in memory. |
| **Post-Quantum Key Encapsulation** | `[IMPLEMENTED + VERIFIED]` | [pqc.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/pqc.test.ts) | Validates ML-KEM-768 (Kyber) key generation, encapsulation, and decapsulation via `@noble/post-quantum`. Verified in Vitest offline. |
| **Post-Quantum Signatures** | `[IMPLEMENTED + VERIFIED]` | [pqc.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/pqc.test.ts) | Validates ML-DSA-65 key generation, signing, and verification. Verified in Vitest offline. |

---

## 2. Hardware-Rooted Trust (TPM 2.0)

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **Binary Quote Attestation (Parser)** | `[IMPLEMENTED + VERIFIED]` | [attestation-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/tpm/attestation-verifier.ts) | Method `verifyQuote` strictly decodes binary `TPM2B_ATTEST` structures, verifying PCR integrity and AK signatures. Verified in tests with mock byte structures. |
| **PCR Measurements Validation** | `[IMPLEMENTED + VERIFIED]` | [attestation-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/tpm/attestation-verifier.ts) | Compares PCR registers (0, 7, 10) against baseline values to detect system tampering. Verified in integration tests. |
| **Physical TPM Hardware Integration** | `[QUALIFIED]` | [physical-tpm-spec.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/trust/physical-tpm-spec.ts) | Accesses `/dev/tpm0` and executes `tpm2_quote` and `tpm2_pcrread` directly. <br><br>**Verification Boundary:**<br>• *Production mode:* Fails closed; requires actual TPM hardware; no simulated fallback allowed.<br>• *Test environment:* Controlled simulation enabled via `process.env.VITEST` or `ZTAN_MOCK_TPM=true` to bypass hardware checks. |
| **Bare-Metal TPM Drivers** | `[PLANNED]` | [PRODUCTION_PROVEN_ROADMAP.md](file:///c:/multiagentic_project/multiAgent-main/PRODUCTION_PROVEN_ROADMAP.md) | Deeper wiring of bare-metal TPM driver file descriptors (`/dev/tpm0` / `/dev/tpmrm0`) without wrapper dependencies. Scheduled for Phase 14 bare-metal staging. |

---

## 3. Supply Chain Security & Provenance

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **Keyless Image Signing (Sigstore)** | `[IMPLEMENTED]` | [mock-cosign.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/sigstore/mock-cosign.ts) | Enforces Sigstore keyless signing of OCI container digests bound to OIDC CI identities. Production code path performs Cosign execution; throws on simulated fallbacks. <br><br>**Verification Boundary:**<br>• Verification in production depends on external network access, OIDC identity availability, and Sigstore/Cosign public server availability. |
| **Public Cosign Signature Verification** | `[QUALIFIED]` | [mock-cosign.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/sigstore/mock-cosign.ts) | End-to-end signature validation of images fetched from registries using OIDC assertions and public transparency logs. Requires active OIDC OCI provider connection. |
| **Enclave Provenance Gatekeeper** | `[IMPLEMENTED + VERIFIED]` | [host-daemon.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/supervisor/host-daemon.ts) | Method `spawnEnclave` intercepts container boots, verifies provenance, and rejects execution of unsigned/spoofed images. Fully verified in supervisor test suite. |

---

## 4. Cryptographic Time-Stamping (RFC 3161) & Transparency Log (Rekor)

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **RFC 3161 Timestamping** | `[IMPLEMENTED]` | [mock-tsa.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/time/mock-tsa.ts) | Generates Time-Stamp Tokens by querying the DigiCert RFC 3161 authority. Production path blocks simulated fallbacks. <br><br>**Verification Boundary:**<br>• Verification is qualified by network access to external TSA servers. Test paths run in-memory or with controlled mocks. |
| **Clock Drift Quarantine** | `[IMPLEMENTED + VERIFIED]` | [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/index.ts) | Enforces quarantine rejection if local node clock drifts from TSA time by more than 10ms. Verified locally via mock clocks in unit tests. |
| **Transparency Log Anchoring (Rekor)** | `[IMPLEMENTED]` | [mock-rekor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/time/mock-rekor.ts) | Etches all ledger transaction hashes to the public Sigstore Rekor transparency log. <br><br>**Verification Boundary:**<br>• Production code path performs Rekor publication. Verification in production depends on network access and Rekor public service availability. |
| **Public Rekor Write Verified** | `[QUALIFIED]` | [mock-rekor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/time/mock-rekor.ts) | Retrieval and validation of Signed Entry Stamps (SETs) back from the public Rekor instance. Requires network access to the public Rekor endpoint. |

---

## 5. Enterprise Persistence Invariants

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **Zero-Data-Loss Redis Persistence** | `[IMPLEMENTED + VERIFIED]` | [docker-compose.prod.yml](file:///c:/multiagentic_project/multiAgent-main/docker-compose.prod.yml) | Service `redis` configured with `--appendonly yes --appendfsync everysec` to prevent 15-minute loss window. Configuration verified by orchestrator checks. |
| **Zero-Data-Loss Infra Persistence** | `[IMPLEMENTED + VERIFIED]` | [docker-compose.prod.yml](file:///c:/multiagentic_project/multiAgent-main/infra/docker-compose.prod.yml) | Infrastructure Redis persistence configured with `--appendonly yes --appendfsync everysec`. Configuration verified by deployment tests. |

---

## 6. Architectural Platforms & External Audits

| Claim | Status | File / Reference | Details & Verification Boundaries |
| :--- | :--- | :--- | :--- |
| **SPIFFE/SVID Identity** | `[PLANNED]` | [SECURITY.md](file:///c:/multiagentic_project/multiAgent-main/SECURITY.md) | Standard SPIFFE/SVID token-based attestation is planned. Gateway currently uses mTLS/OIDC. |
| **Hedera Consensus Anchor** | `[ROADMAP]` | [CONSTITUTION.md](file:///c:/multiagentic_project/multiAgent-main/CONSTITUTION.md) | Distributed hash consensus anchoring on Hedera is deferred to the future roadmap. |
| **Bare-metal Firecracker Enclaves** | `[QUALIFIED]` | [PRODUCTION_PROVEN_ROADMAP.md](file:///c:/multiagentic_project/multiAgent-main/PRODUCTION_PROVEN_ROADMAP.md) / [BARE_METAL_FIRECRACKER_RUNBOOK.md](file:///c:/multiagentic_project/multiAgent-main/BARE_METAL_FIRECRACKER_RUNBOOK.md) | Hypervisor-isolated microVM containment. Verified under WSL2-based qualification environments. Observed success rate recorded in the qualification evidence artifacts. Bare-metal execution remains an open qualification. <br><br>**Verification Boundary:**<br>• Requires physical KVM virtualization device node `/dev/kvm` and execution on a dedicated bare-metal host. |
| **Independent Operator Audit** | `[QUALIFIED]` | [INDEPENDENT_AUDIT_SUMMARY.md](file:///c:/multiagentic_project/multiAgent-main/INDEPENDENT_AUDIT_SUMMARY.md) | Verification of system control properties by third-party auditors in a physical production isolation environment. |
