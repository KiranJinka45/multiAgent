# ZTAN Adversarial Threat Model

**Status**: INITIAL DRAFT (v0.1.0)
**Objective**: To formally identify, classify, and bound adversarial threats to the ZTAN institutional substrate.

## 1. Adversarial Classification
- **L1: Individual Malicious Operator**: A single witness node operator attempts to forge evidence or diverge replay.
- **L2: Quorum Coalition (Sub-33%)**: A minority group of institutions attempts to delay convergence or spoof metrics.
- **L3: Byzantine Majority (>33%)**: A coalition large enough to violate anti-capture rules and potentially halt or hijack governance.
- **L4: Infrastructure Compromise**: Attack on the underlying cloud provider, hypervisor (Firecracker), or OS.
- **L5: Supply-Chain Adversary**: Compromise of build artifacts, dependencies (SBOM), or CI/CD pipelines.

## 2. Threat Registry & Mitigation

| Threat | Impact | Mitigation | Status |
| --- | --- | --- | --- |
| **Insider Operator** | Evidence Forgery | Quorum Signatures & Merkle Inclusion Proofs | **ACTIVE** |
| **Witness Key Theft** | Impersonation | Hardware Security Modules (HSM) & Key Rotation | **PLANNED** |
| **Supply-Chain Poisoning** | Silent Divergence | Reproducible Builds & Provenance Attestation | **IN_PROGRESS** |
| **Hypervisor Escape** | Data Leakage | Firecracker MicroVM Isolation | **ACTIVE** |
| **Time Sync Attack** | Epoch Desync | Oracle-driven Deterministic Time | **ACTIVE** |
| **Log Truncation** | Forensic Loss | Replay-based Forensic Reconstruction | **ACTIVE** |
| **Quorum Gaming** | Capture | Equilibrium Engine & Entropy Monitoring | **ACTIVE** |
| **Legal Coercion** | Suppression | Jurisdictional Diversification & Federated Sovereignty | **SOCIAL** |

## 3. Trust Boundaries
- **Primary Boundary**: The interface between the host OS and the Firecracker microVM.
- **Governance Boundary**: The Federated Quorum (2/3 weighted consensus).
- **Legitimacy Boundary**: Independent Replay (External Auditors).

## 4. Residual Risks
- **Zero-Day Hypervisor Vulnerabilities**: Mitigated by minimizing VM footprint.
- **Undiscovered Cryptographic Weaknesses**: Mitigated by using NIST-standard primitives (SHA-256, ECDSA).
- **Social Engineering of Institutions**: Mitigated by institutional independence criteria and funding diversity.
