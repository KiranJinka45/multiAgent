# ZTAN Troubleshooting Knowledge Base (KB)

This document provides resolutions for common issues encountered by ZTAN operators.

## 1. Error Code Catalog

| Code | Meaning | Resolution |
| :--- | :--- | :--- |
| `ERR_ZTAN_001` | Merkle Proof Invalid | Verify network time synchronization (NTP). Run `ztanctl audit provenance`. |
| `ERR_ZTAN_002` | TPM Attestation Failed | Check if BIOS/UEFI has TPM 2.0 enabled. Run `ztanctl hardware status`. |
| `ERR_ZTAN_003` | Role Unauthorized | Current operator identity does not have sufficient claims. Check `roles/schemas.ts`. |
| `ERR_ZTAN_004` | Consensus Timeout | Insufficient witness nodes available. Check `ztanctl auto diagnose`. |
| `ERR_ZTAN_005` | PQC Signature Mismatch | Dilithium signature failed verification. Possible key corruption or tamper. |

## 2. Common Scenarios

### 2.1 "Command not found: ztanctl"
- **Cause**: Path not set or `pnpm link` missing.
- **Fix**: Run `npm install -g .` from the root directory or use `npx ztanctl`.

### 2.2 "Identity Manager: No active SVID"
- **Cause**: SPIFFE/SPIRE agent not running or hardware attestation expired.
- **Fix**: Run `ztanctl secure identity` to re-issue credentials.

### 2.3 "Registry: Pilot not found"
- **Cause**: Metadata mismatch in `.ztan/pilot-registry.json`.
- **Fix**: Run `ztanctl pilot list` to see valid IDs. Check file permissions.

## 3. Diagnostic Commands
- **Full Health Check**: `ztanctl auto diagnose`
- **Security Audit**: `ztanctl secure audit`
- **Performance Profile**: `ztanctl perf stats`
- **Hardware Status**: `ztanctl hardware status`

---
**Institutional Support Team** 🛠️
