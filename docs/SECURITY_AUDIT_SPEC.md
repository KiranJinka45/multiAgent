# Security Audit Specification

This document defines the requirements and procedures for independent external security verification of the ZTAN platform.

## 1. Adversarial Survivability
ZTAN must demonstrate resistance to the following adversarial vectors:
- **Malicious Replay**: Injection of stale governance roots or state updates.
- **Lineage Corruption**: Attempts to fork the institutional state history.
- **Consensus Takeover**: Malicious majority formation in a federated cell.

## 2. Supply Chain Integrity
- **Provenance**: All binaries must be signed using Sigstore/Cosign-compatible institutional identities.
- **Reproducible Builds**: The build pipeline must produce bit-for-bit identical binaries from the same source-of-truth commit hash.
- **SBOM**: A comprehensive Software Bill of Materials (SBOM) must be generated and verified for every release.

## 3. External Verification Roles
- **Security Auditor**: Authorized role capable of running simulations and verifying provenance.
- **Compliance Officer**: Role responsible for reviewing audit reports and SBOM finality.
