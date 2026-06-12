# Phase 19: Long-Term Telemetry Checkpoints - Context

**Gathered:** 2026-07-10
**Status:** Ready for planning

<domain>
## Phase Boundary

Define and implement long-term operational health telemetry checkpoints and alerts to monitor key system invariants over time, transitioning the platform into post-campaign maintenance mode.

</domain>

<decisions>
## Implementation Decisions

### Telemetry Checkpoints & Thresholds
- **D-01 (WAL Growth Threshold):** Defined as `< 50 MB / hour` under normal standby/witness replica workload.
- **D-02 (Lease-Renewal Latency Threshold):** Defined as p95 lease transaction execution latency `< 200 ms`.
- **D-03 (Backup Success-Rate Threshold):** Defined as ≥ 96.6% success rate (no more than 1 failed run in 30 days, matching campaign SLO).

### Telemetry Checker Script
- **D-04:** Implement a standalone TypeScript checker script at `scripts/long-term-telemetry-checker.ts`.
- **D-05:** The script must read latest telemetry and backup logs, compute windowed statistics, and check them against D-01, D-02, and D-03.
- **D-06:** Script exit codes: `0` for success (all thresholds satisfied), `1` for violation (any threshold breached).

### Alert Simulation
- **D-07:** The checker script must support a `--simulate-alert [wal|lease|backup]` command-line flag to inject a synthetic violation, ensuring the alert generation code path is testable and works.

### Evidence Generation
- **D-08:** Outputs validation results as a structured JSON artifact at `telemetry-history/long-term-telemetry-status.json` and prints a formatted markdown audit log to console.

### the agent's Discretion
- Exact formatting of console logs and alert messages.
- Specific alerting mechanisms (e.g. logging to `stderr`, writing to syslog/systemd-journald).

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Operational Requirements & Plans
- `.planning/REQUIREMENTS.md` — Active v1.13.0 requirements (`OPS-MAINT-POST-01`)
- `.planning/PROJECT.md` — Milestone goals and target features
- `RELIABILITY_CAMPAIGN_PLAN.md` — Baseline details of reliability metrics

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/stewardship-drift-detector.ts` / `scripts/periodic-drift-runner.ts` — Example of drift checking and telemetry report parsing.
- `scripts/backup-integrity-validator.ts` — Example of backup checking and integrity validation.

### Established Patterns
- Scripts use `tsx` to run with TypeScript.
- Logs and reports are written to the `telemetry-history/` directory.

### Integration Points
- `scripts/long-term-telemetry-checker.ts` will connect to existing telemetry databases and logs under `telemetry-history/`.

</code_context>

<deferred>
## Deferred Ideas

- Automated remediation of WAL growth (e.g., auto vacuum triggers) — Deferred to future milestones.
- Multi-channel notification forwarding (Slack/PagerDuty API integrations) — Out of scope.

</deferred>

---

*Phase: 19-long-term-telemetry-checkpoints*
*Context gathered: 2026-07-10*
