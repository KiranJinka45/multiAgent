---
id: 42-02
wave: 2
name: Forensic Integrity & Isolation
slug: forensic-integrity
phase: 42
objective: Verify that forensic evidence is undeniable and isolation is absolute.
requirements_addressed: [REQ-42.2]
---

# Plan 42-02: Forensic Integrity & Isolation

## Tasks
1. **Breach Simulation**: Execute `ztanctl drill breach` and trigger `scripts/preserve-incident.sh`.
2. **Signature Verification**: Implement a simple verification step in `scripts/verify-bundle.ts` to check SHA256 integrity of the incident bundle.
3. **Partition Validation**: Verify that `ztanctl isolate` correctly blocks traffic to/from the target cell at the firewall/network level (mocked or real).
