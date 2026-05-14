---
phase: 41
name: Real-World Operational Exposure
slug: real-world-operational-exposure
date: 2026-05-14
requirements_addressed: [REQ-41.1, REQ-41.2, REQ-41.3, REQ-41.4, REQ-41.5, REQ-41.6]
---

# Phase 41: Real-World Operational Exposure - Plan

Validate the platform against reality through external operator trials, real deployment telemetry, and aggressive operational burden reduction.

## Objectives

1. Execute independent external operator trials with 3-10 participants.
2. Validate real deployments in constrained and ephemeral environments.
3. Harvest and act on production friction logs.
4. Establish governance for real operational incidents.
5. Aggressively reduce operational burden by removing low-signal components.
6. Institutionalize quarterly survivability discipline.

## Wave 1: Trial Setup & Deployment Validation (Infrastructure)
*Focus: Environment readiness and operator onboarding.*

### Task 1.1: Prepare Onboarding Kit & Trial Registry
<read_first>
- [GETTING_STARTED_OPERATORS.md](../../GETTING_STARTED_OPERATORS.md)
- [OPERATOR_PLAYBOOK.md](../../OPERATOR_PLAYBOOK.md)
</read_first>
<action>
- Create a `trials/` directory to manage operator sessions.
- Create `trials/REGISTRY.md` to track 3-10 operators (OS, env, experience).
- Update `GETTING_STARTED_OPERATORS.md` to ensure it is 100% self-contained for zero-context onboarding.
</action>
<acceptance_criteria>
- `trials/REGISTRY.md` exists with participant slots.
- `GETTING_STARTED_OPERATORS.md` contains all necessary links and commands (no "ask founder" instructions).
</acceptance_criteria>

### Task 1.2: Establish Ephemeral Cloud Validation Suites
<read_first>
- [package.json](../../package.json)
- [scripts/validate-cloud.ts](../../scripts/validate-cloud.ts)
</read_first>
<action>
- Enhance `scripts/validate-cloud.ts` to support automated deployment to ephemeral VMs (DigitalOcean/AWS/GCP via CLI).
- Create `scripts/test-constrained-hw.sh` to simulate low-resource environments (CPU/RAM limiting via cgroups).
</action>
<acceptance_criteria>
- `pnpm run validate:cloud` successfully provisions and tests a clean environment.
- `scripts/test-constrained-hw.sh` exists and successfully limits resources for a test run.
</acceptance_criteria>

## Wave 2: Friction Harvesting & Incident Governance (Operations)
*Focus: Capturing and processing real-world feedback.*

### Task 2.1: Implement Friction Harvesting Dashboard
<read_first>
- [packages/ztanctl/src/index.ts](../../packages/ztanctl/src/index.ts)
</read_first>
<action>
- Create a simple utility `scripts/process-friction.ts` that aggregates all `docs/friction/*.json` files.
- Create `apps/reliability-dashboard/src/components/FrictionHeatmap.tsx` (if dashboard exists) or a markdown summary `OPERATOR_FRICTION_REPORT.md`.
</action>
<acceptance_criteria>
- `scripts/process-friction.ts` generates a summary of operator confusion points.
- `OPERATOR_FRICTION_REPORT.md` is populated with aggregated friction data.
</acceptance_criteria>

### Task 2.2: Formalize Incident Evidence Preservation
<read_first>
- [SRE_HANDBOOK.md](../../SRE_HANDBOOK.md)
</read_first>
<action>
- Create `scripts/preserve-incident.sh` that bundles logs, state snapshots, and friction reports into an `evidence/incidents/{ID}/` directory.
- Update `SRE_HANDBOOK.md` with the "Real Incident Governance" protocol.
</action>
<acceptance_criteria>
- `scripts/preserve-incident.sh` creates a verifiable evidence bundle.
- `SRE_HANDBOOK.md` contains the preservation protocol.
</acceptance_criteria>

## Wave 3: Burden Reduction & Discipline (Optimization)
*Focus: Subtractive engineering and long-term rituals.*

### Task 3.1: Aggressive Subsystem Pruning
<read_first>
- [ROADMAP.md](../../ROADMAP.md)
- [PROJECT.md](../../PROJECT.md)
</read_first>
<action>
- Audit all `apps/` and `packages/` for low-usage or purely theoretical components.
- Archive or remove components identified as "ceremonial" or "unnecessary telemetry".
- Specifically target redundant dashboards and unused CLI commands.
</action>
<acceptance_criteria>
- Unused code removed or moved to `archive/`.
- `ztanctl` help output is leaner (deprecated commands removed).
</acceptance_criteria>

### Task 3.2: Institutionalize Survivability Discipline
<read_first>
- [MAINTENANCE.md](../../MAINTENANCE.md)
</read_first>
<action>
- Update `MAINTENANCE.md` with the Quarterly Survivability Calendar.
- Create `scripts/schedule-drills.ps1` to automate reminders/tasks for OCR drills and audits.
- Finalize the `SURVIVABILITY_METRICS.md` with the new real-world MTTR targets.
</action>
<acceptance_criteria>
- `MAINTENANCE.md` contains the quarterly/bi-annual/annual schedule.
- `SURVIVABILITY_METRICS.md` reflects real-world operational targets.
</acceptance_criteria>

## Verification

### Must Haves
- [ ] 3 successful onboarding trials recorded in `trials/REGISTRY.md`.
- [ ] Friction report `OPERATOR_FRICTION_REPORT.md` generated from real logs.
- [ ] At least 2 redundant or low-signal subsystems removed/archived.
- [ ] OCR drill completed in ephemeral cloud environment within SLO.

### Critical Tests
- `ztanctl friction "I am confused"` writes to `docs/friction/`.
- `pnpm run validate:cloud` passes without manual intervention.
- `scripts/process-friction.ts` produces a valid aggregation.
