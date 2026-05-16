# Operational Continuity Metrics (V1.0)

## 1. Governance Interpretation Consistency
- **Definition**: The degree of consensus between independent auditors regarding the legitimacy of a historical event.
- **Goal**: > 95%.
- **Metric**: Measured via `ztanctl soak metrics`.

## 2. Evidence Durability
- **Definition**: The % of historical evidence packs that successfully pass cryptographic replay after 90+ days.
- **Goal**: 100%.
- **Metric**: Measured via `ztanctl soak continuity`.

## 3. Policy Drift Velocity
- **Definition**: The rate at which operational settings deviate from the constitutional anchor.
- **Goal**: < 0.1% per quarter.
- **Metric**: Measured via `ztanctl soak drift`.

## 4. Trust Accumulation Rate
- **Definition**: The composite score of operational stability, continuity, and survivability over time.
- **Goal**: Linear growth with zero resets.
- **Metric**: Measured via `ztanctl soak status`.
