# ZTAN Frozen Surface Area Inventory
**Status:** MECHANICALLY ENFORCED

## Purpose
This document catalogs the exact architectural surfaces that are constitutionally frozen. Future maintainers must know which areas cannot be modified without formal governance approval.

## 1. Immutable State Topology
The core state machine (validated by TLA+) consists of exactly four rendering states:
1. `ACTIVE`
2. `READ_ONLY`
3. `REBUILDING`
4. `QUARANTINED`

*Exactly 6 permitted state transitions are codified in the transition graph.*

## 2. API Mutability Fencing
All REST endpoints must adhere strictly to one of four mutability classes:
* `OBSERVE` (No side effects, highly available)
* `CONTROLLED_MUTATION` (Requires `SRE_ADMIN` or `RECOVERY_OPERATOR`, blocked on mobile)
* `QUORUM_MUTATION` (Requires physical FIDO2/WebAuthn touch presence)
* `FORENSIC_EXPORT` (Read-only, immutable sequence ordering)

## 3. Telemetry and Transport Policy
* **Polling Budget:** Default 2.0s HTTP polling with adaptive exponential backoff. Maximum 5 concurrent requests.
* **Prohibited Tech:** Full-duplex WebSockets and runtime plugin loaders are permanently banned.

## 4. UI Governance and Role Boundaries
* **Cardinatity Limits:** Max 7 top-level alerts, Max 25 incident rows, Fixed dashboard depth.
* **No Optimistic UI:** All visual state transitions MUST block on authoritative PostgreSQL response.
