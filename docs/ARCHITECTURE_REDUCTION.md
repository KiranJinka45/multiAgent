# ZTAN ARCHITECTURE REDUCTION (Post-Roadmap Milestone 2)

## 1. Structural Separation: Core vs. Research

To ensure operational survivability, the platform is now split into two distinct domains.

### 🛡️ ZTAN Core (The Operational Runtime)
*Must be minimal, stable, and chaos-tested.*
- **Execution**: Mission orchestration and agent coordination.
- **Trace & Replay**: Deterministic recording and forensic validation.
- **Persistence**: Durable state survival (Tier 3+).
- **Policy Engine**: Concrete RBAC and execution constraints.
- **Observability**: Real-time metrics, logs, and failure visibility.

### 🧪 ZTAN Research Layer (The Experimental Modeling)
*Non-essential for runtime; research-only modules.*
- **Institutional Sociology**: Modeling organizational friction and deadlocks.
- **Governance Simulations**: Sovereign schisms and speculative forks.
- **Legitimacy Heuristics**: Simulated maturity indices and survival models.
- **Adversarial Sociology**: Reputation warfare and narrative attacks.

## 2. Operational Burden Metrics (The Sustainability Audit)

We now track architectural sustainability through concrete metrics.

| Metric | Threshold | Why It Matters |
| :--- | :--- | :--- |
| **Build Time** | < 30s | Complexity pressure indicator. |
| **Module Fan-out** | < 5 | Maintainability and coupling risk. |
| **Restart Recovery** | < 2s | Tier 3-5 survivability. |
| **Dependency Depth** | < 10 | Architectural entropy control. |
| **Trace Replay Latency** | < 5s | Forensic practicality. |

## 3. Reduction Action Items

1. **Decouple**: Extract `SovereignAuthority`, `LiabilityRegistry`, and `Institutional Hooks` into a separate `research/` directory or package.
2. **Stabilize Core**: Fix cross-package export failures and brittle module boundaries in `runtime-core` and `utils`.
3. **Minimize Server**: Refactor `packages/utils/src/server.ts` to remove non-essential "Research" gatekeepers.
