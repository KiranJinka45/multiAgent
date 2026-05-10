# Governance Incident Runbook

**Purpose**: To provide human operators with explicit procedures for responding to institutional governance failures.

## Incident Type 1: Persistent Quorum Stagnation
**Condition**: No governance decisions finalized for > 3 epochs.
**Operator Actions**:
1. Check `OperatorConsole` for "DEGRADED" alerts.
2. Verify network connectivity between witness nodes.
3. If stagnation persists due to institutional partition:
   - Initiate a "Manual Quorum Handshake" via secure side-channel.
   - If a quorum cannot be formed, the system remains in "GOVERNED_STAGNATION" until connectivity is restored.

## Incident Type 2: Replay Divergence Detected
**Condition**: `DIVERGENCE_ALERT` received from multiple nodes.
**Operator Actions**:
1. **Immediate Halt**: Suspend all automated execution for the affected project.
2. **Forensic Export**: Use `OperatorConsole` to export audit-ready evidence for the diverging epoch.
3. **Independent Replay**: Submit evidence to an air-gapped audit node for independent verification.
4. **Arbitration**: If Byzantine behavior is confirmed, execute `Institutional Revocation` via the `TrustRegistry`.

## Incident Type 3: Anti-Capture Violation (Equilibrium Drift)
**Condition**: `EquilibriumEngine` flags a "Coalition Concentration" alert.
**Operator Actions**:
1. Review the "Dependency Index" of the participating institutions.
2. Identify hidden operational alignments (e.g. same infra provider, same parent organization).
3. Rebalance weights or suspend the dominating institution until pluralism is restored.

## Emergency Powers
- **HALT**: Immediate suspension of all governance acts.
- **RESTORE**: Resume operations from the last known-good epoch.
- **FORCED_RECONCILIATION**: Manual intervention to resolve deadlocks (Requires 3/3 Super-Quorum).
