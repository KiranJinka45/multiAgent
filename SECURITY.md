# Security Policy

## 🛡️ Commitment to Security
Nexus ZTAN is committed to maintaining the highest standards of institutional security and cryptographic integrity. We recognize the critical role that external researchers and auditors play in the ZTAN ecosystem.

To prevent documentation drift and ensure that all security assertions are backed by machine-enforceable evidence, we adhere to a strict repository rule:

> [!IMPORTANT]
> **Authoritative Ledger Constraint**
> No claim may be added to:
> - `SECURITY.md`
> - `CONSTITUTION.md`
> - Website content
> - Investor decks
> - Sales collateral
>
> unless a corresponding entry exists in [CLAIMS_VERIFICATION.md](file:///c:/multiagentic_project/multiAgent-main/CLAIMS_VERIFICATION.md).

## 🚀 Vulnerability Disclosure Policy (VDP)

We welcome reports from the security community to help us improve the platform. If you discover a vulnerability, please report it to us following the guidelines below.

### Reporting a Vulnerability
- **Primary Channel**: Email security@ztan.institution (simulated).
- **Format**: Please include a detailed description, reproduction steps, and any proof-of-concept (PoC) artifacts.
- **PGP**: Use our public security key (ID: 0xZTAN_SEC_ROOT) for encrypted communication.

### Our Commitment
- **Acknowledgment**: We will acknowledge receipt of your report within 24 hours.
- **Triage**: We will provide an initial assessment within 3 business days.
- **Coordination**: We will work with you to understand and resolve the issue.
- **Safe Harbor**: Researchers who act in good faith and follow this policy will not be subject to legal action.

## 🚫 Scope
The following areas are of particular interest:
- **Governance Escape**: Circumventing Merkle-anchored governance constraints.
- **Identity Forgery**: Forging SPIFFE/SVID attestations (currently enforced via OIDC and mTLS at the gateway layer).
- **Consensus Divergence**: Triggering a non-deterministic state fork in the witness nodes.
- **Cryptographic Breaks**: Flaws in our PQC (ML-DSA-65/ML-KEM-768) implementation or TPM integration.

> [!NOTE]
> For the current implementation status, assurance classifications, and evidence verification boundaries of these areas, see the authoritative [Claims Verification Ledger (CLAIMS_VERIFICATION.md)](file:///c:/multiagentic_project/multiAgent-main/CLAIMS_VERIFICATION.md).


## 📜 Disclosure Process
ZTAN follows a **90-day coordinated disclosure** window. We will work with the reporter to release a security advisory and patched version before public disclosure.

---
**Institutional Security Board** 🛡️

