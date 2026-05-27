-- ====================================================================================================
-- ZTAN MIGRATION: 002_append_only_guards.sql
-- STRATUM: TIER P0.1 - ROOT SOVEREIGNTY ENFORCEMENT
-- ====================================================================================================

-- 🛡️ FUNCTION: Block Modifications on ZtanLedgerBlock (Strict Append-Only)
CREATE OR REPLACE FUNCTION protect_ztan_ledger_block()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION '[MUTATION_ERROR] Violates Append-Only Invariant. Updates and deletions are permanently blocked on ZtanLedgerBlock.';
END;
$$ LANGUAGE plpgsql;

-- 🛡️ FUNCTION: Protect WAL Logs (Block Deletions & Content Mutations)
CREATE OR REPLACE FUNCTION protect_ztan_wal_log()
RETURNS TRIGGER AS $$
BEGIN
    -- 1. Block all deletions completely to prevent history scrubbing
    IF TG_OP = 'DELETE' THEN
        RAISE EXCEPTION '[MUTATION_ERROR] Deletions are permanently blocked on % to preserve the Write-Ahead Log history.', TG_TABLE_NAME;
    END IF;

    -- 2. Restrict updates strictly to the 'status' transition column
    IF TG_OP = 'UPDATE' THEN
        IF OLD."seq" != NEW."seq" OR OLD."payload" != NEW."payload" OR OLD."type" != NEW."type" OR OLD."id" != NEW."id" THEN
            RAISE EXCEPTION '[MUTATION_ERROR] Updates to sequence, type, or payload are blocked on %. Only status transitions (PENDING -> COMMITTED) are permitted.', TG_TABLE_NAME;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ TRIGGER: Enforce Strict Immutability on ZtanLedgerBlock
DROP TRIGGER IF EXISTS enforce_ledger_block_append_only ON "ZtanLedgerBlock";
CREATE TRIGGER enforce_ledger_block_append_only
BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
FOR EACH ROW
EXECUTE FUNCTION protect_ztan_ledger_block();

-- 🛡️ TRIGGER: Enforce History Preservation on ZtanWalLog
DROP TRIGGER IF EXISTS enforce_wal_log_protection ON "ZtanWalLog";
CREATE TRIGGER enforce_wal_log_protection
BEFORE UPDATE OR DELETE ON "ZtanWalLog"
FOR EACH ROW
EXECUTE FUNCTION protect_ztan_wal_log();
