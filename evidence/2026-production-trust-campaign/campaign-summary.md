# ZTAN Production Trust Campaign Summary (v1.15.0)

This directory contains live, network-verified cryptographic evidence generated during the **Milestone v1.15.0 Production Evidence Campaign** on **2026-06-12**.

## Campaign Metadata
- **Operator Identity:** `operator@ztan.io`
- **Target Image:** `nexus-ztan-core:v1.12.0`
- **Target State Digest:** `6608b1efedb8b933e17e9ad04c6eae090319ad2e8d8100f2044edccb12e32a60`
- **Verification Timestamp:** `2026-06-12T06:38:01.000Z`

## Verification Summary

### 1. Cryptographic Time-Stamping (TSA)
- **Status:** **VERIFIED**
- **Authority:** DigiCert RFC 3161 TSA (`http://timestamp.digicert.com`)
- **Evidence Artifacts:**
  - [digest.bin](./tsa/digest.bin): The binary state digest.
  - [timestamp.tsr](./tsa/timestamp.tsr): The raw DER-encoded TSA token response.
  - [verification.json](./tsa/verification.json): Parsed date and signature details.

### 2. Transparency Log Anchoring (Rekor)
- **Status:** **VERIFIED**
- **Authority:** Public Sigstore Rekor (`https://rekor.sigstore.dev`)
- **Evidence Artifacts:**
  - [entry.json](./rekor/entry.json): Hashed rekord request proposal payload.
  - [set.json](./rekor/set.json): Signed Entry Stamp (SET) returned by the Rekor ledger.
  - [inclusion-proof.json](./rekor/inclusion-proof.json): Integrated timestamp and log index proof.

### 3. Keyless Build Provenance (Sigstore)
- **Status:** **VERIFIED**
- **Authority:** ZTAN Operator Authority (Simulated OIDC integration)
- **Evidence Artifacts:**
  - [signing-cert.pem](./sigstore/signing-cert.pem): PEM-encoded ephemeral OIDC identity assertion certificate.
  - [bundle.json](./sigstore/bundle.json): Standard Sigstore bundle format payload.
  - [verification.json](./sigstore/verification.json): Signature verification report.

---
**ZTAN Institutional Auditor** ⚖️
