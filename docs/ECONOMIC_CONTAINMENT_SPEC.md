# Economic Containment Specification (V1.0)

## 1. Objective
Ensure institutional governance stability by proactively containing economic volatility that could lead to systemic collapse.

## 2. Containment Mechanisms

### 2.1 Slashing Throttling
- **Policy**: Maximum 10% of total network stake can be slashed in a single epoch.
- **Enforcement**: If multiple breaches are reported, slashing is prioritized by proof severity and capped by the epoch limit.
- **Rationale**: Prevents a coordinated "mass suicide" or false-positive flood from wiping out the network's trust weight.

### 2.2 Governance Slowdown
- **Policy**: Verification windows are extended proportionally to concentration risk.
- **Formula**: `Interval = BaseInterval * factor(ConcentrationRisk)`.
- **Rationale**: Gives honest participants more time to verify roots when a single entity has high capture potential.

## 3. Circuit Breakers

### 3.1 Slashing Cascade Breaker
- **Trigger**: >25% weight loss in one epoch.
- **Action**: All high-risk governance transitions are paused. Mandatory human/federated audit required to resume.

### 3.2 Withdrawal Surge Breaker
- **Trigger**: >30% of total stake initiates unbonding simultaneously.
- **Action**: Cooldown period is extended by an additional 14 days for all pending unbondings.

## 4. Constitutional Bounds
- Containment actions must be **Temporary** (max 24 hours without renewal).
- Every containment action must generate a **Stabilization Proof** for audit.
- Containment cannot be used to permanently lock out a legitimate federation.
