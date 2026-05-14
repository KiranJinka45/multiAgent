# ZTAN Recovery Determinism Log

This log tracks the MTTR (Mean Time To Recovery) and timing variance for full-scale cluster restoration across different environmental conditions.

## Recovery Targets
- **Baseline (Clean)**: < 15 minutes
- **Constrained (Low Resources)**: < 30 minutes
- **Adversarial (High Stress)**: < 45 minutes

## Execution History

| Date | Condition | Duration (s) | Variance | Verdict |
|---|---|---|---|---|
| 2026-05-13 | Baseline | 840 | -- | PASSED |
| 2026-05-14 | Constrained | 1420 | +69% | PASSED |
| **2026-05-14** | **Adversarial** | **2240** | **+166%** | **PASSED** |

---
**Institutional Certification Threshold**: Any recovery exceeding 45 minutes or exhibiting >200% variance from baseline requires a "Complexity Pruning" audit.
