# ZTAN Intra-Host Repeatability Report under Campaign-Scoped Constraints

Generated: **2026-05-26T17:19:07.699Z**
Total Campaigns Analyzed: **50**
Analyzable Seed Groups (≥ 2 runs): **6**

## 📊 Global Repeatability Summary

| Metric | Value |
|---|---|
| **Mean Dispersion** | 2.91% |
| **Worst Dispersion** | 46.16% |
| **Worst Metric** | global/p95 Latency |
| **Categorical Stability Verdict** | 🟢 **Within Nominal Historical Envelope** |

> Note: ZTAN employs **Bounded Epistemic Humility** for operational evaluations:
> - **Deterministic Initial Conditions vs. Stochastic Runtime Execution**: Database pre-population is deterministic, but execution remains inherently stochastic due to V8 GC nondeterminism, OS scheduler jitter, network races, and PostgreSQL execution planner variance.
> - **Policy-Based Operational Grading**: All thresholds (e.g. "Within Nominal Historical Envelope" $\le 10\%$ dispersion) are policy-driven consistency boundaries designed for operational SRE guarding, rather than formal inferential statistical proofs.
> - **rCV (Robust Coefficient of Variation)** is computed using MAD and Median for Class P (Performance) positive metrics.
> - **SND (Scale-Normalized Dispersion)** is computed using MAD divided by the physical tolerance envelope for Class E (Environmental Drift) metrics.
> - Environmental fluctuations below empirical noise floors (e.g. heap variations < 15MB, handles <= 3) are completely bypassed ($0.00\%$ dispersion).

## 📈 Per-Group Variance Analysis

### Seed: `ZTAN_CANONICAL_SEED_TEST...` 🏷️ CANONICAL

- **Campaign Type:** test
- **Run Count:** 4
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** 1.03% 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 20.9464 | 3.3240 | 6.65% | 15.3087 | 62.8522 | 🟢 Within Nominal Historical Envelope |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.0223 | 1.11% | 0.8553 | 1.6063 | 🟢 Within Nominal Historical Envelope |
| Gateway | Heap Growth Delta | `SND` | -5.5860 MB | 7.0456 MB | Suppressed (Below Operational Noise Floor) | -14.2871 MB | 5.6914 MB | 🟢 Within Nominal Historical Envelope |
| Gateway | Handle Leak Delta | `SND` | 0.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | 0.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 10.7112 | 0.5095 | Suppressed (Below Operational Noise Floor) | 9.8564 | 13.2397 | 🟢 Within Nominal Historical Envelope |
| Gateway | GC p95 Pause | `SND` | 11.9684 | 4.9510 | Suppressed (Below Operational Noise Floor) | 6.8260 | 42.5015 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | 1.7842 MB | 1.7493 MB | Suppressed (Below Operational Noise Floor) | -4.1598 MB | 4.3636 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -2.0000 | -2.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 11.8973 | 0.9911 | 6.61% | 10.2808 | 23.1858 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | GC p95 Pause | `SND` | 9.8188 | 1.7079 | Suppressed (Below Operational Noise Floor) | 7.6302 | 27.4084 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -5.7850 MB | 0.2765 MB | Suppressed (Below Operational Noise Floor) | -6.2850 MB | 0.1546 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | -1.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -1.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 4.9619 | 0.2509 | Suppressed (Below Operational Noise Floor) | 4.5380 | 5.3652 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 8.0121 | 1.6536 | Suppressed (Below Operational Noise Floor) | 5.3207 | 14.3189 | 🟢 Within Nominal Historical Envelope |

### Seed: `PATHOLOGY_STRESS...` 🏷️ CANONICAL

- **Campaign Type:** test
- **Run Count:** 12
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** 7.55% 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 23.9392 | 6.7605 | 13.52% | 10.2744 | 70.6158 | 🟡 Minor Historical Deviation |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.2002 | 10.01% | 0.1963 | 1.6349 | 🟡 Minor Historical Deviation |
| Gateway | Heap Growth Delta | `SND` | 3.8475 MB | 10.7714 MB | 21.54% | -11.1561 MB | 33.2536 MB | 🟡 Minor Historical Deviation |
| Gateway | Handle Leak Delta | `SND` | 0.0000 | 0.5000 | 10.00% | -1.0000 | 8.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 13.3871 | 2.1704 | 14.47% | 10.8755 | 61.8466 | 🟡 Minor Historical Deviation |
| Gateway | GC p95 Pause | `SND` | 15.2243 | 4.6841 | Suppressed (Below Operational Noise Floor) | 6.5914 | 22.4279 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | 2.8166 MB | 2.0024 MB | 4.00% | -3.8252 MB | 50.9905 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | 0.00% | -2.0000 | 6.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 13.8189 | 2.2216 | 14.81% | 11.5107 | 99.8262 | 🟡 Minor Historical Deviation |
| CoreAPI | GC p95 Pause | `SND` | 11.2627 | 3.9024 | Suppressed (Below Operational Noise Floor) | 6.7348 | 32.0358 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -5.6951 MB | 4.9369 MB | 9.87% | -13.6844 MB | 27.6577 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | -1.0000 | 0.0000 | 0.00% | -1.0000 | 4.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 5.6363 | 0.3848 | 2.57% | 4.4060 | 41.7265 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 11.5676 | 4.8679 | 4.87% | 6.1664 | 56.6499 | 🟢 Within Nominal Historical Envelope |

### Seed: `NOMINAL_RUN...` 🏷️ CANONICAL

- **Campaign Type:** test
- **Run Count:** 4
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** 0.61% 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 20.5354 | 2.8395 | Suppressed (Below Operational Noise Floor) | 15.5220 | 27.9372 | 🟢 Within Nominal Historical Envelope |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.1707 | 8.54% | 0.6086 | 1.0237 | 🟢 Within Nominal Historical Envelope |
| Gateway | Heap Growth Delta | `SND` | -2.3863 MB | 8.0152 MB | Suppressed (Below Operational Noise Floor) | -11.7140 MB | 5.9430 MB | 🟢 Within Nominal Historical Envelope |
| Gateway | Handle Leak Delta | `SND` | -0.5000 | 0.5000 | Suppressed (Below Operational Noise Floor) | -1.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 11.2389 | 0.1750 | Suppressed (Below Operational Noise Floor) | 10.6454 | 11.4519 | 🟢 Within Nominal Historical Envelope |
| Gateway | GC p95 Pause | `SND` | 11.3338 | 3.5972 | Suppressed (Below Operational Noise Floor) | 7.1485 | 16.6335 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | 1.8627 MB | 1.1026 MB | Suppressed (Below Operational Noise Floor) | -14.8143 MB | 3.0384 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -2.0000 | -2.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 11.7944 | 0.6117 | Suppressed (Below Operational Noise Floor) | 11.0436 | 12.4578 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | GC p95 Pause | `SND` | 11.5612 | 4.7017 | Suppressed (Below Operational Noise Floor) | 6.1795 | 16.8106 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -2.7157 MB | 2.8933 MB | Suppressed (Below Operational Noise Floor) | -5.7153 MB | 0.2005 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | -1.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -1.0000 | -1.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 5.2171 | 0.1769 | Suppressed (Below Operational Noise Floor) | 4.1269 | 5.4611 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 13.7917 | 1.3074 | Suppressed (Below Operational Noise Floor) | 11.8107 | 15.3610 | 🟢 Within Nominal Historical Envelope |

### Seed: `TEST_WAVE5...`

- **Campaign Type:** test
- **Run Count:** 3
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** 5.39% 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 59.8378 | 27.6206 | 46.16% | 32.2172 | 98.3961 | 🟠 Moderate Historical Deviation |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.0049 | 0.24% | 0.6582 | 1.3444 | 🟢 Within Nominal Historical Envelope |
| Gateway | Heap Growth Delta | `SND` | -8.4076 MB | 0.0308 MB | Suppressed (Below Operational Noise Floor) | -8.4384 MB | 5.4210 MB | 🟢 Within Nominal Historical Envelope |
| Gateway | Handle Leak Delta | `SND` | 0.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | 0.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 15.3431 | 2.8848 | 18.80% | 12.4582 | 21.6855 | 🟡 Minor Historical Deviation |
| Gateway | GC p95 Pause | `SND` | 16.9582 | 8.2129 | Suppressed (Below Operational Noise Floor) | 7.5200 | 25.1711 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | -16.5231 MB | 0.3578 MB | Suppressed (Below Operational Noise Floor) | -16.8809 MB | -4.6222 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -2.0000 | -2.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 15.2397 | 1.5550 | 10.20% | 13.6847 | 22.4419 | 🟡 Minor Historical Deviation |
| CoreAPI | GC p95 Pause | `SND` | 12.6390 | 5.5098 | Suppressed (Below Operational Noise Floor) | 7.1292 | 24.3042 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -5.5689 MB | 0.0426 MB | Suppressed (Below Operational Noise Floor) | -5.6434 MB | -5.5263 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | 0.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -1.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 5.1926 | 0.2952 | Suppressed (Below Operational Noise Floor) | 4.8974 | 5.8066 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 11.1302 | 1.2741 | Suppressed (Below Operational Noise Floor) | 9.8561 | 15.5006 | 🟢 Within Nominal Historical Envelope |

### Seed: `TEST_REFINEMENTS_W5_HARDENED...`

- **Campaign Type:** test
- **Run Count:** 3
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** Suppressed (Below Operational Noise Floor) 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 22.3772 | 1.1053 | Suppressed (Below Operational Noise Floor) | 17.2407 | 23.4825 | 🟢 Within Nominal Historical Envelope |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.0023 | Suppressed (Below Operational Noise Floor) | 0.9264 | 0.9399 | 🟢 Within Nominal Historical Envelope |
| Gateway | Heap Growth Delta | `SND` | 4.7648 MB | 0.3889 MB | Suppressed (Below Operational Noise Floor) | -8.3753 MB | 5.1537 MB | 🟢 Within Nominal Historical Envelope |
| Gateway | Handle Leak Delta | `SND` | 0.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | 0.0000 | 0.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 11.2961 | 0.2619 | Suppressed (Below Operational Noise Floor) | 10.8734 | 11.5580 | 🟢 Within Nominal Historical Envelope |
| Gateway | GC p95 Pause | `SND` | 7.6046 | 0.7084 | Suppressed (Below Operational Noise Floor) | 6.8962 | 13.6200 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | -13.2724 MB | 0.3100 MB | Suppressed (Below Operational Noise Floor) | -13.5824 MB | 0.3965 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -2.0000 | -2.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 12.1454 | 0.1707 | Suppressed (Below Operational Noise Floor) | 11.9748 | 12.5958 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | GC p95 Pause | `SND` | 8.7594 | 1.1271 | Suppressed (Below Operational Noise Floor) | 7.6323 | 13.9521 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -5.7013 MB | 0.0016 MB | Suppressed (Below Operational Noise Floor) | -10.7793 MB | -5.6997 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | -1.0000 | 0.0000 | Suppressed (Below Operational Noise Floor) | -1.0000 | -1.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 5.4470 | 0.6830 | Suppressed (Below Operational Noise Floor) | 4.7622 | 6.1299 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 6.8311 | 0.5264 | Suppressed (Below Operational Noise Floor) | 6.3047 | 14.5396 | 🟢 Within Nominal Historical Envelope |

### Cross-Run (test)

- **Campaign Type:** test
- **Run Count:** 46
- **Categorical Stability Verdict:** 🟢 **Within Nominal Historical Envelope**
- **Overall Dispersion:** 5.65% 🟢 **Within Nominal Historical Envelope**

| Target | Metric | Type | Median | MAD | Dispersion (%) | Min | Max | Grade |
|---|---|---|---|---|---|---|---|---|
| global | p95 Latency | `rCV` | 23.5586 | 5.1907 | 10.38% | 10.2744 | 2514.6449 | 🟡 Minor Historical Deviation |
| global | WAL Amplification Ratio | `SND` | 0.0000 MB | 0.2984 | 14.92% | 0.1963 | 2.0451 | 🟡 Minor Historical Deviation |
| Gateway | Heap Growth Delta | `SND` | 1.5522 MB | 9.9437 MB | 19.89% | -14.2871 MB | 33.2536 MB | 🟡 Minor Historical Deviation |
| Gateway | Handle Leak Delta | `SND` | 0.0000 | 0.0000 | 0.00% | -1.0000 | 8.0000 | 🟢 Within Nominal Historical Envelope |
| Gateway | Average ELU | `rCV` | 11.7004 | 1.1534 | 7.69% | 9.1298 | 61.8466 | 🟢 Within Nominal Historical Envelope |
| Gateway | GC p95 Pause | `SND` | 9.7092 | 3.7991 | Suppressed (Below Operational Noise Floor) | 5.3785 | 42.5015 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Heap Growth Delta | `SND` | 0.0000 MB | 3.8813 MB | 7.76% | -16.8809 MB | 50.9905 MB | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Handle Leak Delta | `SND` | -2.0000 | 0.0000 | 0.00% | -2.0000 | 6.0000 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | Average ELU | `rCV` | 12.0601 | 1.4204 | 9.47% | 0.0000 | 99.8262 | 🟢 Within Nominal Historical Envelope |
| CoreAPI | GC p95 Pause | `SND` | 7.7997 | 2.4987 | Suppressed (Below Operational Noise Floor) | 0.0000 | 32.0358 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Heap Growth Delta | `SND` | -5.6898 MB | 0.5080 MB | 1.02% | -14.0406 MB | 27.6577 MB | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Handle Leak Delta | `SND` | -1.0000 | 0.0000 | 0.00% | -1.0000 | 4.0000 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | Average ELU | `rCV` | 5.2549 | 0.6151 | 4.10% | 0.3530 | 41.7265 | 🟢 Within Nominal Historical Envelope |
| ControlPlane | GC p95 Pause | `SND` | 10.5523 | 3.8252 | 3.83% | 5.3207 | 220.5195 | 🟢 Within Nominal Historical Envelope |

---
## 🔬 Methodology

1. **Metric Classification**:
   - **Class P (Semi-Stochastic Performance)**: Latency, ELU. Robust Coefficient of Variation (rCV) is calculated: $rCV = MAD / \max(|Median|, NoiseFloor)$.
   - **Class E (Nonstationary Environmental Drift)**: Heap Growth Delta, Handle Leak Delta, GC Pauses, WAL ratio. Scale-Normalized Dispersion (SND) is calculated relative to physical capacity envelopes: $SND = MAD / Tolerance$.
2. **Noise Floor Suppression**: Bypasses tiny fluctuations below empirical host scheduler and V8 allocator noise floors (e.g. Heap range < 15MB, Handle range <= 3, GC pauses < 50ms) to ensure SRE gating precision.
3. **Policy-Based Operational Grading**: Rather than implying formal inferential rigor, the consistency grades are policy-driven boundaries designed to guide SRE pipeline thresholds (Within Nominal Historical Envelope: $\le 10\%$ dispersion, Minor Historical Deviation: $\le 25\%$ dispersion, Moderate Historical Deviation: $\le 50\%$ dispersion).

---
*Operational Reliability Engineering (ORE) Bounded Humility Framework.*
