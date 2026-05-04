# MultiAgent Operational Runbook (Beta v1.0) 📖

This document provides the necessary protocols for managing the MultiAgent platform during its Beta phase.

## 🚀 1. Provisioning New Users
Beta access is strictly invitation-only to ensure system stability.

**Protocol:**
1. Collect tester email and full name.
2. Run the provisioning script:
   ```bash
   npx tsx scripts/provision-beta-user.ts <email> "<name>"
   ```
3. Verify the output displays a `tenantId` (format: `tnt_xxxxxxxx`).
4. Send the user the login link.

---

## 💎 2. Commercial Tier Management
The platform supports three tiers: `Free`, `Pro`, and `Enterprise`.

**Changing a Tier manually:**
If a user needs more quota or an upgrade:
1. Identify their `tenantId` or `userId`.
2. Connect to the database and update the `Tenant` record:
   ```sql
   UPDATE "Tenant" SET "dailyQuota" = 100, "metadata" = jsonb_set("metadata", '{tier}', '"pro"') WHERE "id" = 'tnt_target_id';
   ```

---

## 🏥 3. Incident Response: Quota Exhaustion
If a user reports "Quota Exhausted" prematurely:
1. **Check Audit Logs**: Verify if missions were genuinely consumed or if there was a retry loop.
2. **Temporary Override**: Use the `TenantRateLimiter` override (see below) if the mission is critical.
3. **Reset Quota**: Quotas reset automatically at midnight UTC.

---

## 🛡️ 4. Abuse & Security
**Protocol for Malicious Activity:**
1. **Tier-Aware Rate Limiting**: The system automatically enforces API constraints based on the plan:
   - **Free**: 10 req/min
   - **Pro**: 100 req/min
   - **Enterprise**: 1000 req/min
2. **Kill Switch**: If a tenant is identified as abusive, use the `Commercial Cockpit` (Admin UI) to set their status to `suspended`.
3. **Rate Limit Hardening**: Update `RATELIMIT_POINTS` environment variable to tighten global constraints.

---

## 📈 5. Beta SLIs (Service Level Indicators)
Monitor these metrics in the Commercial Cockpit daily:
- **Mission Success Rate**: Goal > 95%.
- **Average Margin**: Goal > 20% (Value-based billing sanity check).
- **Enforcement Violation Rate**: Tracks if pricing tiers are too restrictive.

---

## 🧪 6. Troubleshooting Worker Failures
If missions stay in `pending` or `running` forever:
1. Check BullMQ Dashboard (Redis).
2. Check `WatchdogService` logs in the API.
3. Restart workers if the heartbeat is stale.
