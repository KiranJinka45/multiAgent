-- 1. Append-Only Trigger Function
CREATE OR REPLACE FUNCTION prevent_update_delete()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'Append-only ledger violation: Updates and Deletions are strictly prohibited by Tier P0 Mechanical Trust constraints.';
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Attach to ZtanLedgerBlock
CREATE TRIGGER enforce_append_only_ledger_block
BEFORE UPDATE OR DELETE ON "ZtanLedgerBlock"
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

-- Attach to ZtanWalLog
CREATE TRIGGER enforce_append_only_wal_log
BEFORE UPDATE OR DELETE ON "ZtanWalLog"
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

-- Attach to governance_events
CREATE TRIGGER enforce_append_only_governance_events
BEFORE UPDATE OR DELETE ON "governance_events"
FOR EACH ROW EXECUTE FUNCTION prevent_update_delete();

-- 2. Actor Signature and Registered Key Verification Constraint
CREATE OR REPLACE FUNCTION validate_ledger_block_insertion()
RETURNS TRIGGER AS $$
BEGIN
    -- Ensure signature is present
    IF NEW.signature IS NULL OR trim(NEW.signature) = '' THEN
        RAISE EXCEPTION 'Mechanical Trust Violation: ZtanLedgerBlock insertion rejected. Missing signature.';
    END IF;

    -- Ensure the operator has a registered key
    IF NOT EXISTS (SELECT 1 FROM "ZtanRegisteredKey" WHERE "actorId" = NEW.operator) THEN
        RAISE EXCEPTION 'Mechanical Trust Violation: ZtanLedgerBlock insertion rejected. Operator % has no registered key in ZtanRegisteredKey.', NEW.operator;
    END IF;

    -- Enforce Global Quarantine Halt (Simulated via session setting)
    IF current_setting('ztan.quarantine_halt', TRUE) = 'TRUE' THEN
        RAISE EXCEPTION 'Mechanical Trust Violation: System is in Global Quarantine Halt. No ledger writes permitted.';
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Attach to ZtanLedgerBlock
CREATE TRIGGER enforce_ledger_block_insertion_rules
BEFORE INSERT ON "ZtanLedgerBlock"
FOR EACH ROW EXECUTE FUNCTION validate_ledger_block_insertion();
