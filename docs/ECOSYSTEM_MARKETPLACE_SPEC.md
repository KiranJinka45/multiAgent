# ZTAN Ecosystem Marketplace Specification

This document defines the architecture and trust model for ZTAN's institutional marketplace and module extensibility system.

## 1. Trust Tiers
- **CONSTITUTIONAL**: Core platform modules developed by the ZTAN Root Authority. Full access to governance primitives.
- **CERTIFIED**: Third-party modules that have passed an audit by a ZTAN-recognized auditor (e.g., Nexus-Security). Capability-based access.
- **COMMUNITY**: Unverified modules. Strictly sandboxed with no access to sensitive primitives.

## 2. Sandboxed Execution
- All institutional modules are executed in a resource-constrained sandbox.
- **Memory/CPU Limits**: Enforced at the runtime level to prevent resource exhaustion attacks.
- **Capability Manifest**: Modules must explicitly declare required permissions (e.g., `audit-receipts`, `read-only-metrics`).

## 3. Cryptographic Verification
- **Sigstore Integration**: Modules must be signed using Sigstore/Cosign.
- **Transparency Logs**: Module installations and updates are recorded in the institutional transparency log.

## 4. Policy Packs
- Reusable templates for domain-specific governance (Financial, Healthcare, Government).
- Enables rapid deployment of compliant institutional cells.
