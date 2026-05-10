# ZTAN End-to-End Reproducibility Manifest

**Status**: STABLE (v1.0.0)
**Objective**: To ensure institutional replay is identical across all physical and infrastructure variances.

## 1. Build Layer (Hermetic)
- **Compiler**: TypeScript 5.4.x / Node.js v20.x (Distroless Base)
- **Dependency Strategy**: Yarn `zero-installs` with immutable lockfile.
- **Artifact Signing**: All binaries MUST be signed by the Institutional Build Key.
- **SBOM**: SPDX-compliant manifest included in every artifact attestation.

## 2. Runtime Layer (Deterministic)
- **Hypervisor**: Firecracker v1.7.0 (Strict Seccomp Profile).
- **Kernel**: Linux 6.1-LTS (ZTAN Minimal Configuration).
- **Entropy Source**: Replay Oracle-driven (Zero-entropy guest environment).
- **Time Source**: Monotonic Epoch Time (Injected via VMM).

## 3. Infrastructure Layer (Heterogeneous)
- **Cloud Providers**: AWS (Nitro), GCP (Shielded VMs), Bare Metal (Direct VMM).
- **Network Protocol**: WireGuard-encrypted federated gossip.
- **Persistence**: HA Postgres with logical replication for audit trails.

## 4. Verification Layer (Independent)
- **Auditor Hardware**: Air-gapped, TPM-protected nodes.
- **Verification Logic**: Parallel Replay of signed `FederatedGovernanceReceipts`.
- **Divergence Tolerance**: ZERO bytes mismatch in `outcomeHash`.

## 5. Environment Lineage Tracking
Every `GovernanceReceipt` MUST include a `ManifestHash` identifying the exact build and runtime environment used for the execution.
