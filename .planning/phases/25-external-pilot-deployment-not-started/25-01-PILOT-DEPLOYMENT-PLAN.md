---
wave: 1
depends_on: []
files_modified:
  - evidence/2026-pilot-deployment/pilot-deployment-report.json
autonomous: false
requirements:
  - EVIDENCE-PILOT-01
---

# Plan 25-01: External Pilot Deployment Campaign

Deploy the ZTAN control plane to a low-risk live enterprise tenant and accumulate real-world operational evidence over a 30-day observation campaign.

## Tasks

<task>
<action>
Prepare the environment and namespace for the pilot deployment:
- Provision an isolated namespace (e.g., `ztan-pilot`) in the target Kubernetes or containerized environment.
- Configure ZTAN control plane settings initially in `Audit/Advisory` mode.
- Establish a telemetry export pipeline routing metrics to an external SIEM or dashboard.
</action>
<acceptance_criteria>
- Target namespace exists and is network-isolated from other tenant databases.
- Telemetry export endpoints are configured and verified reachable.
</acceptance_criteria>
</task>

<task>
<action>
Deploy the control plane and execute initial health diagnostics:
- Apply deployment manifests to the target namespace:
  `kubectl apply -f k8s/ -n ztan-pilot`
- Run the SRE CLI diagnostics to check initial health:
  `npx tsx packages/ztanctl/src/index.ts --role sre diag health`
- Verify Row-Level Security (RLS) is active on all tenant-scoped PostgreSQL tables.
</action>
<acceptance_criteria>
- All control plane pods (gateway, api, witness, database) are running stably.
- Health command returns successful diagnostics with zero warnings or exceptions.
</acceptance_criteria>
</task>

<task>
<action>
Conduct the 30-day observation campaign under active tenant workload:
- Process live tenant transactions.
- Collect daily drift monitoring metrics and compile weekly telemetry summaries.
- Log weekly reports to the workspace:
  - Week 1: `pilot-week1-telemetry.json`
  - Week 2: `pilot-week2-telemetry.json`
  - Week 3: `pilot-week3-telemetry.json`
  - Week 4: `pilot-week4-telemetry.json`
</action>
<acceptance_criteria>
- Telemetry shows continuous transaction throughput for 30 consecutive days.
- Zero unexplained RLS tenant-isolation alerts or unauthorized access attempts.
</acceptance_criteria>
</task>

<task>
<action>
Execute recovery drills and inject incidents to verify response boundaries:
- Conduct 3 recovery drills (witness step-down, replica partition recovery) during the 30-day window and log metrics.
- Inject 1 simulated security incident (e.g., policy breach or log desynchronization) to verify alerting.
- Document response times and measure RTO / RPO.
</action>
<acceptance_criteria>
- Verification reports generated for recovery drills (`pilot-recovery-drill-1.json`, etc.) and incident handling (`pilot-incident-1.json`).
- All active witness lease stepping down events and override ceremonies are cryptographically logged.
</acceptance_criteria>
</task>

<task>
<action>
Compile and archive the final pilot post-mortem and report:
- Gather all weekly telemetry logs, drill metrics, and incident reports.
- Assemble the unified post-mortem package.
- Generate the final exit evidence artifact at `evidence/2026-pilot-deployment/pilot-deployment-report.json`.
</action>
<acceptance_criteria>
- Exit artifact `evidence/2026-pilot-deployment/pilot-deployment-report.json` exists with complete metrics, timelines, and post-mortem logs.
</acceptance_criteria>
</task>

## Verification
- Verify that the pilot reports and exit files pass smoke tests:
  `node scripts/run-smoke-tests.js`
