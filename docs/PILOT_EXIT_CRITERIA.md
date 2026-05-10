# ZTAN Pilot Exit Criteria

**Objective**: To define the formal thresholds required to transition from "Controlled Pilot" to "Production Substrate."

## 1. Reliability & Determinism (90-Day Stability)
- **Sustained Determinism**: 0 unexplained replay divergences for 90 consecutive days.
- **Heterogeneous Consistency**: 100% replay identicality across AWS, GCP, and Bare Metal nodes.
- **RTO Achievement**: Consistent <30 min recovery across all scheduled recovery drills.

## 2. Governance & Pluralism
- **Anti-Capture Integrity**: 0 unauthorized governance acts or unblocked coalition attempts.
- **Equilibrium Sensitivity**: High-confidence detection of 100% of simulated coalition drills with <5% false positive rate.
- **Jurisdictional Independence**: Successful coordination of governance acts across 3 legal jurisdictions.

## 3. Operational Ergonomics (Human Factors)
- **Runbook Adherence**: ≥95% of governance incidents resolved strictly following the `GOVERNANCE_RUNBOOK`.
- **Mean Time to Resolve (MTTR)**: Governance deadlocks or stagnations resolved in <4 hours (Operator response).
- **Manual Overrides**: <5% of governance acts requiring manual intervention (Goal: High Automation).
- **Operator Fatigue**: Consensus from 100% of pilot operators that the system is "Operable" and "Understandable."

## 4. Legitimacy & Audit
- **Independent Reproduction**: At least 2 external auditors must successfully reproduce 100% of pilot epoch results in air-gapped nodes.
- **Forensic Traceability**: 100% audit-ready forensic receipt coverage for all governance decisions.
- **Provenance Verification**: No unverified or un-signed artifacts permitted in the production-ready cluster.

## 5. Economic Sustainability
- **Cost Predictability**: Operating costs (Compute, Storage, Bandwidth) within ±10% of the baseline analysis.
- **Audit Overhead**: External verification must be achievable within the institutional resource constraints defined in the economics track.

**Final Approval**: Transition requires formal sign-off from all 5 participating institutions and 2 external observers.
