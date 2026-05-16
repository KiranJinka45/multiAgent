# ZTAN Operational Trust Reporting

ZTAN converts raw execution telemetry into human-understandable evidence of institutional trust.

## Transparency Report V2

The standard for public auditability in the LTS era.

- **Uptime Metrics**: Verifiable availability beyond 99.999%.
- **Entropy Trends**: Measurement of architectural drift and complexity.
- **Lineage Proofs**: Cryptographic evidence of governance continuity.
- **Sustainability Score**: Long-term operational viability rating.

## Forensic Evidence Compression

Telemetry is deterministically compressed using the `OperationalEvidenceCompressor` to enable decadal storage without losing replayability.

- **Deterministic Reconstruction**: Every compressed bit can be expanded to reconstruct the exact state of the system during an incident.
- **Merkle Anchoring**: Compressed archives are anchored to the global governance root.

## Commands

- `ztanctl telemetry transparency-v2`: Generate the latest institutional report.
- `ztanctl telemetry compress`: Compact historical logs for archival storage.
