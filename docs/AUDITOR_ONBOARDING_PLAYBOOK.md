# ZTAN External Auditor Onboarding Playbook (v1.0)

Welcome to the ZTAN Institutional Oversight program. This playbook provides the procedures necessary for an external auditor to verify the cryptographic integrity and operational stability of a ZTAN federation.

## 1. Environment Setup

Auditors must interact with the system via the `ztanctl` command-line interface.

1.  **Install ztanctl**:
    ```bash
    npm install -g @ztan/ztanctl
    ```
2.  **Initialize Auditor Profile**:
    ```bash
    ztanctl onboard-auditor --org "Your-Audit-Firm"
    ```
    *This generates your local Auditor Identity and connects to the Institutional Trust Surface.*

## 2. Core Verification Procedures

### A. Lineage Integrity Check
Verify that the current governance epoch is anchored to the historical root chain.
```bash
ztanctl report --role auditor
```
Look for: `Survivability Grade: A` and `Status: SOVEREIGN_STABLE`.

### B. Evidence Spot-Check
Randomly select a mission ID and verify its Merkle inclusion proof.
```bash
ztanctl verify --mission [MISSION_ID] --depth full
```

### C. Restraint Audit
Verify that the system is operating within the constitutional token and compute bounds.
```bash
ztanctl certify --type restraint
```

## 3. Incident & Dispute Procedures

If a "CRITICAL_DRIFT" or "ISOLATION_BREACH" is detected:

1.  **Quarantine Trigger**:
    ```bash
    ztanctl quarantine --cell [CELL_ID] --reason "Auditor detected unverified state divergence"
    ```
2.  **Forensic Retrieval**:
    Export a full forensic evidence packet for independent replay.
    ```bash
    ztanctl export --mission [MISSION_ID] --format forensic
    ```

## 4. Certification Criteria

An auditor may issue a **Sovereign Stability Certificate** if:
- Determinism Rate > 99% over the last 30 days.
- Zero unrecovered isolation breaches.
- Drift Acceleration < 0.001.

---
*Questions? Contact the ZTAN Institutional Support Team.*
