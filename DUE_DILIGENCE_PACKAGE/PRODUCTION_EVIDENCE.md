# ZTAN Production Evidence Artifacts

This document links to the live, network-verified cryptographic evidence artifacts compiled during the v1.15.0 trust campaign.

## Live Campaign Artifacts

All artifacts generated during the campaign are stored in:
`evidence/2026-production-trust-campaign/`

### 1. Cryptographic Time-Stamping (DigiCert TSA)
- **Status:** **VERIFIED**
- **Authority:** DigiCert RFC 3161 TSA
- **Verification Receipt:** [verification.json](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/tsa/verification.json)
- **Raw TSR Token:** [timestamp.tsr](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/tsa/timestamp.tsr)

### 2. Transparency Log Anchoring (Rekor Log)
- **Status:** **VERIFIED**
- **Authority:** Public Sigstore Rekor Log (`rekor.sigstore.dev`)
- **Signed Entry Stamp (SET):** [set.json](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/rekor/set.json)
- **Merkle Inclusion Proof:** [inclusion-proof.json](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/rekor/inclusion-proof.json)

### 3. Supply Chain Container Provenance (Sigstore)
- **Status:** **VERIFIED**
- **Signing Identity:** `operator@ztan.io`
- **Identity Certificate:** [signing-cert.pem](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/sigstore/signing-cert.pem)
- **Sigstore Bundle:** [bundle.json](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-production-trust-campaign/sigstore/bundle.json)

### 4. External Pilot Deployment Evidence
- **Status:** **PILOT VERIFIED**
- **K8s Namespace:** `ztan-pilot`
- **Deployment Report:** [pilot-deployment-report.json](file:///c:/multiagentic_project/multiAgent-main/evidence/2026-pilot-deployment/pilot-deployment-report.json)
