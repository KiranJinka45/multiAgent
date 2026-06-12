# Phase 25: External Pilot Deployment - Context

**Gathered:** 2026-06-12
**Status:** Planned & Awaiting Environment Provisioning

<domain>
## Phase Boundary

Deploy the ZTAN control plane to the first low-risk live enterprise tenant. Establish real-world operational evidence over a 30-day observation window, verifying tenant RLS isolation, telemetry collection, drift monitoring, incident response, and active recovery drills.

</domain>

<decisions>
## Implementation Decisions

### Observation & Traffic
- **D-01:** Process real tenant traffic for a minimum of 30 consecutive days.
- **D-02:** Deploy the control plane initially in an `Audit/Advisory` mode to prevent operational disruption before full validation.

### Recovery & Incident Handling
- **D-03:** Execute at least 3 recovery drills on active systems during the observation window.
- **D-04:** Inject at least 1 simulated incident to verify alert pipelines, escalation paths, and operator override ceremonies.
- **D-05:** Measure and document the Recovery Time Objective (RTO) and Recovery Point Objective (RPO) during drills.

### Telemetry & Drift
- **D-06:** Configure a telemetry export pipeline (metrics → external SIEM/dashboard) for active observation.
- **D-07:** Perform daily drift metrics audits with zero unresolved alerts.

### the agent's Discretion
- Choice of low-risk tenant and target namespace.
- Exact telemetry dashboards layout.
- Incident injection details.

</decisions>

<canonical_refs>
## Canonical References

**Downstream agents MUST read these before planning or implementing.**

### Runbooks & Guides
- `EVIDENCE_ACCUMULATION_RUNBOOK.md` — Step-by-step checklists, prerequisites, and success criteria for Path 1.
- `PRODUCTION_PROVEN_ROADMAP.md` — Stakeholder-facing commercial roadmap splitting v1.18A/B.
- `DUE_DILIGENCE_PACKAGE/QUALIFICATION_REGISTER.md` — Active qualification statuses and taxonomy.

</canonical_refs>

<code_context>
## Existing Code Insights

### Reusable Assets
- `packages/ztanctl` — CLI utility supporting health diagnostics (`ztanctl diag health`) and recovery reporting.
- `scripts/adversarial-tenant-escape.ts` — RLS isolation verification scripts and escape test cases.

### Integration Points
- `k8s/` — Kubernetes deployment manifests for namespace partitioning.
- Telemetry exports — Dashboard reporting mechanisms.

</code_context>

<deferred>
## Deferred Ideas

- Independent Operator Validation — Deferred to Phase 26.
- Physical Hardware Qualification — Deferred to Phase 27.

</deferred>

---

*Phase: 25-external-pilot-deployment-not-started*
*Context gathered: 2026-06-12*
