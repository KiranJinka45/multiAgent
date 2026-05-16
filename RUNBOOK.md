# Nexus ZTAN Institutional Runbook (Stewardship Era) 🏛️

This document provides the necessary protocols for managing the Nexus ZTAN platform during its post-finality stewardship era.

## 🚀 1. Provisioning Institutional Operators
Access is strictly governed to ensure institutional stability.

**Protocol:**
1. Collect tester email and full name.
2. Run the provisioning script:
   ```bash
   npx tsx scripts/provision-beta-user.ts <email> "<name>"
   ```
3. Verify the output displays a `tenantId` (format: `tnt_xxxxxxxx`).
4. Send the user the login link.

---

## 🛡️ 2. Abuse & Security
**Protocol for Malicious Activity:**
1. **Kill Switch**: If a tenant is identified as abusive, use the SRE Dashboard to set their status to `suspended`.
2. **Rate Limit Hardening**: Update `RATELIMIT_POINTS` environment variable to tighten global constraints.

---

## 📈 5. Operational SLIs (Service Level Indicators)
Monitor these metrics in the SRE dashboard to ensure system reliability:
- **Recovery Determinism**: Goal 100% successful OCR drills.
- **Stability Index**: Goal > 90% system stability.
- **Approval Quality**: Goal 0% rubber-stamp detection.
- **Freshness Score**: Goal > 90% runbook alignment.

---

## 🧪 6. Troubleshooting Worker Failures
If missions stay in `pending` or `running` forever:
1. Check BullMQ Dashboard (Redis).
2. Check `WatchdogService` logs in the API.
3. Restart workers if the heartbeat is stale.
