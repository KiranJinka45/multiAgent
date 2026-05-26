-- ====================================================================================================
-- ZTAN MIGRATION: 004_privilege_minimization.sql
-- STRATUM: TIER P1.3 - PRIVILEGE MINIMIZATION
-- ====================================================================================================

-- 🛡️ Create restricted runtime role if not exists
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'ztan_runtime_user') THEN
        CREATE ROLE ztan_runtime_user WITH LOGIN PASSWORD 'ZtanSecureRuntimePass2026!';
    END IF;
END
$$;

-- 🛡️ Grant minimal transactional DML privileges on critical tables
GRANT SELECT, INSERT ON "ZtanLedgerBlock" TO ztan_runtime_user;
GRANT SELECT, INSERT, UPDATE ON "ZtanWalLog" TO ztan_runtime_user;
GRANT SELECT, INSERT, UPDATE ON "ZtanActiveLease" TO ztan_runtime_user;
GRANT SELECT, INSERT, UPDATE, DELETE ON "ZtanSnapshot" TO ztan_runtime_user;

-- 🛡️ Revoke dangerous DML mutations at the role level
REVOKE UPDATE, DELETE ON "ZtanLedgerBlock" FROM ztan_runtime_user;

-- 🛡️ Explicitly prevent direct trigger manipulation by runtime role
REVOKE ALL PRIVILEGES ON TRIGGER ON "ZtanLedgerBlock" FROM ztan_runtime_user;
REVOKE ALL PRIVILEGES ON TRIGGER ON "ZtanWalLog" FROM ztan_runtime_user;

-- 🛡️ Revoke public access to enforce strict role authority isolation
REVOKE ALL PRIVILEGES ON "ZtanLedgerBlock" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON "ZtanWalLog" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON "ZtanActiveLease" FROM PUBLIC;
REVOKE ALL PRIVILEGES ON "ZtanSnapshot" FROM PUBLIC;

COMMENT ON ROLE ztan_runtime_user IS 'Restricted ZTAN single-writer runtime agent role. Denied DDL manipulation and ledger deletions.';
