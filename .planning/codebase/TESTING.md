# Testing

**Analysis Date:** 2026-05-10

## Testing Strategy: Multi-Layered Validation

The project uses a rigorous multi-tier testing strategy, prioritizing safety and convergence.

### 1. Unit Tests
- **Framework**: Vitest.
- **Scope**: Individual functions, classes, and React components.
- **Location**: Typically sibling to source files (e.g., `src/utils.test.ts`).

### 2. Integration Tests
- **Framework**: tsx/Vitest.
- **Scope**: Cross-package and cross-service flows (e.g., Auth -> Core API -> DB).
- **Key Tests**: `test/integration/e2e-validation.ts`.

### 3. Chaos & Adversarial Testing
- **Tools**: `chaos-run.ps1`, `test/integration/chaos-test.ts`.
- **Scope**: Network partitions, clock skew, process crashes, and database corruption.
- **Goal**: Prove 100% convergence and safety under stress.

### 4. Certification & Audit
- **Tools**: `test/integration/causal-certification.ts`, `test/integration/trust-hitl-certification.ts`.
- **Scope**: Formally verifying safety envelopes and governance compliance.
- **Reports**: `CERTIFICATION_REPORT_LATEST.md`, `ZTAN_VALIDATION_REPORT.md`.

### 5. Performance & Load
- **Tool**: K6.
- **Scope**: Latency benchmarks, concurrent mission capacity, and queue throughput.
- **Key Tests**: `k6/`, `benchmarks/`.

## Test Execution

- **Standard**: `pnpm test` (runs Vitest in all packages).
- **Chaos**: `pnpm run test:chaos`.
- **Certification**: `pnpm run test:certify`.
- **E2E**: `pnpm run test:e2e`.

## Continuous Integration (CI)
- All PRs must pass unit and integration tests.
- High-risk changes require a full chaos soak and certification pass.

---

*Testing analysis: 2026-05-10*
