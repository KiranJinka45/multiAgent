# ZTAN Operator Survival Kit (Phase 9.3)

> [!NOTE]
> This survival kit is designed for local test clusters and controlled simulated staging environments. It provides bounded recovery playbooks under tested failure scenarios, and does not claim absolute survivability, absolute resilience, or Byzantine-safe consensus in unconstrained open-internet production environments.

This document is designed for SREs and Infrastructure Operators who are not authors of the ZTAN platform. It provides the necessary context to troubleshoot system failures and restore coordinated state progression.

## 🏛️ The Operational Philosophy
In ZTAN, **Containment is more important than Throughput.** If you detect a failure, the first priority is isolation, not restoration.

## 🚨 Critical Indicators (Interpretation)

| Indicator | Meaning | Immediate Action |
| --- | --- | --- |
| `Isolation Violation` | A sandbox breach was detected. | **Quarantine the Cell.** Run `scripts/isolation-watchdog.ts`. |
| `Semantic Drift > 30%` | Behavioral divergence detected. | **Pause Missions.** Re-validate baseline in `LongitudinalAnalyzer`. |
| `Stability Score < 80` | **Predictive Risk.** System is degrading. | **Schedule Bounded Maintenance.** Rotate keys or perform cell resurrection. |
| `Merkle Gap` | State lineage divergence. | **Hard Stop.** Verify history against Governance Merkle Tree. |

## 🛠️ Recovery Workflows

### 1. Cell State Corruption (Resurrection)
If a cell's database or state becomes inconsistent with its evidence lineage:
1. Identify the last verified evidence packet hash.
2. Run the recovery drill: `npx ts-node scripts/survival-drill.ts --scenario state-corruption`.
3. Follow the instructional prompts to reconstruct the state from the signed archive.

### 2. Identity Rotation (Breach Protocol)
If a cell's private key is suspected of being compromised:
1. Revoke the key in the Governance Root.
2. Run: `npx ts-node scripts/survival-drill.ts --scenario identity-rotation`.
3. The system will guide you through generating a new keypair and re-signing the epoch lineage.

### 3. Documentation-Only Recovery
If the system is offline and tools are unavailable:
- Reference the `Evidence Dossiers` in the `evidence/` directory.
- All dossiers are Merkle-linked and signed. They can be manually verified using standard cryptographic tools (openssl/gpg) if necessary.

## 📋 Survival Commands
- **Check Health:** `npx ts-node scripts/pilot-transparency-dashboard.ts`
- **Generate Evidence Pack:** `npx ts-node scripts/generate-trust-report.ts`
- **Verify Isolation:** `npx ts-node scripts/verify-tenant-isolation.ts`

## 💾 Durability & Filesystem Assumptions

The Write-Ahead Log (WAL) and Atomic Snapshot layers rely on physical filesystem guarantees to survive power loss and hard crash scenarios.

### 1. Platform-Specific Durability Barriers
* **UNIX/POSIX (Linux, macOS)**: ZTAN enforces **Parent Directory `fsync`** barriers. During WAL rotations, segment creations, and atomic snapshot renames, ZTAN opens the parent directory's file descriptor and calls `fsync()` directly. This guarantees catalog directory metadata updates are committed to non-volatile storage blocks, preventing directory entry loss.
* **Windows (Win32/NTFS)**: Opening directory descriptors for writing is blocked at the OS layer (`EPERM`). On Windows, ZTAN automatically bypasses parent directory `fsync` operations, relying strictly on file-level metadata flushes.

### 2. Supported Storage Environments
* **Local POSIX Journaling Filesystems**: Ext4, XFS, and APFS running on block storage. These provide fully reliable metadata and segment ordering guarantees.

### 3. Virtualization & Network Storage Limits (Warnings)
Operators must account for the following virtualized storage behaviors:
* **Docker Volumes & OverlayFS**: Under default `overlayfs` setups, directory `fsync` commands may become no-ops or trigger storage driver performance bottlenecks. SREs should use bind-mounts pointing directly to a host native ext4/XFS filesystem.
* **WSL2 (Windows Subsystem for Linux)**: WSL2 routes storage writes through virtual disk files (`ext4.vhdx`). A parent directory `fsync` inside WSL2 guarantees durability only up to the Hyper-V host cache, not to physical non-volatile silicon, unless the host drive cache flushing is explicitly secured.
* **Network Filesystems (NFS, SMB/CIFS)**: Calling `fsync` on directory handles is frequently ignored, returns errors, or introduces severe latency overhead. Running ZTAN WAL directories on shared network mounts is **strictly unsupported**.

---
*ZTAN Phase 9.3 — Bounded Operational Survivability Verified under Tested Scenarios.*
