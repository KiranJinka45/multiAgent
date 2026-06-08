# Explicit 'any' Type Debt Inventory

This document provides a comprehensive inventory of explicit `any` usages across the monorepo, generated automatically from ESLint results.

Total Explicit `any` Usages: **3108**

## Trust-Path Packages (High Priority)

These packages represent critical cryptographic, witness, or operational boundary substrates. Eliminating `any` in these modules is the highest priority for long-term type-safety.

| Package | Explicit `any` Count | Files Impacted |
| :--- | :---: | :---: |
| `packages/governance-core` | **0** | 0 |
| `packages/ztan-crypto` | **0** | 0 |
| `packages/ztan-auditor` | **0** | 0 |

## Other Packages

| Package | Explicit `any` Count | Files Impacted |
| :--- | :---: | :---: |
| `root` | **890** | 194 |
| `packages/utils` | **626** | 89 |
| `packages/production-pilot` | **247** | 56 |
| `apps/core-api` | **201** | 59 |
| `apps/frontend` | **200** | 38 |
| `apps/gateway` | **108** | 9 |
| `apps/operational-protocol` | **103** | 33 |
| `packages/runtime-core` | **102** | 33 |
| `apps/worker` | **94** | 34 |
| `apps/capability-runtime` | **77** | 3 |
| `apps/stewardship-console` | **70** | 8 |
| `packages/ztan-witness` | **67** | 10 |
| `packages/db` | **59** | 4 |
| `packages/ztanctl` | **36** | 1 |
| `packages/observability` | **31** | 2 |
| `apps/auth-service` | **23** | 3 |
| `packages/contracts` | **23** | 4 |
| `packages/production-validation` | **23** | 5 |
| `packages/resilience` | **20** | 6 |
| `packages/core-engine` | **17** | 5 |
| `packages/agents` | **10** | 2 |
| `packages/tools` | **10** | 2 |
| `packages/autonomous-ops` | **7** | 7 |
| `packages/deployment-hardening` | **6** | 2 |
| `packages/infra-graph` | **6** | 2 |
| `apps/governance-ledger` | **5** | 1 |
| `apps/policy-engine` | **4** | 1 |
| `packages/evidence-lifecycle` | **4** | 3 |
| `apps/intent-gateway` | **3** | 3 |
| `apps/sandbox-service` | **3** | 1 |
| `packages/global-reliability` | **3** | 1 |
| `packages/operator-compression` | **3** | 2 |
| `packages/reliability-intelligence` | **3** | 2 |
| `packages/stewardship-console` | **3** | 3 |
| `packages/validator` | **3** | 2 |
| `apps/deploy-service` | **2** | 1 |
| `apps/stewardship-orchestrator` | **2** | 1 |
| `packages/business` | **2** | 1 |
| `packages/economic-intelligence` | **2** | 1 |
| `packages/governance-sdk` | **2** | 2 |
| `packages/survivability-sim` | **2** | 1 |
| `apps/reliability-dashboard` | **1** | 1 |
| `packages/auth-internal` | **1** | 1 |
| `packages/institutional-dashboard` | **1** | 1 |
| `packages/memory-cache` | **1** | 1 |
| `packages/self-evolution` | **1** | 1 |
| `packages/supply-chain` | **1** | 1 |

## Detailed File Breakdown

### Trust-Path Package Details

#### `packages/governance-core` (171 findings)

- [generate-phase-d-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-d-reports.ts): **5** usages
- [generate-phase-e-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-e-reports.ts): **5** usages
- [generate-phase-f-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-f-reports.ts): **1** usages
- [generate-phase-g-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-g-reports.ts): **1** usages
- [generate-phase-h-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-h-reports.ts): **1** usages
- [generate-phase-i-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-i-reports.ts): **1** usages
- [generate-phase-j-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-j-reports.ts): **1** usages
- [generate-phase-k-reports.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/generate-phase-k-reports.ts): **6** usages
- [run-chaos-engineering.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-chaos-engineering.ts): **2** usages
- [run-dumper-falsification.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-dumper-falsification.ts): **9** usages
- [run-falsification-crash-dumper.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-falsification-crash-dumper.ts): **1** usages
- [run-formal-tla-proofs.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-formal-tla-proofs.ts): **2** usages
- [run-soak-test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-soak-test.ts): **1** usages
- [run-validation-harness.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/scripts/run-validation-harness.ts): **1** usages
- [mutability-fencing.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/api/mutability-fencing.ts): **3** usages
- [security-headers.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/api/security-headers.ts): **3** usages
- [constitution.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/constitution.ts): **1** usages
- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/engine.ts): **5** usages
- [temporal-workflow.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/escalation/temporal-workflow.test.ts): **1** usages
- [temporal-workflow.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/escalation/temporal-workflow.ts): **6** usages
- [attestation-corruption.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/attestation-corruption.ts): **2** usages
- [consensus-exhaustion.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/consensus-exhaustion.ts): **3** usages
- [container-pressure.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/container-pressure.ts): **1** usages
- [dag-explosion.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/dag-explosion.ts): **1** usages
- [equivocation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/equivocation.ts): **6** usages
- [isolation-breakout.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/isolation-breakout.ts): **1** usages
- [ledger-corruption.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/falsification/ledger-corruption.ts): **5** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/index.ts): **10** usages
- [cgroup-controller.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/cgroup-controller.ts): **5** usages
- [container-orchestrator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/container-orchestrator.ts): **2** usages
- [physical-firecracker.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/physical-firecracker.ts): **10** usages
- [seccomp.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/isolation/seccomp.ts): **3** usages
- [archaeology-dumper.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/ledger/archaeology-dumper.ts): **14** usages
- [consensus.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/ledger/consensus.ts): **6** usages
- [ledger.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/ledger/ledger.ts): **4** usages
- [policy-enforcer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/opa/policy-enforcer.ts): **2** usages
- [lattice.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/permissions/lattice.ts): **1** usages
- [lease-enforcement.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/runtime/lease-enforcement.ts): **7** usages
- [governance-telemetry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/telemetry/governance-telemetry.ts): **2** usages
- [physical-tpm-spec.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/trust/physical-tpm-spec.ts): **1** usages
- [startup-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/trust/startup-attestation.ts): **2** usages
- [tpm.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/src/trust/tpm.ts): **2** usages
- [d4-isolation.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/d4-isolation.test.ts): **3** usages
- [e2-cgroup-starvation.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/e2-cgroup-starvation.test.ts): **2** usages
- [e5-disk-oom-recovery.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/e5-disk-oom-recovery.test.ts): **4** usages
- [i1-resource-exhaustion.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/i1-resource-exhaustion.test.ts): **1** usages
- [z1-adversarial-proofs.runner.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/z1-adversarial-proofs.runner.ts): **10** usages
- [z1-adversarial-proofs.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-core/test/integration/z1-adversarial-proofs.test.ts): **5** usages

#### `packages/ztan-crypto` (13 findings)

- [canonical.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/canonical.ts): **2** usages
- [index.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/index.d.ts): **4** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/index.ts): **5** usages
- [mock-rekor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/time/mock-rekor.ts): **1** usages
- [attestation-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-crypto/src/tpm/attestation-verifier.ts): **1** usages

#### `packages/ztan-auditor` (1 findings)

- [crypto-verification.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-auditor/src/crypto-verification.test.ts): **1** usages

### Other Package Details

#### `root` (890 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/archive/billing-service/index.ts): **3** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/archive/billing-service/src/index.ts): **4** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/archive/economic-audit/index.ts): **1** usages
- [sustainability-certifier.ts](file:///c:/multiagentic_project/multiAgent-main/archive/economics/src/sustainability-certifier.ts): **1** usages
- [sustainability-optimizer.ts](file:///c:/multiagentic_project/multiAgent-main/archive/economics/src/sustainability-optimizer.ts): **1** usages
- [validate-reality.ts](file:///c:/multiagentic_project/multiAgent-main/archive/scripts/validate-reality.ts): **1** usages
- [test_mission.ts](file:///c:/multiagentic_project/multiAgent-main/archive/stewardship_pruning/test_mission.ts): **1** usages
- [verify_staking.ts](file:///c:/multiagentic_project/multiAgent-main/archive/stewardship_pruning/verify_staking.ts): **1** usages
- [scim.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/auth-service/scim.d.ts): **6** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/auth-service/src/server.ts): **14** usages
- [oidc.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/auth-service/sso/oidc.d.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/billing-service/index.ts): **3** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/billing-service/src/index.ts): **4** usages
- [socket.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/gateway/socket.d.ts): **1** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/gateway/src/server.ts): **16** usages
- [socket.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/gateway/src/socket.d.ts): **1** usages
- [socket.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/gateway/src/socket.ts): **1** usages
- [git.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/services/git.d.ts): **3** usages
- [logger.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/services/logger.ts): **1** usages
- [pluginRunner.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/services/pluginRunner.d.ts): **1** usages
- [pluginRunner.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/services/pluginRunner.ts): **1** usages
- [usage.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/services/usage.ts): **1** usages
- [analytics-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/analytics-worker.ts): **2** usages
- [architecture-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/architecture-worker.ts): **1** usages
- [backend-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/backend-worker.ts): **3** usages
- [base-worker.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/base-worker.d.ts): **1** usages
- [base-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/base-worker.ts): **6** usages
- [billing-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/billing-worker.ts): **2** usages
- [build-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/build-worker.ts): **1** usages
- [deploy-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/deploy-worker.ts): **2** usages
- [docker-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/docker-worker.ts): **5** usages
- [evaluation-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/evaluation-worker.ts): **1** usages
- [frontend-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/frontend-worker.ts): **2** usages
- [generator-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/generator-worker.ts): **2** usages
- [git-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/git-worker.ts): **1** usages
- [growthAgent.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/growthAgent.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/index.ts): **1** usages
- [meta-agent-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/meta-agent-worker.ts): **1** usages
- [mission-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/mission-worker.ts): **6** usages
- [pattern-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/pattern-worker.ts): **2** usages
- [planner-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/planner-worker.ts): **4** usages
- [queue-manager.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/queue-manager.d.ts): **1** usages
- [queue-manager.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/queue-manager.ts): **1** usages
- [repair-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/repair-worker.ts): **10** usages
- [rollback-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/rollback-worker.ts): **1** usages
- [self-modification-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/self-modification-worker.ts): **2** usages
- [temporal-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/temporal-worker.ts): **1** usages
- [validator-worker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/validator-worker.ts): **2** usages
- [buildWorker.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/src/workers/buildWorker.ts): **2** usages
- [appBuilder.d.ts](file:///c:/multiagentic_project/multiAgent-main/deploy/worker/workflows/appBuilder.d.ts): **2** usages
- [apply-immutability-triggers.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/apply-immutability-triggers.ts): **3** usages
- [asymmetric-partition-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/asymmetric-partition-drill.ts): **3** usages
- [aws-kms-degradation-live.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/aws-kms-degradation-live.ts): **9** usages
- [baseline-registry-manager.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/baseline-registry-manager.ts): **3** usages
- [certify-compliance.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/certify-compliance.ts): **1** usages
- [certify-stability.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/certify-stability.ts): **3** usages
- [firecracker-runbook-validation.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/ci/firecracker-runbook-validation.ts): **2** usages
- [test-provenance-gate.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/ci/test-provenance-gate.ts): **2** usages
- [test-time-anchor.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/ci/test-time-anchor.ts): **2** usages
- [test-witness-handshake.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/ci/test-witness-handshake.ts): **2** usages
- [continuous-soak-orchestrator.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/continuous-soak-orchestrator.ts): **39** usages
- [continuous-validation-engine.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/continuous-validation-engine.ts): **3** usages
- [corpus-manager.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/corpus-manager.ts): **4** usages
- [db-monitor.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/db-monitor.ts): **2** usages
- [db-snapshot-manager.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/db-snapshot-manager.ts): **5** usages
- [deterministic-replay-validator.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/deterministic-replay-validator.ts): **6** usages
- [enable-rls.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/enable-rls.ts): **1** usages
- [entropy-trend-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/entropy-trend-analyzer.ts): **5** usages
- [etcd-asymmetric-partition-live.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/etcd-asymmetric-partition-live.ts): **2** usages
- [failure-provenance.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/failure-provenance.ts): **2** usages
- [forensic-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/forensic-verifier.ts): **5** usages
- [generate-hardening-report.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/generate-hardening-report.ts): **1** usages
- [generate-signed-ledger.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/generate-signed-ledger.ts): **1** usages
- [generate-trust-report.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/generate-trust-report.ts): **2** usages
- [governance-audit-chain-live.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/governance-audit-chain-live.ts): **8** usages
- [governance-security-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/governance-security-drill.ts): **7** usages
- [long-horizon-soak.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/long-horizon-soak.ts): **1** usages
- [network-flap-replay.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/network-flap-replay.ts): **13** usages
- [operational-continuity.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/operational-continuity.ts): **1** usages
- [operator-complexity-restrictor.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/operator-complexity-restrictor.ts): **1** usages
- [pathology-isolation-manager.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/pathology-isolation-manager.ts): **4** usages
- [pg-reality-campaign.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/pg-reality-campaign.ts): **18** usages
- [pilot-transparency-dashboard.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/pilot-transparency-dashboard.ts): **1** usages
- [postgres-destructive-fault-live.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/postgres-destructive-fault-live.ts): **2** usages
- [preflight-cleanup.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/preflight-cleanup.ts): **3** usages
- [reconstruct-incident.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reconstruct-incident.ts): **1** usages
- [recovery-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/recovery-drill.ts): **5** usages
- [reliability-campaign-runner.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reliability-campaign-runner.ts): **1** usages
- [reliability-dashboard.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reliability-dashboard.ts): **37** usages
- [reliability-diff-engine.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reliability-diff-engine.ts): **20** usages
- [reliability-stress.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reliability-stress.ts): **3** usages
- [replay-auditor.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/replay-auditor.ts): **1** usages
- [reproducibility-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reproducibility-analyzer.ts): **7** usages
- [reproduction-audit.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/reproduction-audit.ts): **1** usages
- [resilience-activities.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/resilience-activities.ts): **1** usages
- [resource-archaeology-runner.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/resource-archaeology-runner.ts): **7** usages
- [run-chaos-campaign.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/run-chaos-campaign.ts): **6** usages
- [run-phase-e-drills.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/run-phase-e-drills.ts): **1** usages
- [run-survivability-drills.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/run-survivability-drills.ts): **1** usages
- [snapshot-checkpoint-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/snapshot-checkpoint-drill.ts): **1** usages
- [telemetry-regression-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/telemetry-regression-analyzer.ts): **7** usages
- [temporal-distortion-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/temporal-distortion-drill.ts): **2** usages
- [tier-e2-pathology.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/tier-e2-pathology.ts): **3** usages
- [tier-e3-archaeology-drill.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/tier-e3-archaeology-drill.ts): **2** usages
- [tier-e5-pilot-validation.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/tier-e5-pilot-validation.ts): **2** usages
- [upgrade-rollback-simulator.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/upgrade-rollback-simulator.ts): **1** usages
- [verify-disaster-recovery.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/verify-disaster-recovery.ts): **3** usages
- [verify-environment-variability.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/verify-environment-variability.ts): **1** usages
- [verify-rekor-interop.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/verify-rekor-interop.ts): **5** usages
- [wal-corrupter.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/wal-corrupter.ts): **1** usages
- [ztan-watchdog-supervisor.ts](file:///c:/multiagentic_project/multiAgent-main/scripts/ztan-watchdog-supervisor.ts): **4** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/services/trust-soak-engine/src/index.ts): **1** usages
- [config-checksum.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/config-checksum.ts): **1** usages
- [lease-enforcement.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/lease-enforcement.ts): **4** usages
- [observatory-server.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/observatory-server.ts): **1** usages
- [opa-gate.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/opa-gate.ts): **2** usages
- [startup-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/startup-attestation.ts): **4** usages
- [storage-validator.ts](file:///c:/multiagentic_project/multiAgent-main/src/runtime/storage-validator.ts): **1** usages
- [causal-certification.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/causal-certification.ts): **1** usages
- [chaos-test.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/chaos-test.ts): **3** usages
- [integrity-certification.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/integrity-certification.ts): **1** usages
- [test-adversarial-reliability.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-adversarial-reliability.ts): **12** usages
- [test-ai-orchestration.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-ai-orchestration.ts): **1** usages
- [test-billing-enforcement.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-billing-enforcement.ts): **1** usages
- [test-boundary-virtualization.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-boundary-virtualization.ts): **7** usages
- [test-canonical-hash.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-canonical-hash.ts): **1** usages
- [test-capability-runtime.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-capability-runtime.ts): **1** usages
- [test-cluster-governance.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-cluster-governance.ts): **18** usages
- [test-cluster-transport.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-cluster-transport.ts): **10** usages
- [test-consensus-safety.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-consensus-safety.ts): **12** usages
- [test-control-plane.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-control-plane.ts): **17** usages
- [test-deterministic-convergence.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-deterministic-convergence.ts): **7** usages
- [test-deterministic-scheduler.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-deterministic-scheduler.ts): **6** usages
- [test-durable-orchestration.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-durable-orchestration.ts): **13** usages
- [test-durable-wal.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-durable-wal.ts): **19** usages
- [test-execution-integrity.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-execution-integrity.ts): **8** usages
- [test-execution-partitioning.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-execution-partitioning.ts): **15** usages
- [test-governance-fabric.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-governance-fabric.ts): **1** usages
- [test-hardened-isolation.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-hardened-isolation.ts): **3** usages
- [test-intent-gateway.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-intent-gateway.ts): **2** usages
- [test-multitenant-security.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-multitenant-security.ts): **29** usages
- [test-offheap-serialization.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-offheap-serialization.ts): **7** usages
- [test-ops-packaging-lifecycle.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-ops-packaging-lifecycle.ts): **6** usages
- [test-ops-survivability.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-ops-survivability.ts): **2** usages
- [test-ops-telemetry-analytics.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-ops-telemetry-analytics.ts): **31** usages
- [test-ops-upgrade-safety.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-ops-upgrade-safety.ts): **17** usages
- [test-phase-next.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-phase-next.ts): **3** usages
- [test-policy-engine.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-policy-engine.ts): **5** usages
- [test-replay-determinism.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-replay-determinism.ts): **4** usages
- [test-replication-quorum.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-replication-quorum.ts): **15** usages
- [test-root-sovereignty.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-root-sovereignty.ts): **7** usages
- [test-runtime-attestation-impl.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-runtime-attestation-impl.ts): **4** usages
- [test-runtime-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-runtime-attestation.ts): **2** usages
- [test-runtime-governance.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-runtime-governance.ts): **8** usages
- [test-runtime-ownership.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-runtime-ownership.ts): **10** usages
- [test-sandbox-service.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-sandbox-service.ts): **1** usages
- [test-semantic-ledger.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-semantic-ledger.ts): **9** usages
- [test-side-effect-journal.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-side-effect-journal.ts): **11** usages
- [test-stewardship-freeze.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-stewardship-freeze.ts): **2** usages
- [test-storage-hardening.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-storage-hardening.ts): **8** usages
- [test-supply-chain-replay.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-supply-chain-replay.ts): **3** usages
- [test-wasm-isolation-sdk.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/test-wasm-isolation-sdk.ts): **11** usages
- [trust-hitl-certification.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/trust-hitl-certification.ts): **3** usages
- [ztan-consensus.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/ztan-consensus.ts): **4** usages
- [ztan-elite-certification.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/ztan-elite-certification.ts): **8** usages
- [ztan-v2-v3-audit.ts](file:///c:/multiagentic_project/multiAgent-main/test/integration/ztan-v2-v3-audit.ts): **13** usages
- [measurement-integrity-provenance.ts](file:///c:/multiagentic_project/multiAgent-main/tests/measurement-integrity-provenance.ts): **4** usages
- [multi-writer-stressor.ts](file:///c:/multiagentic_project/multiAgent-main/tests/multi-writer-stressor.ts): **2** usages
- [disorder-test.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p14/disorder-test.ts): **1** usages
- [duplicate-event.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p14/duplicate-event.ts): **1** usages
- [utils.d.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p14/utils.d.ts): **2** usages
- [utils.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p14/utils.ts): **2** usages
- [control.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p20/control.ts): **1** usages
- [integrity.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p20/integrity.ts): **2** usages
- [monitor.ts](file:///c:/multiagentic_project/multiAgent-main/tests/p20/monitor.ts): **1** usages
- [phase13-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/phase13-verification.ts): **4** usages
- [phase14a-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/phase14a-verification.ts): **1** usages
- [phase14b-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/phase14b-verification.ts): **3** usages
- [phase25-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/phase25-verification.ts): **5** usages
- [phaseOmega-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/phaseOmega-verification.ts): **1** usages
- [reliability-corpus-integrity.ts](file:///c:/multiagentic_project/multiAgent-main/tests/reliability-corpus-integrity.ts): **1** usages
- [replay-equivalence-campaign.ts](file:///c:/multiagentic_project/multiAgent-main/tests/replay-equivalence-campaign.ts): **8** usages
- [replay-parity-audit.ts](file:///c:/multiagentic_project/multiAgent-main/tests/replay-parity-audit.ts): **1** usages
- [sprint-e1-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint-e1-verification.ts): **2** usages
- [sprint-e2-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint-e2-verification.ts): **11** usages
- [sprint-e3-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint-e3-verification.ts): **3** usages
- [sprint2-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint2-verification.ts): **4** usages
- [sprint3-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint3-verification.ts): **1** usages
- [sprint4-verification.ts](file:///c:/multiagentic_project/multiAgent-main/tests/sprint4-verification.ts): **1** usages
- [test-mmr-compaction.ts](file:///c:/multiagentic_project/multiAgent-main/tests/test-mmr-compaction.ts): **1** usages
- [run-soak-test.ts](file:///c:/multiagentic_project/multiAgent-main/validation/run-soak-test.ts): **2** usages
- [run-validation.ts](file:///c:/multiagentic_project/multiAgent-main/validation/run-validation.ts): **3** usages
- [vitest.config.d.ts](file:///c:/multiagentic_project/multiAgent-main/vitest.config.d.ts): **1** usages
- [vitest.workspace.d.ts](file:///c:/multiagentic_project/multiAgent-main/vitest.workspace.d.ts): **1** usages

#### `packages/utils` (626 findings)

- [audit.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/audit.ts): **5** usages
- [build-cache.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/build-cache.ts): **2** usages
- [canonicalizer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/canonicalizer.ts): **3** usages
- [certification.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/certification.ts): **2** usages
- [control-plane.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/control-plane.ts): **19** usages
- [ts_bridge.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/bridges/ts_bridge.ts): **14** usages
- [ArtifactSchemaValidator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/ArtifactSchemaValidator.ts): **3** usages
- [DivergenceComparator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/DivergenceComparator.ts): **2** usages
- [ReplayArtifactCollector.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/ReplayArtifactCollector.ts): **3** usages
- [ReplayExecutionContract.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/ReplayExecutionContract.ts): **1** usages
- [ReplayPersistenceManager.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/ReplayPersistenceManager.ts): **9** usages
- [ReplayQueueScheduler.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/ReplayQueueScheduler.ts): **1** usages
- [RoundtripSemanticStabilizer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/RoundtripSemanticStabilizer.ts): **4** usages
- [RuntimePairExecutor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/RuntimePairExecutor.ts): **4** usages
- [SemanticObjectProjector.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/SemanticObjectProjector.ts): **15** usages
- [SemanticProjector.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/dvk/harness/SemanticProjector.ts): **4** usages
- [global-sync.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/global-sync.ts): **2** usages
- [governance-ledger.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/governance-ledger.ts): **56** usages
- [hsm-vault.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/hsm-vault.ts): **3** usages
- [idempotency.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/idempotency.ts): **7** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/index.ts): **2** usages
- [llm.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/llm.ts): **4** usages
- [tenant-limiter.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/middleware/tenant-limiter.ts): **2** usages
- [mocks.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/mocks.ts): **143** usages
- [policy-research.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/policy-research.ts): **2** usages
- [policy.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/policy.ts): **13** usages
- [recovery-history.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/recovery-history.ts): **45** usages
- [rehearsal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/rehearsal.ts): **1** usages
- [run-conformance-check.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-conformance-check.ts): **13** usages
- [run-determinism-check.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-determinism-check.ts): **1** usages
- [run-differential-fuzz.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-differential-fuzz.ts): **4** usages
- [run-entropy-campaign.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-entropy-campaign.ts): **1** usages
- [run-incremental-stream-fuzz.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-incremental-stream-fuzz.ts): **5** usages
- [run-phase-10-collapse.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-10-collapse.ts): **1** usages
- [run-phase-11-collapse-segment.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-11-collapse-segment.ts): **1** usages
- [run-phase-12-cross-runtime.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-12-cross-runtime.ts): **2** usages
- [run-phase-13-degradation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-13-degradation.ts): **2** usages
- [run-phase-14-governance.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-14-governance.ts): **4** usages
- [run-phase-15-verification.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-15-verification.ts): **3** usages
- [run-phase-16-compatibility.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-16-compatibility.ts): **8** usages
- [run-phase-17-morphodynamics.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-17-morphodynamics.ts): **7** usages
- [run-phase-6-endurance.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-6-endurance.ts): **1** usages
- [run-phase-7-economics.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-7-economics.ts): **1** usages
- [run-phase-8-interference.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-phase-8-interference.ts): **4** usages
- [run-rust-differential.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/run-rust-differential.ts): **1** usages
- [runtime-types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/runtime-types.ts): **7** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/server.ts): **75** usages
- [side-effect-journal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/side-effect-journal.ts): **8** usages
- [startup-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/startup-attestation.ts): **2** usages
- [tpm-attestation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/tpm-attestation.ts): **1** usages
- [async-transport-bus.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/async-transport-bus.ts): **6** usages
- [attention-audit.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/attention-audit.ts): **2** usages
- [crash-child.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/crash-child.ts): **1** usages
- [crash-recovery-child.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/crash-recovery-child.ts): **1** usages
- [crypto-registry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/crypto-registry.ts): **1** usages
- [governance-authority.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/governance-authority.ts): **1** usages
- [governance-consensus.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/governance-consensus.ts): **1** usages
- [governance.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/governance.d.ts): **1** usages
- [governance.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/governance.ts): **4** usages
- [kill_db_conns.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/kill_db_conns.ts): **2** usages
- [multi-writer-child.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/multi-writer-child.ts): **1** usages
- [recovery.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/recovery.ts): **3** usages
- [replay-reconstructor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/replay-reconstructor.ts): **1** usages
- [replay-validation-harness.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/replay-validation-harness.ts): **4** usages
- [run-asn1-der-fuzz.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/run-asn1-der-fuzz.ts): **4** usages
- [run-coverage-guided-fuzzer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/run-coverage-guided-fuzzer.ts): **1** usages
- [run-coverage-instrumentation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/run-coverage-instrumentation.ts): **1** usages
- [run-distributed-simulation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/run-distributed-simulation.ts): **1** usages
- [run-expanded-der-fuzz.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/run-expanded-der-fuzz.ts): **1** usages
- [signer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/signer.ts): **1** usages
- [test-attention-audit.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-attention-audit.ts): **2** usages
- [test-byzantine-drift.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-byzantine-drift.ts): **2** usages
- [test-crash-injection.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-crash-injection.ts): **2** usages
- [test-crash-recovery.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-crash-recovery.ts): **2** usages
- [test-failover-drill.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-failover-drill.ts): **4** usages
- [test-failure-semantics.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-failure-semantics.ts): **8** usages
- [test-hsm-ceremony.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-hsm-ceremony.ts): **1** usages
- [test-lease-fencing.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-lease-fencing.ts): **1** usages
- [test-ledger-compaction.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-ledger-compaction.ts): **2** usages
- [test-multi-writer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-multi-writer.ts): **2** usages
- [test-outbox-resilience.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-outbox-resilience.ts): **8** usages
- [test-outbox-self-healing.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-outbox-self-healing.ts): **6** usages
- [test-replicated-consensus.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-replicated-consensus.ts): **3** usages
- [test-soak-suite.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-soak-suite.ts): **2** usages
- [test-storage-corruption.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/test-storage-corruption.ts): **3** usages
- [validator-node.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/validator-node.ts): **7** usages
- [witness-federation.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/witness-federation.d.ts): **2** usages
- [witness-federation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/transparency/witness-federation.ts): **5** usages
- [validation.ts](file:///c:/multiagentic_project/multiAgent-main/packages/utils/src/validation.ts): **3** usages

#### `packages/production-pilot` (247 findings)

- [adversarial-chaos.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/adversarial-chaos.d.ts): **2** usages
- [adversarial-chaos.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/adversarial-chaos.ts): **2** usages
- [cluster-governance.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/cluster-governance.ts): **1** usages
- [consensus-adapter.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/consensus-adapter.d.ts): **1** usages
- [consensus-adapter.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/consensus-adapter.ts): **6** usages
- [control-plane.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/control-plane.d.ts): **4** usages
- [control-plane.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/control-plane.ts): **17** usages
- [deployment-registry.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/deployment-registry.d.ts): **1** usages
- [deployment-registry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/deployment-registry.ts): **4** usages
- [disaster-recovery.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/disaster-recovery.ts): **2** usages
- [divergence-monitor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/divergence-monitor.ts): **2** usages
- [divergence.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/divergence.ts): **1** usages
- [durable-orchestration.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/durable-orchestration.d.ts): **16** usages
- [durable-orchestration.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/durable-orchestration.ts): **35** usages
- [durable-wal.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/durable-wal.d.ts): **1** usages
- [durable-wal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/durable-wal.ts): **2** usages
- [event-store.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/event-store.d.ts): **3** usages
- [event-store.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/event-store.ts): **3** usages
- [execution-epoch.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/execution-epoch.d.ts): **2** usages
- [execution-epoch.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/execution-epoch.ts): **2** usages
- [federated-replay.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/federated-replay.ts): **1** usages
- [index.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/index.d.ts): **2** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/index.ts): **2** usages
- [ingress-journal.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/ingress-journal.d.ts): **2** usages
- [ingress-journal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/ingress-journal.ts): **2** usages
- [journal.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/journal.d.ts): **1** usages
- [journal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/journal.ts): **2** usages
- [offheap-store.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/offheap-store.d.ts): **2** usages
- [offheap-store.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/offheap-store.ts): **2** usages
- [promise-factory.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/promise-factory.d.ts): **5** usages
- [promise-factory.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/promise-factory.ts): **6** usages
- [purity-guard.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/purity-guard.ts): **5** usages
- [replay-diagnostics.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replay-diagnostics.d.ts): **2** usages
- [replay-diagnostics.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replay-diagnostics.ts): **2** usages
- [replay.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replay.d.ts): **4** usages
- [replay.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replay.ts): **5** usages
- [replicated-wal.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replicated-wal.d.ts): **9** usages
- [replicated-wal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/replicated-wal.ts): **12** usages
- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/run-tests.ts): **2** usages
- [scheduler.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/scheduler.d.ts): **3** usages
- [scheduler.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/scheduler.ts): **5** usages
- [tcp-transport.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/tcp-transport.ts): **7** usages
- [version-migration.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/version-migration.d.ts): **6** usages
- [version-migration.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/version-migration.ts): **9** usages
- [versioning.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/versioning.d.ts): **2** usages
- [versioning.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/versioning.ts): **2** usages
- [virtual-timer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/virtual-timer.ts): **9** usages
- [vm-sandbox.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/vm-sandbox.d.ts): **1** usages
- [vm-sandbox.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/vm-sandbox.ts): **7** usages
- [wal-compactor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/wal-compactor.ts): **1** usages
- [wasm-sandbox.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/wasm-sandbox.d.ts): **1** usages
- [wasm-sandbox.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/wasm-sandbox.ts): **3** usages
- [worker-sandbox.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/worker-sandbox.d.ts): **1** usages
- [worker-sandbox.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/worker-sandbox.ts): **1** usages
- [workflow-sdk.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/workflow-sdk.d.ts): **6** usages
- [workflow-sdk.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-pilot/src/workflow-sdk.ts): **8** usages

#### `apps/core-api` (201 findings)

- [supabase.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/lib/supabase.d.ts): **1** usages
- [rbac.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/middleware/rbac.d.ts): **2** usages
- [mpc_e2e_verify.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/mpc_e2e_verify.ts): **3** usages
- [debug-controller.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/controllers/debug-controller.ts): **13** usages
- [instrumentation.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/instrumentation.ts): **2** usages
- [ztan-governance.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/routes/ztan-governance.ts): **3** usages
- [ztan.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/routes/ztan.ts): **14** usages
- [actuation-controller.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/actuation-controller.ts): **1** usages
- [strategy-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/agent-intelligence/strategy-engine.ts): **1** usages
- [approval-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/approval-service.ts): **1** usages
- [auto-healer.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/auto-healer.ts): **5** usages
- [cache-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/cache-service.ts): **3** usages
- [calibration-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/calibration-engine.ts): **13** usages
- [github-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/devops/github-service.ts): **1** usages
- [identity.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/identity.service.ts): **5** usages
- [kubernetes-actuator.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/kubernetes-actuator.ts): **2** usages
- [adaptive-reliability.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/adaptive-reliability.ts): **1** usages
- [anomaly-detector.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/anomaly-detector.ts): **1** usages
- [baseline-snapshot-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/baseline-snapshot-service.ts): **1** usages
- [convergence-monitor.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/convergence-monitor.ts): **3** usages
- [distribution-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/distribution-analyzer.ts): **9** usages
- [fix-recommender.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/fix-recommender.ts): **1** usages
- [isolation-forest.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/isolation-forest.service.ts): **1** usages
- [knowledge-store.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/knowledge-store.ts): **1** usages
- [learning-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/learning-engine.ts): **1** usages
- [log-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/log-analyzer.ts): **3** usages
- [probabilistic-causal-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/probabilistic-causal-engine.ts): **3** usages
- [q-learning-agent.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/learning/q-learning-agent.ts): **2** usages
- [embeddings-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/memory/embeddings-engine.ts): **3** usages
- [notification-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/notification-service.ts): **1** usages
- [observer-reliability.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/observer-reliability.ts): **1** usages
- [causal-verification-suite.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/causal-verification-suite.ts): **3** usages
- [chaos-simulator.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/chaos-simulator.ts): **1** usages
- [decision-audit.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/decision-audit.ts): **1** usages
- [digital-twin.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/digital-twin.ts): **2** usages
- [global-coordinator.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/global-coordinator.ts): **2** usages
- [global-report.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/global-report.ts): **1** usages
- [post-mortem-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/post-mortem-service.ts): **1** usages
- [post-mortem.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/post-mortem.ts): **6** usages
- [sre-analytics.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/sre-analytics.ts): **2** usages
- [verification-coordinator.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/operational-control/verification-coordinator.ts): **1** usages
- [patch-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/patch-verifier.ts): **2** usages
- [project-service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/project-service.ts): **9** usages
- [retry-manager.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/retry-manager.ts): **3** usages
- [safety.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/safety.ts): **1** usages
- [self-evaluator.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/self-evaluator.ts): **1** usages
- [soak-tester.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/soak-tester.ts): **1** usages
- [socket.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/socket.ts): **10** usages
- [sre-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/sre-engine.ts): **11** usages
- [sre-streaming.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/sre-streaming.ts): **12** usages
- [stability-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/stability-engine.ts): **3** usages
- [state-reconciler.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/state-reconciler.ts): **2** usages
- [supervisor.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/supervisor.ts): **5** usages
- [telemetry-ingestion.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/telemetry-ingestion.service.ts): **3** usages
- [tss-session.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/tss-session.service.ts): **10** usages
- [validation-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/src/services/validation-engine.ts): **1** usages
- [load_validation_phase3.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/tests/load_validation_phase3.test.ts): **1** usages
- [resilience_phase2.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/tests/resilience_phase2.test.ts): **2** usages
- [security_phase1.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/core-api/tests/security_phase1.test.ts): **2** usages

#### `apps/frontend` (200 findings)

- [sre-truth.spec.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/e2e/sre-truth.spec.ts): **2** usages
- [console.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/console/console.component.ts): **36** usages
- [input-panel.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/console/input-panel.component.ts): **6** usages
- [output-panel.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/console/output-panel.component.ts): **1** usages
- [threshold-panel.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/console/threshold-panel.component.ts): **2** usages
- [admin.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/admin.service.ts): **9** usages
- [api.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/api.service.ts): **3** usages
- [debug-mode.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/debug-mode.service.ts): **2** usages
- [recovery.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/recovery.service.ts): **46** usages
- [sre-data.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/sre-data.service.ts): **15** usages
- [system-health.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/system-health.service.ts): **8** usages
- [websocket.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/websocket.service.ts): **2** usages
- [ztan.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/core/services/ztan.service.ts): **5** usages
- [alert-center.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/admin/components/alert-center.component.ts): **1** usages
- [tenant-overview.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/admin/components/tenant-overview.component.ts): **1** usages
- [audit-verifier.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/audit/audit-verifier.ts): **12** usages
- [console-home.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/console-home/console-home.ts): **2** usages
- [financial-approval-demo.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/demo/financial-approval-demo.component.ts): **5** usages
- [incident-center.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/incidents/incident-center.ts): **2** usages
- [mission-detail.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/missions/mission-detail.ts): **4** usages
- [mission-list.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/missions/mission-list.ts): **1** usages
- [mission.facade.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/missions/mission.facade.ts): **10** usages
- [rollback-impact-panel.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/replay-explorer/components/rollback-impact-panel/rollback-impact-panel.component.ts): **1** usages
- [trust-rail.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/replay-explorer/components/trust-rail/trust-rail.component.ts): **1** usages
- [causal-graph.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/components/causal-graph.ts): **1** usages
- [consensus-panel.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/consensus-panel.ts): **1** usages
- [post-commit-panel.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/post-commit-panel.ts): **1** usages
- [sre-analytics-dashboard.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/sre-analytics-dashboard.ts): **2** usages
- [sre-observability.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/sre-observability.ts): **4** usages
- [operator-actions.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/sre-observability/widgets/operator-actions.ts): **1** usages
- [metrics-grid.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/system-health/components/metrics-grid.ts): **1** usages
- [trace-log.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/system-health/components/trace-log.ts): **1** usages
- [system-health.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/system-health/system-health.ts): **5** usages
- [timeline-view.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/timeline/timeline-view.ts): **2** usages
- [usage.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/usage/usage.component.ts): **1** usages
- [trust-dashboard.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/features/ztan/trust-dashboard.component.ts): **1** usages
- [navbar.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/layout/components/navbar.ts): **1** usages
- [pricing-table.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/frontend/src/app/shared/components/pricing-table/pricing-table.component.ts): **1** usages

#### `apps/gateway` (108 findings)

- [socket.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/socket.d.ts): **1** usages
- [socket.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/socket.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/index.ts): **3** usages
- [tier-limiter.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/middleware/tier-limiter.ts): **2** usages
- [admin-dlq.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/routes/admin-dlq.ts): **5** usages
- [admin.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/routes/admin.ts): **12** usages
- [resume.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/routes/resume.ts): **1** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/server.ts): **72** usages
- [socket.ts](file:///c:/multiagentic_project/multiAgent-main/apps/gateway/src/socket.ts): **11** usages

#### `apps/operational-protocol` (103 findings)

- [determinism-fuzzer.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/scripts/determinism-fuzzer.ts): **3** usages
- [ztan-verify.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/scripts/ztan-verify.ts): **1** usages
- [audit-server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/audit-server.ts): **1** usages
- [audit-verify.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/audit-verify.d.ts): **1** usages
- [audit-verify.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/audit-verify.ts): **1** usages
- [consensus-engine.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/consensus-engine.ts): **10** usages
- [crypto-utils.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/crypto-utils.ts): **1** usages
- [stability-circuit.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/stability-circuit.ts): **1** usages
- [types.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/types.d.ts): **1** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/src/types.ts): **1** usages
- [adversarial_convergence.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/adversarial_convergence.test.ts): **5** usages
- [adversarial_governance.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/adversarial_governance.test.ts): **4** usages
- [audit_archive.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/audit_archive.test.ts): **8** usages
- [audit_freeze.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/audit_freeze.test.ts): **3** usages
- [audit_pilot.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/audit_pilot.test.ts): **2** usages
- [audit_science.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/audit_science.test.ts): **3** usages
- [byzantine_coordinator.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/byzantine_coordinator.test.ts): **2** usages
- [ceremony_simulation.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/ceremony_simulation.test.ts): **3** usages
- [confidence_claims.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/confidence_claims.test.ts): **1** usages
- [constitution_claims.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/constitution_claims.test.ts): **2** usages
- [dashboard_permanency.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/dashboard_permanency.test.ts): **1** usages
- [distributed_persistence.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/distributed_persistence.test.ts): **7** usages
- [governance_economics.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/governance_economics.test.ts): **7** usages
- [ledger_surface.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/ledger_surface.test.ts): **1** usages
- [model_based_consensus.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/model_based_consensus.test.ts): **3** usages
- [network_partition.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/network_partition.test.ts): **1** usages
- [operational_hardening.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/operational_hardening.test.ts): **6** usages
- [persistence_recovery.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/persistence_recovery.test.ts): **4** usages
- [pilot_transparency.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/pilot_transparency.test.ts): **1** usages
- [recovery_consistency.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/recovery_consistency.test.ts): **7** usages
- [scalability_survivability.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/scalability_survivability.test.ts): **6** usages
- [stability_transparency.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/stability_transparency.test.ts): **3** usages
- [threat_model_freeze.test.ts](file:///c:/multiagentic_project/multiAgent-main/apps/operational-protocol/test/threat_model_freeze.test.ts): **2** usages

#### `packages/runtime-core` (102 findings)

- [long-horizon-runner.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/adversarial/long-horizon-runner.ts): **2** usages
- [recovery-consistency-scanner.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/adversarial/recovery-consistency-scanner.ts): **2** usages
- [replay-entropy-auditor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/adversarial/replay-entropy-auditor.ts): **5** usages
- [failure-bundle-generator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/archaeology/failure-bundle-generator.ts): **4** usages
- [persistence-archaeologist.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/archaeology/persistence-archaeologist.ts): **6** usages
- [postgres-failure-lab.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/archaeology/postgres-failure-lab.ts): **1** usages
- [stewardship-memory-preservator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/archaeology/stewardship-memory-preservator.ts): **1** usages
- [wal-sequence-exporter.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/archaeology/wal-sequence-exporter.ts): **3** usages
- [cold-path-exerciser.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/campaigns/cold-path-exerciser.ts): **1** usages
- [entropy-harness.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/campaigns/entropy-harness.ts): **1** usages
- [evidence-compactor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/chronology/evidence-compactor.ts): **4** usages
- [evidence-retention-enforcer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/chronology/evidence-retention-enforcer.ts): **3** usages
- [historical-replay-compatibility.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/chronology/historical-replay-compatibility.ts): **6** usages
- [replay-compressor.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/chronology/replay-compressor.ts): **1** usages
- [schema-compatibility-validator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/chronology/schema-compatibility-validator.ts): **8** usages
- [bounded-workflow-engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/bounded-workflow-engine.ts): **1** usages
- [compacting-journal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/compacting-journal.ts): **3** usages
- [execution-contract-validator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/execution-contract-validator.ts): **2** usages
- [execution-coordinator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/execution-coordinator.ts): **4** usages
- [execution-journal.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/execution-journal.ts): **2** usages
- [execution-validation-campaigns.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/execution-validation-campaigns.ts): **6** usages
- [rollback-coordinator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/rollback-coordinator.ts): **3** usages
- [shadow-execution-engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/execution/shadow-execution-engine.ts): **9** usages
- [resource-pressure.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/pathology/resource-pressure.ts): **1** usages
- [time-warp-pathology.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/pathology/time-warp-pathology.ts): **4** usages
- [continuous-soak-runner.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/continuous-soak-runner.ts): **1** usages
- [evidence-plane-decoupler.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/evidence-plane-decoupler.ts): **1** usages
- [freeze-escape-coordinator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/freeze-escape-coordinator.ts): **2** usages
- [governance-resurrection-registry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/governance-resurrection-registry.ts): **6** usages
- [operational-economics-model.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/operational-economics-model.ts): **1** usages
- [soak-report-generator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/soak/soak-report-generator.ts): **4** usages
- [enclave-runner.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/supervisor/enclave-runner.ts): **1** usages
- [host-daemon.ts](file:///c:/multiagentic_project/multiAgent-main/packages/runtime-core/src/supervisor/host-daemon.ts): **3** usages

#### `apps/worker` (94 findings)

- [git.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/services/git.d.ts): **3** usages
- [logger.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/services/logger.ts): **1** usages
- [pluginRunner.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/services/pluginRunner.d.ts): **1** usages
- [pluginRunner.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/services/pluginRunner.ts): **1** usages
- [usage.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/services/usage.ts): **1** usages
- [analytics-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/analytics-worker.ts): **2** usages
- [architecture-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/architecture-worker.ts): **1** usages
- [backend-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/backend-worker.ts): **3** usages
- [base-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/base-worker.ts): **7** usages
- [billing-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/billing-worker.ts): **2** usages
- [build-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/build-worker.ts): **5** usages
- [deploy-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/deploy-worker.ts): **2** usages
- [docker-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/docker-worker.ts): **5** usages
- [evaluation-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/evaluation-worker.ts): **1** usages
- [frontend-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/frontend-worker.ts): **2** usages
- [generator-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/generator-worker.ts): **2** usages
- [git-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/git-worker.ts): **1** usages
- [growthAgent.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/growthAgent.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/index.ts): **10** usages
- [meta-agent-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/meta-agent-worker.ts): **1** usages
- [mission-recorder.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/mission-recorder.ts): **4** usages
- [mission-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/mission-worker.ts): **6** usages
- [pattern-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/pattern-worker.ts): **2** usages
- [planner-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/planner-worker.ts): **4** usages
- [queue-manager.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/queue-manager.ts): **1** usages
- [reliability-aggregator-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/reliability-aggregator-worker.ts): **4** usages
- [repair-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/repair-worker.ts): **10** usages
- [rollback-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/rollback-worker.ts): **1** usages
- [sandbox-runner.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/sandbox-runner.ts): **1** usages
- [self-modification-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/self-modification-worker.ts): **2** usages
- [temporal-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/temporal-worker.ts): **1** usages
- [validator-worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/validator-worker.ts): **2** usages
- [buildWorker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/src/workers/buildWorker.ts): **2** usages
- [appBuilder.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/worker/workflows/appBuilder.d.ts): **2** usages

#### `apps/capability-runtime` (77 findings)

- [preload-isolation.ts](file:///c:/multiagentic_project/multiAgent-main/apps/capability-runtime/src/preload-isolation.ts): **64** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/capability-runtime/src/server.ts): **3** usages
- [supervisor.ts](file:///c:/multiagentic_project/multiAgent-main/apps/capability-runtime/src/supervisor.ts): **10** usages

#### `apps/stewardship-console` (70 findings)

- [incident-center.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/app/pages/incidents/incident-center.component.ts): **2** usages
- [recovery-console.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/app/pages/recovery/recovery-console.component.ts): **2** usages
- [replay-explorer.component.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/app/pages/replay/replay-explorer.component.ts): **8** usages
- [stewardship.service.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/app/stewardship.service.ts): **20** usages
- [archaeology.worker.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/app/workers/archaeology.worker.ts): **27** usages
- [integrity-scanner.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/integrity-scanner.ts): **2** usages
- [recovery.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/recovery.ts): **2** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-console/src/server.ts): **7** usages

#### `packages/ztan-witness` (67 findings)

- [audit.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/audit.ts): **3** usages
- [chaos-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/chaos-tests.ts): **4** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/index.ts): **21** usages
- [physical-pathology-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/physical-pathology-tests.ts): **8** usages
- [resilience-engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/resilience-engine.ts): **4** usages
- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/run-tests.ts): **7** usages
- [soak-test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/soak-test.ts): **2** usages
- [survivability-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/survivability-tests.ts): **7** usages
- [synthetic-pathology-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/synthetic-pathology-tests.ts): **6** usages
- [witness.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztan-witness/src/witness.test.ts): **5** usages

#### `packages/db` (59 findings)

- [bootstrap.ts](file:///c:/multiagentic_project/multiAgent-main/packages/db/src/bootstrap.ts): **1** usages
- [index.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/db/src/index.d.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/db/src/index.ts): **56** usages
- [rls-client.ts](file:///c:/multiagentic_project/multiAgent-main/packages/db/src/rls-client.ts): **1** usages

#### `packages/ztanctl` (36 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/ztanctl/src/index.ts): **36** usages

#### `packages/observability` (31 findings)

- [index.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/observability/src/index.d.ts): **3** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/observability/src/index.ts): **28** usages

#### `apps/auth-service` (23 findings)

- [scim.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/auth-service/scim.d.ts): **6** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/auth-service/src/server.ts): **16** usages
- [oidc.d.ts](file:///c:/multiagentic_project/multiAgent-main/apps/auth-service/sso/oidc.d.ts): **1** usages

#### `packages/contracts` (23 findings)

- [archaeology.ts](file:///c:/multiagentic_project/multiAgent-main/packages/contracts/src/archaeology.ts): **1** usages
- [evidence-ledger.ts](file:///c:/multiagentic_project/multiAgent-main/packages/contracts/src/evidence-ledger.ts): **2** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/contracts/src/index.ts): **7** usages
- [sre.ts](file:///c:/multiagentic_project/multiAgent-main/packages/contracts/src/sre.ts): **13** usages

#### `packages/production-validation` (23 findings)

- [phase-d-adversarial-drill.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-validation/src/phase-d-adversarial-drill.ts): **1** usages
- [phase-e-postgres-chaos-drill.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-validation/src/phase-e-postgres-chaos-drill.ts): **12** usages
- [stewardship-engineering-suite.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-validation/src/stewardship-engineering-suite.ts): **8** usages
- [survivability.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-validation/src/survivability.ts): **1** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/production-validation/src/types.ts): **1** usages

#### `packages/resilience` (20 findings)

- [classifier.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/classifier.ts): **1** usages
- [outbound.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/outbound.ts): **2** usages
- [rateLimiter.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/rateLimiter.ts): **11** usages
- [retry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/retry.ts): **1** usages
- [saga.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/saga.ts): **4** usages
- [serviceAuth.ts](file:///c:/multiagentic_project/multiAgent-main/packages/resilience/src/serviceAuth.ts): **1** usages

#### `packages/core-engine` (17 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/core-engine/src/index.ts): **9** usages
- [mission-orchestrator.test.ts](file:///c:/multiagentic_project/multiAgent-main/packages/core-engine/src/mission-orchestrator.test.ts): **2** usages
- [mission-orchestrator.ts](file:///c:/multiagentic_project/multiAgent-main/packages/core-engine/src/mission-orchestrator.ts): **1** usages
- [longitudinal-analyzer.ts](file:///c:/multiagentic_project/multiAgent-main/packages/core-engine/src/reporting/longitudinal-analyzer.ts): **4** usages
- [replay-certification.ts](file:///c:/multiagentic_project/multiAgent-main/packages/core-engine/src/reporting/replay-certification.ts): **1** usages

#### `packages/agents` (10 findings)

- [architecture-agent.ts](file:///c:/multiagentic_project/multiAgent-main/archive/stewardship_pruning/pnpm_test/packages/agents/src/architecture-agent.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/agents/src/index.ts): **9** usages

#### `packages/tools` (10 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/tools/src/index.ts): **3** usages
- [registry.ts](file:///c:/multiagentic_project/multiAgent-main/packages/tools/src/registry.ts): **7** usages

#### `packages/autonomous-ops` (7 findings)

- [decision-audit.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/decision-audit.ts): **1** usages
- [kubernetes.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/drivers/kubernetes.d.ts): **1** usages
- [kubernetes.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/drivers/kubernetes.ts): **1** usages
- [terraform.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/drivers/terraform.ts): **1** usages
- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/engine.ts): **1** usages
- [types.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/types.d.ts): **1** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/autonomous-ops/src/types.ts): **1** usages

#### `packages/deployment-hardening` (6 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/deployment-hardening/src/index.ts): **5** usages
- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/deployment-hardening/src/run-tests.ts): **1** usages

#### `packages/infra-graph` (6 findings)

- [types.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/infra-graph/src/types.d.ts): **3** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/infra-graph/src/types.ts): **3** usages

#### `apps/governance-ledger` (5 findings)

- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/governance-ledger/src/server.ts): **5** usages

#### `apps/policy-engine` (4 findings)

- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/policy-engine/src/server.ts): **4** usages

#### `packages/evidence-lifecycle` (4 findings)

- [crypto-utils.ts](file:///c:/multiagentic_project/multiAgent-main/packages/evidence-lifecycle/src/crypto-utils.ts): **2** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/evidence-lifecycle/src/index.ts): **1** usages
- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/evidence-lifecycle/src/run-tests.ts): **1** usages

#### `apps/intent-gateway` (3 findings)

- [execution-token.ts](file:///c:/multiagentic_project/multiAgent-main/apps/intent-gateway/src/execution-token.ts): **1** usages
- [semantic-scorer.ts](file:///c:/multiagentic_project/multiAgent-main/apps/intent-gateway/src/semantic-scorer.ts): **1** usages
- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/intent-gateway/src/server.ts): **1** usages

#### `apps/sandbox-service` (3 findings)

- [server.ts](file:///c:/multiagentic_project/multiAgent-main/apps/sandbox-service/src/server.ts): **3** usages

#### `packages/global-reliability` (3 findings)

- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/global-reliability/src/engine.ts): **3** usages

#### `packages/operator-compression` (3 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/operator-compression/src/index.ts): **2** usages
- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/operator-compression/src/run-tests.ts): **1** usages

#### `packages/reliability-intelligence` (3 findings)

- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/reliability-intelligence/src/engine.ts): **2** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/reliability-intelligence/src/types.ts): **1** usages

#### `packages/stewardship-console` (3 findings)

- [soak-testing.spec.ts](file:///c:/multiagentic_project/multiAgent-main/packages/stewardship-console/tests/chaos/soak-testing.spec.ts): **1** usages
- [csp-enforcement.spec.ts](file:///c:/multiagentic_project/multiAgent-main/packages/stewardship-console/tests/governance/csp-enforcement.spec.ts): **1** usages
- [memory-ceiling.spec.ts](file:///c:/multiagentic_project/multiAgent-main/packages/stewardship-console/tests/governance/memory-ceiling.spec.ts): **1** usages

#### `packages/validator` (3 findings)

- [index.d.ts](file:///c:/multiagentic_project/multiAgent-main/packages/validator/src/index.d.ts): **1** usages
- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/validator/src/index.ts): **2** usages

#### `apps/deploy-service` (2 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/apps/deploy-service/src/index.ts): **2** usages

#### `apps/stewardship-orchestrator` (2 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/apps/stewardship-orchestrator/src/index.ts): **2** usages

#### `packages/business` (2 findings)

- [roi-pipeline.ts](file:///c:/multiagentic_project/multiAgent-main/packages/business/src/roi-pipeline.ts): **2** usages

#### `packages/economic-intelligence` (2 findings)

- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/economic-intelligence/src/engine.ts): **2** usages

#### `packages/governance-sdk` (2 findings)

- [client.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-sdk/src/client.ts): **1** usages
- [types.ts](file:///c:/multiagentic_project/multiAgent-main/packages/governance-sdk/src/types.ts): **1** usages

#### `packages/survivability-sim` (2 findings)

- [engine.ts](file:///c:/multiagentic_project/multiAgent-main/packages/survivability-sim/src/engine.ts): **2** usages

#### `apps/reliability-dashboard` (1 findings)

- [App.tsx](file:///c:/multiagentic_project/multiAgent-main/apps/reliability-dashboard/src/App.tsx): **1** usages

#### `packages/auth-internal` (1 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/auth-internal/src/index.ts): **1** usages

#### `packages/institutional-dashboard` (1 findings)

- [run-tests.ts](file:///c:/multiagentic_project/multiAgent-main/packages/institutional-dashboard/src/run-tests.ts): **1** usages

#### `packages/memory-cache` (1 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/memory-cache/src/index.ts): **1** usages

#### `packages/self-evolution` (1 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/self-evolution/src/index.ts): **1** usages

#### `packages/supply-chain` (1 findings)

- [index.ts](file:///c:/multiagentic_project/multiAgent-main/packages/supply-chain/src/index.ts): **1** usages

