# ZTAN Maintainer Succession & Stewardship Model

This document defines the formal institutional framework for ZTAN's long-term stewardship and the transition of authority from creators to the community.

## 1. Stewardship Roles
- **STEWARDS**: Institutional representatives responsible for constitutional protocol decisions. Holds release voting power.
- **MAINTAINERS**: Core contributors with merge authority over stable branches. Responsible for LTS backports.
- **CONTRIBUTORS**: Ecosystem participants contributing features and patches under the direction of maintainers.

## 2. Succession Election
- When a steward departs, a new steward is elected via a **Succession Vote** (Institutional Quorum).
- **Eligibility**: Institutions must have contributed significantly to the ZTAN ecosystem for at least 12 months.

## 3. Institutional Release Voting
- All major protocol releases and structural RFCs require a **60% Quorum** of active stewards.
- Votes are cryptographically signed and anchored in the Governance Merkle Tree for historical auditability.

## 4. Decadal LTS Channels
- ZTAN maintains **LTS Channels** with a minimum 10-year support horizon.
- Ensures institutional cells can operate on stable primitives without forced upgrades.

## 5. Constitutional RFC Process
- Every structural protocol change must be proposed via a formal **ZTAN RFC**.
- RFCs are evaluated for:
    - **Backwards Compatibility** (Long-term stability).
    - **Complexity Impact** (Maintenance survivability).
    - **Security Alignment**.
