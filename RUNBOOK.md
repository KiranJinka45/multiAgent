# Nexus ZTAN Institutional Runbook (Stewardship Era) 🏛️

This document provides the necessary protocols for managing the Nexus ZTAN platform during its post-finality stewardship era.

## 🚀 1. Provisioning Institutional Operators
Access is strictly governed to ensure institutional stability.

**Protocol:**
1. Collect tester email and full name.
2. Run the provisioning script:
   ```bash
   npx tsx scripts/provision-beta-user.ts <email> "<name>"
   ```
3. Verify the output displays a `tenantId` (format: `tnt_xxxxxxxx`).
4. Send the user the login link.

---

## 🛡️ 2. Abuse & Security
**Protocol for Malicious Activity:**
1. **Kill Switch**: If a tenant is identified as abusive, use the SRE Dashboard to set their status to `suspended`.
2. **Rate Limit Hardening**: Update `RATELIMIT_POINTS` environment variable to tighten global constraints.

---

## 📈 5. Operational SLIs & Coordination Metrics
Monitor these metrics in the Prometheus and SRE dashboards to ensure authority-preserving alignment:
- **`lease_fencing_revocations_total`**: Cumulative count of nodes failing lease heartbeats and entering self-fenced step-down.
- **`postgres_wal_replay_lag_bytes`**: Lag in bytes between primary PostgreSQL lease oracle and standbys.
- **`heartbeat_drift_seconds`**: Latency distribution of lease renewal signals (Alert if 95th percentile > 5s).
- **`invariant_breaches_total`**: Number of core ZTAN blockchain timeline mismatches or Byzantine divergence attempts.

---

## 🧬 6. Fail-Closed Fencing & Stale Lease Recovery
If an operator node becomes partitioned or experiences GC pauses exceeding 12.5 seconds:
1. The heartbeat daemon will automatically trigger **Self-Fencing Step-Down**.
2. Write operations on that node are instantly halted (CP-oriented fail-closed).
3. SRE Action: Confirm filesystem lock file (`.ztan-transparency/ledger.lock`) is cleaned up, or run the stale lock recovery check:
   ```bash
   npx tsx scripts/forensic-verifier.ts
   ```

---

## 🔍 7. Byzantine Drift & Timeline Quarantining
If the Outbox worker detects that PostgreSQL block hashes diverge from local authoritative files:
1. It halts synchronization immediately and downgrades the affected local block sequence to `UNTRUSTED`.
2. SRE Action: Run the forensic verifier to isolate the modified database or local ledger segments:
   ```bash
   npx tsx scripts/forensic-verifier.ts
   ```
3. Inspect the certified export payload:
   `cat .planning/telemetry/forensic-audit-latest.json`

---

## 🧪 8. Troubleshooting Worker Failures
If missions stay in `pending` or `running` forever:
1. Check BullMQ Dashboard (Redis).
2. Check `WatchdogService` logs in the API.
3. Restart workers if the heartbeat is stale.

