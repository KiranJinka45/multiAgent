# Runbook: Quarantine Release Ceremony

## 1. Trigger Condition
A partition or infrastructure node is placed into the `QUARANTINED` state automatically by lineage integrity validation failure, or manually via an `SRE_ADMIN`.

## 2. Operator Capability Required
* Minimum Role: `SRE_ADMIN` or `RECOVERY_OPERATOR`
* Hardware: WebAuthn/FIDO2 hardware key (YubiKey/Titan) physically inserted.
* Device: Desktop Viewport required (Mobile/Tablet explicitly hard-blocked).

## 3. Escalation Chain
1. Primary SRE identifies the quarantine alert on the `sre-cockpit`.
2. SRE verifies forensic telemetry to ensure the fault was transient or remediated.
3. SRE must acquire a secondary operator's hardware signature (2-of-2 Quorum).

## 4. Execution Workflow
1. Navigate to `/sre-cockpit/partition/{id}`.
2. The UI explicitly forbids direct `QUARANTINED` $\rightarrow$ `ACTIVE` transitions.
3. Click **Initiate Recovery Ceremony**.
4. Both operators must tap their WebAuthn keys to submit the cryptographic quorum.
5. The state transitions to `REBUILDING`.
6. Wait for PostgreSQL authoritative confirmation that WAL sequences have synchronized.
7. System automatically transitions to `ACTIVE`.

## 5. Rollback
If `REBUILDING` fails due to persistent faults, the node immediately reverts to `QUARANTINED` and the incident is escalated to the Infrastructure Director.
