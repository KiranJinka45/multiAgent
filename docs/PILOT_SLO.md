# ZTAN Pilot Service Level Objectives (SLOs)

**Objective**: To establish measurable success criteria for the controlled multi-operator pilot.

## 1. Reliability & Determinism
- **Replay Consistency**: ≥99.99% identical `outcomeHash` across heterogeneous nodes.
- **Quorum Convergence**: <15 minutes to reach consensus after a network partition heal.
- **Recovery Time Objective (RTO)**: <30 minutes to restore full governance after a system-wide halt.

## 2. Governance & Pluralism
- **Unauthorized Finalization**: 0 incidents.
- **Coalition Detection Sensitivity**: ≥95% successful identification of simulated coalition drift.
- **Institutional Independence**: 100% adherence to jurisdictional and infrastructure diversity rules.

## 3. Forensic & Audit
- **Evidence Completeness**: 100% of governance acts MUST have an exportable, audit-ready forensic receipt.
- **Independent Replay Success**: ≥95% of receipts successfully replayed by external auditors in air-gapped environments.
- **Provenance Verification**: 100% of running binaries MUST match signed provenance attestations.

## 4. Operational Ergonomics
- **Incident Resolution**: ≥90% of governance incidents resolved strictly following the `GOVERNANCE_RUNBOOK`.
- **Operator Fatigue**: <2 manual interventions required per node per week (Steady State).
- **Transparency Reporting**: 100% on-time delivery of weekly Institutional Posture Reports.

## 5. Failure Tolerance
- **Partition Survival**: 100% safety preserved during partitions (Liveness may degrade).
- **Byzantine Rejection**: 100% of forged receipts from <33% of nodes MUST be rejected.
- **Recovery Certification**: 100% of operators MUST pass monthly recovery drills.
