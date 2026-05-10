# ZTAN COMPLEXITY BUDGETS & STABILITY GATES

To ensure the **Minimum Operational Core (MOC)** remains a durable and maintainable infrastructure, all additions must satisfy the following complexity budgets and stability gates.

## 1. Architectural Budgets

| Metric | Budget | Rationale |
| :--- | :--- | :--- |
| **Build Time** | < 30 seconds | Prevents CI/CD friction and complexity pressure. |
| **Module Fan-out** | < 5 | Limits fragility and promotes high cohesion. |
| **Circular Dependencies** | 0 | Prevents initialization deadlocks and memory leaks. |
| **Startup Time** | < 10 seconds | Ensures rapid failover and recovery. |
| **Trace Replay Latency** | < 5 seconds | Keeps forensic audit practical for operators. |

## 2. Core Stability Gates (The MOC Check)

No feature or module shall be integrated into the **ZTAN Core** unless it satisfies the following criteria:

1. **Operational Necessity**: Must be required for execution, trace, persistence, or safety.
2. **Restart Survival**: Must persist state to disk and recover after a SIGKILL.
3. **Replay Continuity**: Must not break the deterministic replay of historical traces.
4. **Chaos Resilience**: Must be validated via the `chaos-matrix.ts` harness.
5. **Observability**: Must emit structured events for audit and failure analysis.

## 3. Dependency Direction Policy

- **MOC → External**: Minimal (only core libraries).
- **Research → MOC**: Allowed (modeling on top of core).
- **MOC → Research**: **PROHIBITED**.

Violation of these budgets or gates will trigger an immediate **Architecture Reduction** requirement.
