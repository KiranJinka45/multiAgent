-- PostgreSQL Row-Level Security Enforcements

-- 1. Enable RLS on Core Tenant-bound Tables
ALTER TABLE "Tenant" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Project" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Mission" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Agent" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "ExecutionLog" ENABLE ROW LEVEL SECURITY;

-- 2. Create Isolation Policies (Expects application to SET app.current_tenant_id)
CREATE POLICY tenant_isolation_policy ON "Tenant"
    FOR ALL
    USING (id = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY user_isolation_policy ON "User"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY project_isolation_policy ON "Project"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY mission_isolation_policy ON "Mission"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY agent_isolation_policy ON "Agent"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));

CREATE POLICY execution_log_isolation_policy ON "ExecutionLog"
    FOR ALL
    USING ("tenantId" = current_setting('app.current_tenant_id', TRUE));
