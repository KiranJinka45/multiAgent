# ZTAN Operator Certification Guide

This guide outlines the requirements and curriculum for becoming a Certified ZTAN Operator (CZO).

## 1. Overview
The CZO certification ensures that institutional operators possess the technical proficiency to maintain, troubleshoot, and secure ZTAN pilot cells in production environments.

## 2. Curriculum

### Module 1: Architectural Foundations
- Zero-Trust Runtime principles.
- Merkle-anchored governance models.
- Hardware Root-of-Trust (TPM/HSM) basics.

### Module 2: Operational Tooling
- Mastery of `ztanctl`.
- Interpreting `auto diagnose` reports.
- Managing the `InstitutionalPilotRegistry`.

### Module 3: Incident Response (IRM)
- Executing Playbook-01: Governance Lineage Breach.
- Executing Playbook-02: TPM Lockout.
- Stakeholder communication during P1 incidents.

### Module 4: Compliance & Auditing
- Generating Signed Security Bundles.
- Verifying Artifact Provenance.
- Data residency enforcement.

## 3. Practical Lab (ztanctl support certify)
The practical exam is conducted via the CLI and includes:
1. **Diagnosis**: Identify a simulated consensus stall.
2. **Remediation**: Execute a module freeze and rollback.
3. **Evidence**: Generate a cryptographically signed audit bundle for the resolved incident.

## 4. Maintenance of Certification
Operators must re-certify every 12 months or after major ZTAN version upgrades (e.g., V2.5 to V3.0).

---
**Institutional Training Board** 🎓
