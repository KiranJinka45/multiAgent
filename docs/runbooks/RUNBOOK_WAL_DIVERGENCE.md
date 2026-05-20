# Runbook: WAL Sequence Divergence

## 1. Trigger Condition
The `wal_drift_detected` metric alerts that a read-replica or recovery node's PostgreSQL WAL (Write-Ahead Log) sequence has diverged from the authoritative primary by an unrecoverable magnitude.

## 2. Operator Capability Required
* Minimum Role: `SRE_ADMIN`
* Device: Desktop (Terminal + Governance Console)

## 3. Escalation Chain
1. This is a severe lineage integrity incident. Notify Data Engineering leads.
2. Halt all downstream data exports connected to the diverging replica.

## 4. Execution Workflow
1. Use the Governance Console to transition the diverging replica into the `READ_ONLY` state to stop all local processing.
2. Export the `FORENSIC_EXPORT` of the replica's final sequences for the Failure Evidence Archive.
3. The diverging replica must be destroyed and re-cloned from the authoritative primary via infrastructure-as-code automation.
4. Under NO circumstances should an operator attempt to manually patch or stitch WAL sequences.

## 5. Rollback
No manual rollback. Destroy and rebuild is the only mathematically sound recovery path.
