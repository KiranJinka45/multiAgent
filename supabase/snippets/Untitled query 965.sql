-- 1. Create the ZTAN Cryptographic Ledger Table
CREATE TABLE IF NOT EXISTS ztan_governance_ledger (
    sequence_id BIGSERIAL PRIMARY KEY,
    timestamp TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    type VARCHAR(50) NOT NULL,          -- e.g., 'GOVERNANCE', 'POLICY', 'TELEMETRY'
    payload TEXT NOT NULL,              -- Transaction logs/action details
    operator_id VARCHAR(100) NOT NULL,  -- Operator identity key/anchor
    signature TEXT NOT NULL,            -- Cryptographic signature
    prev_hash VARCHAR(64) NOT NULL,     -- Previous block hash (SHA-256 hex)
    hash VARCHAR(64) UNIQUE NOT NULL    -- Current block hash (SHA-256 hex)
);
-- 2. Create the Immutability Trigger Function
CREATE OR REPLACE FUNCTION block_ledger_mutation()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ZTAN Cryptographic Ledger is immutable. Mutation rejected.';
END;
$$ LANGUAGE plpgsql;
-- 3. Bind the Trigger to enforce ledger immutability
DROP TRIGGER IF EXISTS enforce_ledger_immutability ON ztan_governance_ledger;
CREATE TRIGGER enforce_ledger_immutability
BEFORE UPDATE OR DELETE ON ztan_governance_ledger
FOR EACH ROW EXECUTE FUNCTION block_ledger_mutation();
