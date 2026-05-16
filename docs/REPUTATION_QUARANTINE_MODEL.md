# Reputation Quarantine Model (V1.0)

## 1. Staged Degradation
Trust should not be binary. The Reputation Quarantine Model uses **Staged Degradation** to provide federations with "Recovery Windows" before permanent isolation.

## 2. The Downgrade Sequence
1. **Warning**: Detection of minor drift. Reputation score reduced by 20%.
2. **Restricted**: Detection of replay inconsistency. Reputation score reduced by 50%. Inter-org governance integration suspended.
3. **Quarantine**: Detection of lineage breach. Reputation score set to 0. Full isolation from trust exchange.

## 3. Evidence Preservation
During quarantine, the degraded organization's **Historical Evidence** must be preserved. This ensures that if the organization recovers, its pre-incident trust history remains verifiable and can be re-anchored.

## 4. Federated Consistency
Quarantine decisions are shared across the network via **Quarantine Attestations**, allowing all peers to reach a consistent state regarding the degraded organization's trust status.
