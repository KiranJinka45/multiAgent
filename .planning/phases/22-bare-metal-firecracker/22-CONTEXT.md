# Phase 22: Bare-Metal Firecracker Endurance Framework - Context

**Gathered:** 2026-07-11
**Status:** Ready for planning

<domain>
## Phase Boundary

Implement and validate Firecracker microVM endurance framework on a bare-metal Linux host without WSL2. This phase addresses the qualification on OPS-MAINT-FIRECRACKER-RUN-01 (Phase 15, v1.12.0) where the 100-iteration endurance campaign was executed under WSL2 KVM rather than native bare-metal hardware.

</domain>

<decisions>
## Implementation Decisions

### Host Requirements
- **D-01:** Host must be a non-WSL2 Linux system with native `/dev/kvm` access, confirmed via `systemd-detect-virt` returning "none".
- **D-02:** Firecracker binary, kernel image, and rootfs must be present and executable.

### Endurance Campaign
- **D-03:** Execute 100 consecutive microVM launches with guest command execution via vsock.
- **D-04:** Measure and record: `success_rate`, `mean_launch_ms`, `p95_launch_ms`, `mean_teardown_ms`.
- **D-05:** Monitor resource leaks across iterations: memory RSS growth, CPU time accumulation, and file descriptor count delta.

### Evidence Artifacts
- **D-06:** Produce `FIRECRACKER_BARE_METAL_CERTIFICATION.md` documenting the host environment, campaign parameters, and statistical results.
- **D-07:** Produce `firecracker-endurance-results.json` containing per-iteration timing data, aggregate statistics, and resource leak measurements.

### Discretionary
- Specific kernel and rootfs versions used for guest images.
- vCPU and memory configuration per microVM instance.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

- `.planning/REQUIREMENTS.md` — `QUAL-REMOVE-FC-01`
- `VIRTUALIZATION_BOUNDARIES_REVIEW.md` — Section 6: Firecracker Isolation Assumptions
- `scripts/firecracker-endurance-campaign.ts` — Existing endurance campaign script (previously run under WSL2)

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `scripts/firecracker-endurance-campaign.ts` — Contains the full launch-execute-teardown loop; should work on bare-metal with minimal changes.
- `run-firecracker-bundle.mjs` — Firecracker launch orchestration.

### Established Patterns
- Campaign results are written as JSON to the repository root or `campaign-evidence/` directory.

### Integration Points
- The endurance script reports to telemetry-history for long-term tracking.

</code_context>

<deferred>
## Deferred Ideas

- Nested microVM launches (microVM inside microVM) — Out of scope.
- Network bridge/TAP configuration for guest internet access — Out of scope.

</deferred>

---

*Phase: 22-bare-metal-firecracker*
*Context gathered: 2026-07-11*
