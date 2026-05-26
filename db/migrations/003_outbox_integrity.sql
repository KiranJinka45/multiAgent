-- ====================================================================================================
-- ZTAN MIGRATION: 003_outbox_integrity.sql
-- STRATUM: TIER P0.1 - ROOT SOVEREIGNTY ENFORCEMENT
-- ====================================================================================================

-- 🛡️ FUNCTION: Verify Merkleized Hash Chaining & Cryptographic Attribution
CREATE OR REPLACE FUNCTION verify_ztan_ledger_integrity()
RETURNS TRIGGER AS $$
DECLARE
    latest_hash TEXT;
    block_count INTEGER;
BEGIN
    -- Count existing blocks to handle the genesis block boundary condition
    SELECT COUNT(*) INTO block_count FROM "ZtanLedgerBlock";

    -- Get the hash of the latest committed block
    IF block_count > 0 THEN
        SELECT "hash"
        INTO latest_hash
        FROM "ZtanLedgerBlock"
        ORDER BY "id" DESC
        LIMIT 1;

        -- 1. Enforce strict sequential hash chaining (Merkleized Lineage)
        IF NEW."prevHash" IS NULL OR NEW."prevHash" = '' THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. prevHash is missing on the incoming block envelope.';
        END IF;

        IF NEW."prevHash" != latest_hash THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Hash chain broken. Incoming block prevHash (%) does not match the latest block hash (%). Lineage verification failed.', NEW."prevHash", latest_hash;
        END IF;
    ELSE
        -- Genesis block constraint: prevHash must be the designated zero-hash anchor
        IF NEW."prevHash" != 'sha256:0000000000000000000000000000000000000000000000000000000000000000' THEN
            RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Genesis block prevHash must match the canonical zero-hash anchor.';
        END IF;
    END IF;

    -- 2. Enforce cryptographic signature presence (NIST P-256 base64 signed payload)
    IF NEW."signature" IS NULL OR NEW."signature" = '' THEN
        RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Cryptographic signature is missing on the incoming block envelope.';
    END IF;

    -- 3. Enforce operator identity attribution
    IF NEW."operator" IS NULL OR NEW."operator" = '' THEN
        RAISE EXCEPTION '[INTEGRITY_ERROR] Write rejected. Operator identity is missing on the incoming block envelope.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 🛡️ TRIGGER: Enforce Lineage & Attribution Integrity on ZtanLedgerBlock
DROP TRIGGER IF EXISTS enforce_ledger_integrity ON "ZtanLedgerBlock";
CREATE TRIGGER enforce_ledger_integrity
BEFORE INSERT ON "ZtanLedgerBlock"
FOR EACH ROW
EXECUTE FUNCTION verify_ztan_ledger_integrity();
