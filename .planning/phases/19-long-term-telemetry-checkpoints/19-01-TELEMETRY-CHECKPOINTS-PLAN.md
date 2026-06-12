---
wave: 1
depends_on: []
files_modified:
  - scripts/long-term-telemetry-checker.ts
autonomous: true
requirements:
  - OPS-MAINT-POST-01
---

# Plan 19-01: Long-Term Telemetry Checkpoints

Define, monitor, and validate long-term operational health telemetry checkpoints and alerts to monitor key system invariants over time.

## Tasks

<task>
<action>
Create the telemetry checker script at `scripts/long-term-telemetry-checker.ts`.
- Implement parsing of database and system telemetry logs from `telemetry-history/`.
- Configure the three key thresholds:
  - **WAL Growth:** `< 50 MB / hour` under normal witness/replica workload.
  - **Lease Renewal Latency:** p95 transaction latency `< 200 ms`.
  - **Backup Success Rate:** `≥ 96.6%` success (no more than 1 failed run in 30 days, matching campaign SLO).
- Calculate current metrics from logs and compare them against the thresholds.
- Implement `--simulate-alert [wal|lease|backup]` command-line flag to inject simulated breaches and print clear warning alert logs to stdout/stderr.
- Generate a structured JSON report at `telemetry-history/long-term-telemetry-status.json` containing the status of all checks.
- Exit with code `0` on success and `1` on threshold breach.
</action>
<acceptance_criteria>
- Script runs successfully using `npx tsx scripts/long-term-telemetry-checker.ts`.
- Correctly parses logs and flags any threshold breach.
- Simulated alerts print clear warning messages and exit with code `1`.
- Evidence report `telemetry-history/long-term-telemetry-status.json` is generated correctly.
</acceptance_criteria>
</task>

## Verification
- Run default validation: `npx --no-install tsx scripts/long-term-telemetry-checker.ts`
- Run alert simulation for WAL growth: `npx --no-install tsx scripts/long-term-telemetry-checker.ts --simulate-alert wal`
- Run alert simulation for lease latency: `npx --no-install tsx scripts/long-term-telemetry-checker.ts --simulate-alert lease`
- Run alert simulation for backup validation: `npx --no-install tsx scripts/long-term-telemetry-checker.ts --simulate-alert backup`
