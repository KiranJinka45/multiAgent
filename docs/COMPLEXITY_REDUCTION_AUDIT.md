# ZTAN Complexity Reduction Audit

Operational "boringness" is achieved through the aggressive subtraction of redundant abstractions.

## Measurement Framework

The `OperationalComplexityAudit` measures platform entropy using three primary vectors:

1. **CLI Sprawl Index**: Count of unique commands and argument permutations. High sprawl increases the probability of operator error.
2. **Cognitive Burden Score**: Average time required for an operator to identify the correct remediation path for a failure.
3. **Entropy Drift**: The rate at which new abstractions are introduced relative to the rate of subtraction.

## The Subtraction Registry

Features identified as redundant are added to the registry for eventual pruning.

- **Status: DEPRECATED**: Feature is shadowed by a superior primitive.
- **Status: PRUNED**: Code removed from the main branch.
- **Status: RECOVERABLE**: Code archived in forensic history but removed from runtime.

## Commands

- `ztanctl telemetry complexity`: Run a platform-wide entropy audit.
- `ztanctl simplify prune`: List features eligible for subtraction.
- `ztanctl simplify audit`: Measure monorepo-level technical debt.
