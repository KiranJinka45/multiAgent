# Governance Economics Audit: Institutional Survivability (V1.0)

## 1. Economic Attack Surface Analysis

### 1.1 Coordinated Exit Attack
**Scenario**: Large stakeholders double-sign and immediately initiate unbonding.
**Mitigation**: 21-day unbonding period. Slashing logic covers assets in unbonding status if the breach occurred prior to initiation.

### 1.2 Governance Capture (51% Attack)
**Scenario**: A single entity acquires >51% of stake weight.
**Mitigation**: `ztanctl governance-risk` surfaces critical alerts. Soft limits trigger "Governance Slowdown" where high-weight roots require longer verification intervals.

### 1.3 Slashing Cascade
**Scenario**: A correlated breach causes mass slashing, dropping network weight below security minimums.
**Mitigation**: `modelGovernanceShock` allows operators to estimate safety buffers. Minimum total network stake requirement for global root convergence.

## 2. Institutional Legitimacy Metrics

### 2.1 Nakamoto Coefficient
Current implementation tracks the minimum number of federations required to control 51% of power. Target: >= 4.

### 2.2 Continuity Confidence
Composite score based on stake volatility and decentralization. Measures the probability of governance persistence under economic stress.

## 3. Resilience Testing Summary
- **51% Capture Simulation**: Verified detection of capture risk.
- **Mass Slashing Shock**: Verified stability score degradation.
- **Withdrawal Stress**: Verified cooldown enforcement under high churn.
