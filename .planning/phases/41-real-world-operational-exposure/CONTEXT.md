# Phase 41: Real-World Operational Exposure - Context

**Gathered:** 2026-05-14
**Status:** Ready for planning
**Source:** User Request (Nexus ZTAN — Phase 41: Real-World Operational Exposure)

<domain>
## Phase Boundary

The platform is now frozen for architectural expansion. No new governance systems, telemetry abstractions, forensic engines, scoring layers, or conceptual frameworks may be introduced unless justified by a real production incident or verified external operator failure.

The purpose of this phase is to validate the platform against reality through:
- Independent External Operator Trials
- Real Deployment Validation
- Production Friction Harvesting
- Real Incident Governance
- Operational Burden Reduction
- Quarterly Survivability Discipline

</domain>

<decisions>
## Implementation Decisions

### OBJECTIVE 1 — Independent External Operator Trials
- Recruitment: Recruit 3–10 operators with different OS, infrastructure, and experience levels (zero founder-context).
- Requirements: Operators must rely only on documentation.
- Logging: All friction must be logged through `ztanctl friction`.
- Metrics: Track onboarding duration, recovery success rate, documentation ambiguity, command retry frequency, support requests, and operator hesitation points.
- Success Criteria: > 90% successful onboarding without intervention; OCR drill within SLO; No undocumented recovery dependency.

### OBJECTIVE 2 — Real Deployment Validation
- Environments: Ephemeral cloud VMs, CI runners, constrained hardware, isolated clean-room environments.
- Operations: Recovery drills, node restarts, Redis interruptions, database restoration, worker isolation, dependency rebuilds.
- Metrics: MTTR, recovery determinism, deployment reproducibility, environment-specific drift.

### OBJECTIVE 3 — Production Friction Harvesting
- Inputs: `ztanctl friction`, onboarding telemetry, retry analytics, dashboard interaction patterns.
- Output: Identify unclear commands, misleading metrics, unnecessary telemetry, excessive workflows, and documentation blind spots.
- Rule: Every repeated operator confusion pattern must trigger subtractive engineering.

### OBJECTIVE 4 — Real Incident Governance
- Preservation: Preserve incident evidence and record recovery path.
- Audit: Audit documentation effectiveness and identify hidden tribal knowledge.
- Measure: Measure operator independence.

### OBJECTIVE 5 — Operational Burden Reduction
- Aggressive Removal: Unused commands, duplicate dashboards, low-signal metrics, ceremonial workflows, stale scripts, unused documentation.
- Criteria: Does this help a real operator recover the platform faster? If not, archive or remove.

### OBJECTIVE 6 — Quarterly Survivability Discipline
- Rituals: Quarterly OCR drills, bi-annual dependency audits, annual ecosystem migration rehearsals, operator onboarding audits, clean-room restoration validation.
- Constraint: No speculative roadmap expansion allowed.

### the agent's Discretion
- Technical implementation of friction harvesting telemetry.
- Specific cleanup of identified low-signal metrics and commands.
- Setup of ephemeral cloud environments for validation.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Operational Docs
- [OPERATOR_PLAYBOOK.md](../../OPERATOR_PLAYBOOK.md)
- [RUNBOOK.md](../../RUNBOOK.md)
- [GETTING_STARTED_OPERATORS.md](../../GETTING_STARTED_OPERATORS.md)
- [SRE_HANDBOOK.md](../../SRE_HANDBOOK.md)

### Governance Docs
- [CONSTITUTION.md](../../CONSTITUTION.md)
- [CONSTITUTION_FREEZE.md](../../CONSTITUTION_FREEZE.md)
- [STEWARDSHIP_CHARTER.md](../../STEWARDSHIP_CHARTER.md)

### Technical Specs
- [FINALITY_DECLARATION.md](../../FINALITY_DECLARATION.md)
- [PRODUCTION.md](../../PRODUCTION.md)
- [MAINTENANCE.md](../../MAINTENANCE.md)

</canonical_refs>

<specifics>
## Specific Ideas
- The platform must become smaller and clearer over time.
- Real incidents carry more value than simulated governance exercises.
- Success is boring deployments and low incident rates.

</specifics>

<deferred>
## Deferred Ideas
- All architectural expansion (out of scope per Phase 41 directive).
- New governance abstractions.
- New archaeology systems.
- New scoring systems.
- New certification layers.
- Meta-observability.

</deferred>

---

*Phase: 41-real-world-operational-exposure*
*Context gathered: 2026-05-14 via User Request*
