# ZTAN Subtraction Registry

This registry tracks the removal of complexity from the ZTAN platform to ensure long-term "boringness" and survivability.

## 1. Removed Features

| Feature | Date Removed | Rationale |
| :--- | :--- | :--- |
| **Legacy Multi-Sig** | 2026-05-12 | Superseded by RFC 6962 Merkle lineages. |
| **Shadow Telemetry V1** | 2026-05-12 | Replaced by native OpenTelemetry (OTLP) integration. |
| **Raw TCP Gossiper** | 2026-05-12 | Simplified to TLS-only gRPC/Connect consensus. |

## 2. Deprecation Backlog (Subtraction Sprint Q3)

- **`dashboard-v1-legacy`**: To be pruned once Institutional Dashboard V2 reach 100% feature parity.
- **`experimental-p2p-mDNS`**: Redundant in regulated institutional environments.
- **`raw-json-receipts`**: All receipts must migrate to CBOR/Protobuf for deterministic hashing.

## 3. Complexity Gatekeeping
All new PRs must undergo a **Subtraction Audit**. For every 100 lines of code added, we aim to prune at least 10 lines of legacy or redundant code.

---
**Institutional Simplification Board** ✂️
