CREATE OR REPLACE FUNCTION ztan_enforce_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ZTAN Immutable Ledger Violation: Updates, replacements, or deletions on ZtanLedgerBlock are physically barred by protocol rules.';
END;
$$ LANGUAGE plpgsql;
