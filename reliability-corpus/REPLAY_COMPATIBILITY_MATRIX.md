# ZTAN Replay Compatibility Matrix & Migration Guide

This document defines the schema versioning, root manifest signing boundaries, replay compatibility matrix, and forensic migration documentation for ZTAN's frozen reliability corpus.

---

## 1. Corpus Integrity & Schema Versioning

To ensure that historical incident traces are not silently corrupted or modified over time, the reliability corpus enforces strict cryptographic immutability:

1.  **Schema Versioning**: The root `CORPUS_REGISTRY.json` enforces a top-level `"schemaVersion"` field. The current active version is `"1.0.0"`.
2.  **Manifest-Level Signature**: The entire `entries` dictionary in the registry is deterministically serialized (sorted by key), hashed using SHA-256, and signed using the platform authority's RSA private key. The signature is stored in the `"manifestSignature"` field.
3.  **Entry-Level Signatures**: Each individual incident or campaign entry contains SHA-256 hashes of its associated forensic files (`telemetry.json`, `verdict.json`, `operator-actions.md`). These hashes are concatenated and signed individually to verify file-level integrity.

---

## 2. Replay Compatibility Matrix

| Corpus Schema Version | ZTAN Orchestrator Version | Compatibility Status | Verification Requirements |
|---|---|---|---|
| **`1.0.0`** (Active) | `>= 1.0.0` (Hardened) | **Compatible** | Enforces root manifest signature check & telemetry HMAC chaining validation. |
| **`0.9.0`** (Legacy) | `< 1.0.0` (Legacy) | **Deprecated** | Lacks root manifest signing. Requires migration ceremony. |

---

## 3. Forensic Migration Runbook

When telemetry formats or database schemas undergo breaking changes, legacy incidents in the corpus must be migrated to preserve their utility for replay campaigns.

### Step 1: Upgrading Forensic Payload Schema
1.  Verify the integrity of the legacy corpus using the legacy checker.
2.  Run the automated migration script or manually update the JSON payload fields in each incident folder (`reliability-corpus/incident-<id>/telemetry.json`) to conform to the new database/telemetry structures.

### Step 2: Re-Computing Checksums & Indexing
1.  Run the indexing command to generate a new registry draft:
    ```bash
    npx tsx scripts/corpus-manager.ts --index-archaeology
    ```
2.  The indexing process automatically:
    - Generates new file-level SHA-256 hashes.
    - Deterministically serializes the new `entries` structure.
    - Signs the root entries manifest using the authority's RSA private key.
    - Writes the updated `manifestSignature` and `schemaVersion: "1.0.0"` fields.

### Step 3: Verifying the Upgraded Corpus
Run the verify script to assert cryptographic parity:
```bash
npx tsx scripts/corpus-manager.ts --verify
```
If the command outputs `🏁 Verification completed. X / X entries verified successfully.`, the migrated corpus is officially certified.
