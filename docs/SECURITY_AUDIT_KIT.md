# Nexus ZTAN Security Audit Kit

This kit provides external security auditors and cryptographic reviewers with the necessary context to evaluate the Nexus ZTAN (Zero-Trust Autonomous Network) platform.

## 1. Security Architecture Overview

ZTAN is a **Governed Autonomous Execution Infrastructure** designed for institutional high-assurance workloads. Its security model is built on three pillars:
- **Zero-Trust Identity**: Every workload, node, and operator is identified via hardware-backed SPIFFE/SPIRE attestations.
- **Cryptographic Finality**: Governance decisions and state transitions are anchored in Merkle Trees and hardware Roots-of-Trust (TPM/HSM).
- **Post-Quantum Resilience**: Core signing and key exchange use NIST-standardized PQC algorithms (Dilithium and Kyber).

## 2. Cryptographic Primitives

### 2.1 Governance Merkle Trees
- **Compliance**: RFC 6962-compliant implementation.
- **Purpose**: Anchors the lineage of institutional governance. Every authority transfer or policy change is a leaf in the tree.
- **Verification**: Witness nodes perform logarithmic proof validation for every transaction.

### 2.2 Post-Quantum Cryptography (PQC)
- **Signature Scheme**: CRYSTALS-Dilithium.
- **Key Encapsulation**: CRYSTALS-Kyber.
- **Usage**: Used for high-value governance signing and long-term data encryption to protect against "harvest now, decrypt later" attacks.

## 3. Runtime Security

### 3.1 Zero-Trust Engine
- **mTLS**: Enforced across all service-to-service communication.
- **Identity-Aware Proxy (IAP)**: All external API access is gated by cryptographically signed HMAC requests.

### 3.2 eBPF-Based Intrusion Detection
- **Monitoring**: Runtime monitoring of syscalls and network flows.
- **Containment**: Automated quarantine of execution cells upon detection of anomalous behavior or security policy violations.

## 4. Audit Evidence Generation

ZTAN provides forensic evidence for every institutional action:
- **Audit Dossiers**: Human-readable reports summarizing Merkle proofs and hardware attestations.
- **SBOM (Software Bill of Materials)**: Full inventory of all components and dependencies, signed at build time.
- **Receipt Verification**: Every interaction generates a receipt that can be verified offline against the global governance root.

## 5. Reviewer Checklist

Auditors are encouraged to focus on:
1. **Merkle Consistency Proofs**: Verify that the governance tree cannot be diverged or forked.
2. **TPM Key Protection**: Audit the handoff between hardware-backed keys and the runtime signing engine.
3. **State Convergence**: Ensure that distributed nodes reach deterministic consensus on governance state.
4. **Adversarial Resilience**: Review the `adversarial-simulator` results for resistance against coordinated institutional attacks.

---
**Certified by ZTAN Security Board** 🛡️
