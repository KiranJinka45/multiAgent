# Concerns

**Analysis Date:** 2026-05-10

## Technical Debt & Risks

### 1. ESM Transition Complexity
The project is mid-transition to ESM (`NodeNext`). This causes occasional module resolution issues, especially with TypeScript and Prisma. Continued vigilance is required in `tsconfig` and import paths.

### 2. Multi-Region State Consistency
While Raft and Redis-based anti-entropy are implemented, regional state divergence remains a risk under prolonged network partitions. Convergence monitoring is critical.

### 3. Dependency Fragility
The monorepo has a large number of dependencies. Version mismatches across packages can lead to subtle runtime bugs. `pnpm overrides` are heavily used to stabilize this.

### 4. Cold Start & Scaling
The microservice architecture with many specialized services can lead to slow "cold starts" in a cluster. Scaling of the `worker` service needs careful tuning of the `sandbox` resource limits.

## Operational Risks

### 1. Governance Deadlocks
Strict governance policies could lead to "deadlocks" where the AI cannot act because of conflicting rules or high uncertainty. Manual HITL (Human-In-The-Loop) mechanisms are essential but add friction.

### 2. Forensic Readability
The audit logs and ZTAN proofs are cryptographically sound but can be difficult for human operators to interpret quickly during an incident.

### 3. Economic Stability
The ROI and cost tracking are in early stages (Phase 6/7). Unchecked recursive orchestration could lead to economic runaway if cost-capping logic fails.

## Areas for Improvement

- **Onboarding UX**: The complexity of the monorepo makes it hard for new developers/operators to get started.
- **Visual Diagnostics**: Need better real-time visualization of mission DAGs and ZTAN proof trees.
- **Recovery Drills**: More systematic rehearsals for catastrophic failures (e.g., total Redis loss).

---

*Concerns analysis: 2026-05-10*
