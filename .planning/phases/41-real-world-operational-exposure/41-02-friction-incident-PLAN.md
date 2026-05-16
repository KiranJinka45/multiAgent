---
id: 41-02
wave: 2
name: Friction Harvesting & Incident Governance
slug: friction-incident
phase: 41
objective: Implement friction harvesting dashboards and formalize incident evidence preservation protocols.
requirements_addressed: [REQ-41.3, REQ-41.4]
---

# Plan 41-02: Friction Harvesting & Incident Governance

Focus on capturing and processing real-world feedback.

## Tasks

### 1. Implement Friction Harvesting Dashboard
- Create `scripts/process-friction.ts` to aggregate `docs/friction/*.json`.
- Create `OPERATOR_FRICTION_REPORT.md` to summarize operator confusion points.

### 2. Formalize Incident Evidence Preservation
- Create `scripts/preserve-incident.sh` to bundle logs and state snapshots.
- Update `SRE_HANDBOOK.md` with the "Real Incident Governance" protocol.
