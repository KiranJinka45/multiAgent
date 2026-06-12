# ZTAN Operator & Recovery Guide

This guide outlines the SRE operator interface and disaster-recovery commands using the `ztanctl` CLI.

## 🛠️ The ztanctl CLI Personas
All operations in ZTAN are role-restricted. Command execution requires passing the appropriate role flag:
- `--role sre`: Authorized for recovery execution, infra mutations, and diagnostics.
- `--role auditor`: Authorized for auditing and verifying lineage DAGs.

## 🔄 Core Recovery Commands

### 1. Verify Cluster Health & Drift Status
To check overall quorum, replication lag, and node status:
```bash
npx tsx packages/ztanctl/src/index.ts --role sre diag health
```

### 2. Execute One-Command Recovery (OCR)
To restore the coordinate database state from the latest validated WAL segment:
```bash
npx tsx packages/ztanctl/src/index.ts --role sre recovery execute
```

### 3. Run a Continuous Survivability Drill
To inject simulated failures (e.g., node drift, network partitions) and verify fail-closed quarantining:
```bash
npx tsx packages/ztanctl/src/index.ts --role sre recovery drill drift
```
