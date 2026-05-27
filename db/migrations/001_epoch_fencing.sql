-- ====================================================================================================
-- ZTAN MIGRATION: 001_epoch_fencing.sql
-- STRATUM: TIER P0.1 - ROOT SOVEREIGNTY ENFORCEMENT
-- ====================================================================================================

-- 🛡️ TABLE: ZtanActiveLease
CREATE TABLE IF NOT EXISTS "ZtanActiveLease" (
    "id" VARCHAR(50) PRIMARY KEY,
    "generation" INTEGER DEFAULT 0 NOT NULL,
    "owner_pid" INTEGER NOT NULL,
    "owner_host" VARCHAR(255) NOT NULL,
    "heartbeat" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP NOT NULL
);

-- 🛡️ INDEX FOR HEARTBEAT EXPIRATION
CREATE INDEX IF NOT EXISTS "idx_ztan_lease_heartbeat" ON "ZtanActiveLease"("heartbeat");

-- 🛡️ FUNCTION: Verify Epoch Fencing on Outbox/Block Insertion
CREATE OR REPLACE FUNCTION verify_ztan_epoch_fencing()
RETURNS TRIGGER AS $$
DECLARE
    active_lease_id VARCHAR(50);
    active_generation INTEGER;
    active_heartbeat TIMESTAMP WITH TIME ZONE;
    lease_timeout INTERVAL := INTERVAL '10 seconds'; -- Hard timeout threshold
BEGIN
    -- Query the active single-writer lease
    SELECT "id", "generation", "heartbeat"
    INTO active_lease_id, active_generation, active_heartbeat
    FROM "ZtanActiveLease"
    LIMIT 1;

    -- 1. Enforce that a lease must exist for any mutation
    IF active_lease_id IS NULL THEN
        RAISE EXCEPTION '[FENCING_ERROR] Write rejected. No active single-writer lease exists in ZtanActiveLease.';
    END IF;

    -- 2. Enforce lease freshness (GC pause / heartbeat split-brain protection)
    IF now() - active_heartbeat > lease_timeout THEN
        RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Active lease has expired. Lease Heartbeat: %, Current Time: %', active_heartbeat, now();
    END IF;

    -- 3. Enforce monotonic epoch alignment
    IF NEW."epoch"::INTEGER != active_generation THEN
        RAISE EXCEPTION '[FENCING_ERROR] Write rejected. Epoch mismatch. Block epoch (%) does not match active lease generation (%).', NEW."epoch", active_generation;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ TRIGGER: Enforce Fencing on ZtanLedgerBlock
DROP TRIGGER IF EXISTS enforce_ztan_epoch_fencing ON "ZtanLedgerBlock";
CREATE TRIGGER enforce_ztan_epoch_fencing
BEFORE INSERT ON "ZtanLedgerBlock"
FOR EACH ROW
EXECUTE FUNCTION verify_ztan_epoch_fencing();
