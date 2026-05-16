# Staked Institutional Governance Spec (v1.0)

## 1. Objective
Anchor institutional governance in direct economic consequence by requiring federations to lock liquid assets as collateral for their cryptographic attestations.

## 2. Institutional Staking Model
- **Minimum Stake**: Institutions must maintain a minimum stake of **10,000 ZTAN** (or equivalent) to initiate a Bridge Link.
- **Trust Weight**: A federation's influence on global root convergence is proportional to their total staked value.
- **Slashing Target**: In the event of a verified **Equivocation Proof**, 100% of the institution's stake is burned or redistributed.

## 3. Unbonding & Cooldown
To prevent "exit-scams" where an institution double-signs and immediately withdraws their assets:

- **Unbonding Period**: 21 days (Standard Pilot duration).
- **Frozen Status**: During unbonding, the federation's trust weight is frozen, and they cannot sign new governance roots.
- **Claim Window**: After 21 days, the assets can be claimed if no slashing proofs have been filed during the window.

## 4. Cryptographic Artifacts

### 4.1 StakeCertificate Schema
Every successful stake deposit generates a `StakeCertificate` used to prove institutional collateral during bridge handshakes.

```json
{
  "version": "1.0",
  "certificateId": "cert_uuid",
  "federationId": "fed_did",
  "amount": 50000,
  "timestamp": 1778476166,
  "weight": 50,
  "signature": "0x..."
}
```

### 4.2 UnbondingPolicy
1. **Initiation**: `ztanctl stake withdraw` moves stake from `ACTIVE` to `UNBONDING`.
2. **Cooldown**: A 21-day timer starts. `Weight` is immediately set to `0`.
3. **Maturity**: After the timer expires, `claim()` can be called to return assets to the institution's primary wallet.

## 5. Weighted Convergence Logic
When multiple roots are gossiped for a federation, the network converges on the root backed by the highest **Aggregated Stake Weight** from verifying peers.

---
*Status: Final V1.0 - ZTAN V3.0 Economic Layer*

## 6. Governance Concentration Policy
To maintain institutional legitimacy, the system monitors the following thresholds:
- **Concentration Risk**: The percentage of total weight held by a single entity.
- **Nakamoto Coefficient**: The minimum number of entities required to control 51% of governance power.

### Thresholds
- **Safe**: Nakamoto >= 4, Concentration < 25%.
- **Warning**: Nakamoto < 3, Concentration > 30%.
- **Critical**: Concentration >= 51%.

## 7. Slashing Reconstruction
In the event of a slashing incident, the system must allow for full cryptographic reconstruction of the state:
1. Proof of breach submission (RFC 6962 compliant).
2. Penalty calculation (Linear % based on proof type).
3. Weight recalculation.
4. Global settlement anchoring.

## 8. Institutional Restraint
Staking is restricted to **Governance Utility** only. The following are explicitly prohibited:
- Governance token yield-farming.
- Speculative liquidity incentives.
- Delegated staking (Proof-of-Authority only).
